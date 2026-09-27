import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

  it("keeps the original question when answering a clarification", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              status: "clarification_required",
              message: "Which period should ATLAS compare?",
              evidence: [],
              limitations: [],
            }),
            { status: 200 },
          ),
      )
      .mockImplementationOnce(async () => answered("Noted."));
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "How did my spending change?{Enter}");
    await screen.findByText("Which period should ATLAS compare?");
    await user.type(box(), "Last month please{Enter}");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetch.mock.calls[1]![1].body).history).toEqual([
      {
        question: "How did my spending change?",
        answer: "Which period should ATLAS compare?",
      },
    ]);
  });

  it("blocks a question that is too long for the chosen focus", async () => {
    const user = userEvent.setup();
    render(
      <FreeformWorkspace
        userId="owner-a"
        goals={[{ id: "goal-1", title: "Emergency Fund" }]}
      />,
    );
    await user.click(consent());
    await user.click(box());
    await user.paste("x".repeat(450));
    expect(ask()).toBeEnabled();
    await user.selectOptions(
      screen.getByLabelText("Focus on a goal or debt"),
      "goal:goal-1",
    );
    expect(ask()).toBeDisabled();
    expect(screen.getByText(/can be up to 400 characters/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear focus" }));
    expect(ask()).toBeEnabled();
  });

  it("names focus tasks with the owner's titles and readable dates", async () => {
    const user = userEvent.setup();
    const focusId = "getTaskFocus.tasks.focus.1.abc";
    const focusItem = {
      ...fact,
      id: focusId,
      metric: "Suggested focus task 1",
      value: "high",
      unit: "priority",
      source: {
        description: "Tasks",
        recordIds: ["task-1"],
        href: "/tasks?highlight=task-1",
      },
      claimType: "RECOMMENDATION",
      provenance: { ...fact.provenance, tool: "getTaskFocus" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "answered",
            claims: [
              {
                kind: "suggestion",
                text: "Suggested focus task 1 is due first as of 2026-09-27.",
                evidenceIds: [focusId],
                comparison: null,
              },
            ],
            evidence: [focusItem],
            limitations: [],
            labels: {
              [focusId]: { title: "File BIR return", date: "2026-09-29" },
            },
          }),
          { status: 200 },
        ),
      ),
    );
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What should I focus on this week?{Enter}");
    expect(
      await screen.findByText(
        "“File BIR return” is due first as of Sep 27, 2026.",
      ),
    ).toBeVisible();
    const list = screen.getByLabelText("This week's focus");
    expect(list).toHaveTextContent("File BIR return");
    expect(list).toHaveTextContent("high priority · Sep 29, 2026");
    expect(
      screen.getAllByRole("link", { name: /File BIR return/ })[0],
    ).toHaveAttribute("href", "/tasks?highlight=task-1");
    expect(screen.queryByText(/Suggested focus task/)).toBeNull();
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

  it("shows live stages as they stream and advances through them", async () => {
    const user = userEvent.setup();
    let push!: (event: unknown) => void;
    let end!: () => void;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        push = (event) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        end = () => controller.close();
      },
    });
    const fetch = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "What should I focus on this week?{Enter}");
    expect(fetch.mock.calls[0]![1].headers.Accept).toContain(
      "application/x-ndjson",
    );
    const progress = await screen.findByRole("list", {
      name: "Analyst progress",
    });
    expect(screen.getByRole("status")).toContainElement(progress);
    const active = () =>
      progress.querySelector('[data-state="active"]')?.textContent;
    expect(active()).toContain("Understanding your question");
    push({ type: "stage", stage: "understanding" });
    push({ type: "stage", stage: "reading", domains: ["tasks", "signals"] });
    await waitFor(() =>
      expect(active()).toContain("Reading tasks and signals"),
    );
    expect(
      progress.querySelector('[data-state="done"]')?.textContent,
    ).toContain("Understanding your question");
    push({ type: "stage", stage: "writing" });
    push({ type: "stage", stage: "checking" });
    await waitFor(() => expect(active()).toContain("Checking every figure"));
    push({ type: "stage", stage: "repairing" });
    await waitFor(() =>
      expect(active()).toContain("Correcting an answer that failed checks"),
    );
    // A late checking event after the repair never rewinds the list.
    push({ type: "stage", stage: "checking" });
    push({
      type: "result",
      status: 200,
      body: {
        status: "answered",
        claims: [
          {
            kind: "observation",
            text: "Recorded expenses may be worth a look.",
            evidenceIds: [fact.id],
            comparison: null,
          },
        ],
        evidence: [fact],
        limitations: [],
      },
    });
    end();
    expect(
      await screen.findByText("Recorded expenses may be worth a look."),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Analyst progress" })).toBeNull();
  });

  it("asks a follow-up chip with history and hides chips on older turns", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () =>
        answered("The recorded expenses may be worth a look.", {
          suggestions: [
            "How does this compare to last month?",
            "How did my spending change?",
            "How has my spending changed over the last six months?",
          ],
        }),
      )
      .mockImplementationOnce(async () =>
        answered("August expenses may also be worth a look.", {
          suggestions: ["What needs my attention across money and goals?"],
        }),
      );
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "How did my spending change?{Enter}");
    const chips = await screen.findByRole("group", {
      name: "Suggested follow-ups",
    });
    // The question just asked is never offered again.
    expect(
      within(chips)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "How does this compare to last month?",
      "How has my spending changed over the last six months?",
    ]);
    await user.click(
      within(chips).getByRole("button", {
        name: "How does this compare to last month?",
      }),
    );
    await screen.findByText("August expenses may also be worth a look.");
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({
      question: "How does this compare to last month?",
      history: [
        {
          question: "How did my spending change?",
          answer: "The recorded expenses may be worth a look.",
        },
      ],
      dataSharingAcknowledged: true,
    });
    // Only the latest turn keeps its chips.
    const groups = screen.getAllByRole("group", {
      name: "Suggested follow-ups",
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveTextContent(
      "What needs my attention across money and goals?",
    );
    expect(
      screen.queryByRole("button", {
        name: "How has my spending changed over the last six months?",
      }),
    ).toBeNull();
  });

  it("keeps a fallback turn as context for its follow-up chip", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              status: "fallback",
              message: "An AI explanation is unavailable.",
              evidence: [fact],
              limitations: [],
              suggestions: ["How does this compare to last month?"],
            }),
          ),
      )
      .mockImplementationOnce(async () => answered("It may be similar."));
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace userId="owner-a" />);
    await user.click(consent());
    await user.type(box(), "How did my spending change?{Enter}");
    await user.click(
      await screen.findByRole("button", {
        name: "How does this compare to last month?",
      }),
    );
    await screen.findByText("It may be similar.");
    expect(JSON.parse(fetch.mock.calls[1]![1].body).history).toEqual([
      {
        question: "How did my spending change?",
        answer: "An AI explanation is unavailable.",
      },
    ]);
  });

  it("asks a follow-up chip without an inherited goal or debt focus", async () => {
    const user = userEvent.setup();
    const debtId = "11111111-1111-4111-8111-111111111111";
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () =>
        answered("The options may be worth reviewing.", {
          suggestions: ["What does my current runway look like?"],
        }),
      )
      .mockImplementationOnce(async () => answered("Runway noted."));
    vi.stubGlobal("fetch", fetch);
    render(
      <FreeformWorkspace
        userId="owner-a"
        debts={[{ id: debtId, creditor_name: "Test debt" }]}
      />,
    );
    await user.click(consent());
    await user.selectOptions(
      screen.getByLabelText("Focus on a goal or debt"),
      `debt:${debtId}`,
    );
    await user.type(box(), "What if I pay ₱500 extra monthly?{Enter}");
    await user.click(
      await screen.findByRole("button", {
        name: "What does my current runway look like?",
      }),
    );
    await screen.findByText("Runway noted.");
    const sent = JSON.parse(fetch.mock.calls[1]![1].body);
    expect(sent).not.toHaveProperty("debtId");
    expect(sent).not.toHaveProperty("goalId");
    expect(screen.queryByRole("button", { name: "Clear focus" })).toBeNull();
  });
});
