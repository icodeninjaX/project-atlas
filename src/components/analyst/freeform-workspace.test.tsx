import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { FreeformWorkspace, SUGGESTED_QUESTIONS } from "./freeform-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const box = () =>
  screen.getByRole("textbox", { name: "Ask about your ATLAS records" });
const consent = () =>
  screen.getByRole("button", { name: "Allow data sharing" });
const ask = () => screen.getByRole("button", { name: "Ask Analyst" });

const fact = {
  id: "money.current",
  metric: "Recorded expenses",
  value: 12345,
  unit: "centavos",
  period: { from: "2026-09-01", through: "2026-09-24" },
  comparisonBasis: "Recorded transactions",
  completeness: "complete",
  source: {
    description: "Transactions",
    recordIds: [],
    href: "/money/transactions",
  },
  claimType: "FACT",
  provenance: {
    tool: "getMoneySummary",
    calculationVersion: "1",
    retrievedAt: "2026-09-24T00:00:00Z",
    textTrust: "untrusted_data",
  },
};
const answered = (text: string, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: "answered",
      claims: [
        {
          kind: "observation",
          text,
          evidenceIds: [fact.id],
          comparison: null,
        },
      ],
      evidence: [fact],
      limitations: [],
      ...extra,
    }),
    { status: 200 },
  );

describe("Analyst conversation", () => {
  it("asks for consent once and remembers it for the user", async () => {
    const user = userEvent.setup();
    const first = render(<FreeformWorkspace userId="owner-a" />);
    await user.type(box(), "How did my spending change?");
    expect(ask()).toBeDisabled();
    await user.click(consent());
    expect(ask()).toBeEnabled();
    expect(window.localStorage.getItem("atlas:analyst-consent:owner-a")).toBe(
      "granted",
    );
    first.unmount();

    render(<FreeformWorkspace userId="owner-a" />);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Allow data sharing" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Data sharing on/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(consent()).toBeVisible();
    expect(
      window.localStorage.getItem("atlas:analyst-consent:owner-a"),
    ).toBeNull();
  });

  it("sends a suggested question straight through the verified flow", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("atlas:analyst-consent:owner-a", "granted");
    const fetch = vi
      .fn()
      .mockResolvedValue(answered("Recorded expenses were ₱123.45."));
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Allow data sharing" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    );
    expect(await screen.findByText(/Recorded expenses were/)).toBeVisible();
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      question: SUGGESTED_QUESTIONS[0],
      dataSharingAcknowledged: true,
    });
    expect(
      screen.getByRole("list", { name: "Conversation" }),
    ).toHaveTextContent(SUGGESTED_QUESTIONS[0]);
  });

  it("keeps a thread and sends earlier answers with a follow-up", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () =>
        answered("The recorded expenses may be worth a look."),
      )
      .mockImplementationOnce(async () =>
        answered("July expenses may also be worth a look."),
      );
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "How did my spending change?{Enter}");
    await screen.findByText("The recorded expenses may be worth a look.");
    expect(box()).toHaveValue("");
    await user.type(box(), "What about the month before?");
    await user.click(ask());
    await screen.findByText("July expenses may also be worth a look.");
    // Both answers stay visible as one conversation.
    expect(
      screen.getByText("The recorded expenses may be worth a look."),
    ).toBeVisible();
    expect(JSON.parse(fetch.mock.calls[1]![1].body).history).toEqual([
      {
        question: "How did my spending change?",
        answer: "The recorded expenses may be worth a look.",
      },
    ]);
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByRole("list", { name: "Conversation" })).toBeNull();
    expect(
      screen.getByRole("button", { name: SUGGESTED_QUESTIONS[0] }),
    ).toBeVisible();
  });

  it("hides peso figures under privacy mode and shows a matched goal", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("atlas:privacy-mode:owner-a", "hidden");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          answered(
            "Recorded expenses were ₱1,234.50, PHP 99.00 and 12.50 pesos this month.",
            { matchedEntity: { type: "goal", name: "Emergency Fund" } },
          ),
        ),
    );
    render(
      <PrivacyProvider userId="owner-a">
        <FreeformWorkspace userId="owner-a" />
      </PrivacyProvider>,
    );
    await user.click(consent());
    await user.type(box(), "How is my emergency fund goal?{Enter}");
    const claim = await screen.findByText(/Recorded expenses were/);
    expect(claim).not.toHaveTextContent("1,234.50");
    expect(claim).not.toHaveTextContent("99.00");
    expect(claim).not.toHaveTextContent("12.50");
    expect(screen.getByText("Using your goal “Emergency Fund”.")).toBeVisible();
  });

  it("shows a scenario comparison with a link to its assumptions", async () => {
    const user = userEvent.setup();
    const evidence = ["Current", "Option 1", "Option 2"].map(
      (label, index) => ({
        ...fact,
        id: `scenario.${index}`,
        metric: `${label} · Runway estimate`,
        value: 6 - index,
        unit: "months",
        comparisonBasis: `${label}: stated assumptions`,
        source: { description: "Runway", recordIds: [], href: "/money/runway" },
        claimType: index === 0 ? "FACT" : "SCENARIO",
        provenance: { ...fact.provenance, tool: "compareFinancialScenarios" },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fallback",
            message: "Calculated comparison available.",
            evidence,
            limitations: [],
          }),
          { status: 200 },
        ),
      ),
    );
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What if monthly income falls by 20%?{Enter}");
    const comparison = await screen.findByLabelText(
      "Runway scenario comparison",
    );
    expect(comparison).toHaveTextContent("Current: stated assumptions");
    expect(comparison).toHaveTextContent("Option 2: stated assumptions");
    expect(
      screen.getByRole("link", { name: "Review or edit runway assumptions" }),
    ).toHaveAttribute("href", "/money/runway");
  });

  it("sends a focused goal or debt and shows the focus on the question", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockImplementation(async () => answered("Noted."));
    vi.stubGlobal("fetch", fetch);
    render(
      <FreeformWorkspace
        userId="owner-a"
        goals={[{ id: "goal-1", title: "Emergency Fund" }]}
        debts={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            creditor_name: "Test debt",
          },
        ]}
      />,
    );
    await user.click(consent());
    await user.selectOptions(
      screen.getByLabelText("Focus on a goal or debt"),
      "debt:11111111-1111-4111-8111-111111111111",
    );
    expect(screen.getByText("Focus: Test debt")).toBeVisible();
    expect(box()).toHaveAttribute("maxLength", "400");
    await user.type(box(), "What if I pay ₱500 extra monthly?{Enter}");
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({
      debtId: "11111111-1111-4111-8111-111111111111",
    });
    // The asked question keeps its focus label; the composer chip clears.
    expect(
      screen.getByRole("list", { name: "Conversation" }),
    ).toHaveTextContent("Focus: Test debt");
    await user.click(screen.getByRole("button", { name: "Clear focus" }));
    expect(screen.queryByRole("button", { name: "Clear focus" })).toBeNull();
  });

  it("opens the cited source from a citation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          answered("This may warrant a closer look at recorded expenses."),
        ),
    );
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What needs attention in my finances?{Enter}");
    await screen.findByText(/warrant a closer look/);
    const sources = screen
      .getByText(/Sources · 1 ATLAS fact ·/)
      .closest("details")!;
    expect(sources).not.toHaveAttribute("open");
    await user.click(screen.getByRole("link", { name: "Recorded expenses" }));
    expect(sources).toHaveAttribute("open");
    expect(
      screen.getByRole("link", { name: "View ATLAS records" }),
    ).toHaveAttribute("href", "/money/transactions");
  });

  it("shows facts first and collapses notes when no explanation is available", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fallback",
            message: "Review the available facts below.",
            evidence: [fact],
            limitations: ["Task titles are not sent.", "Scores are rounded."],
          }),
          { status: 200 },
        ),
      ),
    );
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What should I focus on this week?{Enter}");
    expect(
      await screen.findByText("Review the available facts below."),
    ).toBeVisible();
    expect(screen.getByText("ATLAS facts only")).toBeVisible();
    expect(screen.queryByText("Checked")).toBeNull();
    // Sources start open; the notes stay collapsed.
    expect(
      screen.getByText(/Sources · 1 ATLAS fact/).closest("details"),
    ).toHaveAttribute("open");
    const notes = screen.getByText("2 notes on these facts").closest("details");
    expect(notes).not.toHaveAttribute("open");
    await user.click(screen.getByText("2 notes on these facts"));
    expect(notes).toHaveAttribute("open");
  });

  it("shows a request error inside the conversation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Your Analyst usage limit has been reached.",
          }),
          { status: 429 },
        ),
      ),
    );
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What needs attention in my finances?{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your Analyst usage limit has been reached.",
    );
  });
});
