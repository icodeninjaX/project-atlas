import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { IntelligenceWorkspace } from "./intelligence-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const userId = "00000000-0000-4000-8000-00000000000a";

const presentation = (text: string) => ({
  language: "en",
  status: "answered",
  statusLabel: "Answered",
  direct: [{ id: "c1", kind: "fact", text, recommendation: null }],
  findings: [],
  options: [
    {
      id: "c2",
      kind: "recommendation",
      text: "If dining matters most, consider reviewing dining transactions first.",
      recommendation: {
        tradeoff: "Groceries rose by the same amount and waits.",
        constraints: [],
        nextAction: { label: "Open transactions", href: "/money/transactions" },
        conditional: true,
      },
    },
  ],
  limitations: ["Spending you did not record in ATLAS is not included."],
  unresolved: [],
  verification: {
    figures: "2 of 2 statements passed figure, date and scope checks.",
    review: "Interpretations were also reviewed for meaning.",
    freshness: null,
  },
  sources: [{ href: "/money/transactions" }],
  shortened: null,
});

function stream(lines: unknown[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines)
        controller.enqueue(
          new TextEncoder().encode(`${JSON.stringify(line)}\n`),
        );
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

function answer(text: string, context: string) {
  return {
    type: "result",
    status: 200,
    body: {
      version: "2",
      status: "answered",
      presentation: presentation(text),
      candidates: [],
      suggestions: [
        {
          text: "What about last month?",
          reason: "period",
          capability: "money.totals",
          referential: true,
        },
      ],
      models: {
        planner: { requested: "deterministic", resolved: "deterministic" },
        writer: {
          requested: "gpt-4o-mini-2024-07-18",
          resolved: "gpt-4o-mini-2024-07-18",
        },
        reviewer: null,
        fallback: false,
      },
      context,
      contextNotice: null,
    },
  };
}

function setup(digest: unknown = { digest: null, reason: "nothing_to_show" }) {
  const requests: Array<Record<string, unknown>> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/analyst/pools") return Response.json({ pools: null });
      if (url === "/api/analyst/digest") return Response.json(digest);
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      return stream([
        { type: "stage", stage: "understanding" },
        { type: "stage", stage: "reading", round: 1, domains: ["money"] },
        answer(
          `Answer ${requests.length}: recorded expenses were ₱11,000.00.`,
          `token-${requests.length}`,
        ),
      ]);
    }),
  );
  render(
    <PrivacyProvider userId={userId}>
      <IntelligenceWorkspace userId={userId} />
    </PrivacyProvider>,
  );
  return requests;
}

describe("IntelligenceWorkspace", () => {
  it("asks for per-area consent before any question", async () => {
    const user = userEvent.setup();
    setup();
    expect(
      screen.queryByRole("textbox", { name: "Ask Analyst" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Decisions" }));
    expect(screen.getByText(/never sends private notes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Allow these areas" }));
    const stored = JSON.parse(
      window.localStorage.getItem(`atlas:analyst-consent-v2:${userId}`)!,
    );
    expect(stored).toMatchObject({ version: "2", profiles: ["aggregate"] });
    expect(stored.domains).not.toContain("decisions");
    expect(
      screen.getByRole("textbox", { name: "Ask Analyst" }),
    ).toBeInTheDocument();
  });

  it("offers names and notes only on a private provider route", async () => {
    const user = userEvent.setup();
    setup();
    expect(
      screen.queryByRole("checkbox", { name: /Names/ }),
    ).not.toBeInTheDocument();
    cleanup();
    render(
      <PrivacyProvider userId={userId}>
        <IntelligenceWorkspace userId={userId} privateRoute />
      </PrivacyProvider>,
    );
    await user.click(screen.getByRole("checkbox", { name: /Names/ }));
    expect(
      screen.getByText(/may send record names and titles/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/shares traffic with OpenAI/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Allow these areas" }));
    const stored = JSON.parse(
      window.localStorage.getItem(`atlas:analyst-consent-v2:${userId}`)!,
    );
    expect(stored.profiles).toEqual(["aggregate", "basic_context"]);
  });

  it("sends consent, model and context, and renders the checked answer", async () => {
    const user = userEvent.setup();
    const requests = setup();
    await user.click(screen.getByRole("button", { name: "Allow these areas" }));
    await user.type(
      screen.getByRole("textbox", { name: "Ask Analyst" }),
      "How much did I spend this month?",
    );
    await user.click(screen.getByRole("button", { name: "Ask" }));
    await screen.findByText(/Answer 1: recorded expenses/);
    expect(requests[0]).toMatchObject({
      question: "How much did I spend this month?",
      context: null,
      model: "gpt-4o-mini-2024-07-18",
    });
    expect(requests[0]!.consent).toMatchObject({ version: "2" });
    // Limits, the recommendation's trade-off and next step stay visible.
    expect(
      screen.getByText("Spending you did not record in ATLAS is not included."),
    ).toBeInTheDocument();
    expect(screen.getByText(/waits/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open transactions" }),
    ).toHaveAttribute("href", "/money/transactions");
    expect(screen.getByText("Written by GPT-4o mini.")).toBeInTheDocument();
    // A suggestion continues the same conversation with its context.
    await user.click(
      screen.getByRole("button", { name: "What about last month?" }),
    );
    await screen.findByText(/Answer 2/);
    expect(requests[1]).toMatchObject({
      question: "What about last month?",
      context: "token-1",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Ask Analyst" }),
      ).toHaveFocus(),
    );
  });

  it("hides figures in answers and limitations in privacy mode", async () => {
    window.localStorage.setItem(`atlas:privacy-mode:${userId}`, "hidden");
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Allow these areas" }));
    await user.type(
      screen.getByRole("textbox", { name: "Ask Analyst" }),
      "How much did I spend this month?{Enter}",
    );
    await screen.findByText(/Answer 1: recorded expenses/);
    expect(screen.queryByText(/₱11,000\.00/)).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Hidden sensitive value").length,
    ).toBeGreaterThan(0);
  });

  it("drops the context on a new conversation and when sharing stops", async () => {
    const user = userEvent.setup();
    const requests = setup();
    await user.click(screen.getByRole("button", { name: "Allow these areas" }));
    await user.type(
      screen.getByRole("textbox", { name: "Ask Analyst" }),
      "How much did I spend this month?{Enter}",
    );
    await screen.findByText(/Answer 1/);
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByText(/Answer 1/)).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Ask Analyst" }),
      "How much did I spend last month?{Enter}",
    );
    await screen.findByText(/Answer 2/);
    expect(requests[1]!.context).toBeNull();
    await user.click(screen.getByRole("button", { name: "Stop sharing" }));
    expect(
      screen.getByRole("button", { name: "Allow these areas" }),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem(`atlas:analyst-consent-v2:${userId}`),
    ).toBeNull();
  });
});

describe("the month's summary", () => {
  const consent = {
    version: "2",
    providerProcessing: true,
    domains: ["money"],
    profiles: ["aggregate"],
    grantedAt: "2026-09-24T00:00:00.000Z",
  };
  const summary = {
    digest: {
      ...answer(
        "Recorded spending is ₱1,900.00 above the same days of August.",
        "unused",
      ).body,
      context: undefined,
    },
    day: "2026-09-24",
    cached: true,
  };

  it("opens the page with the summary, and asks about it in a conversation", async () => {
    window.localStorage.setItem(
      `atlas:analyst-consent-v2:${userId}`,
      JSON.stringify(consent),
    );
    const user = userEvent.setup();
    const requests = setup(summary);
    expect(
      await screen.findByRole("heading", { name: "This month so far" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/above the same days of August/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ask about this" }));
    await screen.findByText(/Answer 1/);
    expect(requests.at(-1)).toMatchObject({
      question: "Why did my spending change this month?",
      context: null,
    });
    // The conversation takes the summary's place.
    expect(
      screen.queryByRole("heading", { name: "This month so far" }),
    ).not.toBeInTheDocument();
  });

  it("sends the consent it was granted, and shows nothing without a summary", async () => {
    window.localStorage.setItem(
      `atlas:analyst-consent-v2:${userId}`,
      JSON.stringify(consent),
    );
    setup();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/analyst/digest",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const call = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => url === "/api/analyst/digest")!;
    expect(JSON.parse(String(call[1]!.body)).consent).toEqual(consent);
    expect(
      screen.queryByRole("heading", { name: "This month so far" }),
    ).not.toBeInTheDocument();
  });

  it("asks for nothing before consent", async () => {
    setup(summary);
    await screen.findByRole("button", { name: "Allow these areas" });
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => url === "/api/analyst/digest"),
    ).toBe(false);
  });
});
