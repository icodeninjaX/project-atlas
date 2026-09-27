import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  plan: vi.fn(),
  answer: vi.fn(),
  from: vi.fn(),
  after: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/analyst/planner/server", () => ({
  runAnalystQueryPlanner: mocks.plan,
}));
vi.mock("@/lib/analyst/freeform/answer", () => ({
  ANSWER_LIMITS: { evidenceItems: 12 },
  requestGroundedAnswer: mocks.answer,
}));

const mentionRows: Record<string, unknown[]> = {
  goals: [],
  debts: [],
  tasks: [],
};
const question = "What needs attention in my finances?";
const request = (body: unknown) =>
  new Request("http://localhost/api/analyst/freeform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const valid = { question, dataSharingAcknowledged: true };
const streamRequest = (body: unknown) =>
  new Request("http://localhost/api/analyst/freeform", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify(body),
  });
async function readLines(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
const finishCalls = () =>
  mocks.rpc.mock.calls.filter(([name]) => name === "finish_ai_analyst_request");
const item = {
  id: "money.current",
  metric: "Recorded expenses",
  value: 10000,
  unit: "centavos",
  period: { from: "2026-09-01", through: "2026-09-24" },
  comparisonBasis: "Recorded transactions",
  source: {
    description: "Transactions",
    recordIds: [],
    href: "/money/transactions",
  },
  completeness: "complete",
  claimType: "FACT",
  provenance: {
    tool: "getMoneySummary",
    calculationVersion: "1",
    retrievedAt: "2026-09-24T00:00:00Z",
    textTrust: "untrusted_data",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner-a" } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({
    data: { status: "reserved", request_id: 7 },
    error: null,
  });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  });
  mentionRows.goals = [];
  mentionRows.debts = [];
  mentionRows.tasks = [];
  let table = "";
  const goalQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: "goal" }, error: null }),
    limit: vi.fn(async () => ({ data: mentionRows[table], error: null })),
    in: vi.fn(async () => ({ data: mentionRows[table] ?? [], error: null })),
  };
  goalQuery.select.mockReturnValue(goalQuery);
  goalQuery.eq.mockReturnValue(goalQuery);
  mocks.from.mockImplementation((name: string) => {
    table = name;
    return goalQuery;
  });
  mocks.plan.mockResolvedValue({
    status: "ready",
    calls: [],
    evidence: [item],
    limitations: [],
    metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
  });
  mocks.answer.mockResolvedValue({
    status: "answered",
    claims: [
      {
        kind: "interpretation",
        text: "This may warrant a closer look.",
        evidenceIds: [item.id],
      },
    ],
    inputTokens: 100,
    outputTokens: 30,
  });
});

describe("freeform Analyst route", () => {
  it("resolves a goal named in the question to its literal ID", async () => {
    const goalId = "3f0c2a4e-8b1d-4c6e-9a2f-1b3c5d7e9f00";
    mentionRows.goals = [
      { id: goalId, title: "Emergency Fund" },
      { id: "other", title: "Japan trip" },
    ];
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [{ tool: "getGoalLinkedActivity", input: { goalId } }],
      evidence: [
        {
          ...item,
          id: "goal-link",
          provenance: { ...item.provenance, tool: "getGoalLinkedActivity" },
        },
      ],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(
      request({
        question: "How is my emergency fund goal going this month?",
        dataSharingAcknowledged: true,
      }),
    );
    expect(mocks.plan).toHaveBeenCalledWith(
      `How is my emergency fund goal going this month? Selected goal ID: ${goalId}.`,
    );
    expect(await response.json()).toMatchObject({
      status: "answered",
      matchedEntity: { type: "goal", name: "Emergency Fund" },
    });
  });
  it("resolves a named debt for an extra monthly payment question", async () => {
    const debtId = "4a1d2c3b-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    mentionRows.debts = [{ id: debtId, creditor_name: "BPI Loan" }];
    await POST(
      request({
        question: "Put an extra monthly ₱500 toward my BPI Loan",
        dataSharingAcknowledged: true,
      }),
    );
    expect(mocks.plan).toHaveBeenCalledWith(
      expect.stringContaining(`Selected active debt ID: ${debtId}.`),
    );
  });
  it("forwards follow-up context to the planner and answer", async () => {
    const history = [
      { question: "How did my spending change?", answer: "It may help." },
      { question: "What about my income?", answer: "It could matter." },
    ];
    const response = await POST(request({ ...valid, history }));
    expect(response.status).toBe(200);
    expect(mocks.plan).toHaveBeenCalledWith(question, {
      previousQuestion: "What about my income?",
    });
    expect(mocks.answer).toHaveBeenCalledWith(question, [item], { history });
  });
  it("applies the scenario guard to a follow-up of a what-if", async () => {
    const response = await POST(
      request({
        question: "And if it falls by 30% instead?",
        dataSharingAcknowledged: true,
        history: [
          {
            question: "What if monthly income falls by 20%?",
            answer: "The calculated options may be worth reviewing.",
          },
        ],
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "missing_scenario_comparison",
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("rejects more than two earlier exchanges", async () => {
    const turn = { question: "How did my spending change?", answer: "x" };
    const response = await POST(
      request({ ...valid, history: [turn, turn, turn] }),
    );
    expect(response.status).toBe(400);
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("does not guess when two goals match the question", async () => {
    mentionRows.goals = [
      { id: "a", title: "Savings" },
      { id: "b", title: "savings" },
    ];
    await POST(
      request({
        question: "How are my savings doing lately?",
        dataSharingAcknowledged: true,
      }),
    );
    expect(mocks.plan).toHaveBeenCalledWith("How are my savings doing lately?");
  });

  it("requires the comparison tool for a financial what-if", async () => {
    const response = await POST(
      request({
        question: "What if monthly income falls by 20%?",
        dataSharingAcknowledged: true,
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "missing_scenario_comparison",
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("rejects a selected goal for a whole-finance scenario before quota", async () => {
    const response = await POST(
      request({
        question: "What if monthly income falls by 20%?",
        goalId: "11111111-1111-4111-8111-111111111111",
        dataSharingAcknowledged: true,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("states the one-time debt limitation without reserving quota", async () => {
    const response = await POST(
      request({
        question:
          "Compare a one-time ₱10,000 toward debt with keeping it as cash.",
        dataSharingAcknowledged: true,
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "unsupported",
      failureCode: "unsupported_one_time_debt_scenario",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("checks the selected debt belongs to the owner before quota", async () => {
    const missing = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    missing.select.mockReturnValue(missing);
    missing.eq.mockReturnValue(missing);
    mocks.from.mockReturnValueOnce(missing);
    const response = await POST(
      request({
        question: "What if I pay an extra 100 pesos monthly?",
        debtId: "11111111-1111-4111-8111-111111111111",
        dataSharingAcknowledged: true,
      }),
    );
    expect(response.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith("debts");
  });
  it("requires the selected debt in the calculated monthly option", async () => {
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [
        {
          tool: "compareFinancialScenarios",
          input: { alternatives: [{ extraDebtPayment: null }] },
        },
      ],
      evidence: [item],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(
      request({
        question: "What if I pay an extra 100 pesos monthly?",
        debtId: "11111111-1111-4111-8111-111111111111",
        dataSharingAcknowledged: true,
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "missing_selected_debt",
    });
    expect(mocks.plan.mock.calls[0]?.[0]).toContain(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("sends only calculated comparison evidence to the answer model", async () => {
    const question = "What if monthly income falls by 20%?";
    const scenario = {
      ...item,
      id: "scenario.current",
      metric: "Current · Monthly income",
      provenance: { ...item.provenance, tool: "compareFinancialScenarios" },
    };
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [{ tool: "compareFinancialScenarios" }],
      evidence: [item, scenario],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(
      request({ question, dataSharingAcknowledged: true }),
    );
    expect(response.status).toBe(200);
    expect(mocks.answer).toHaveBeenCalledWith(question, [scenario]);
  });
  it("requires the approved pattern tool before explaining an association", async () => {
    const response = await POST(
      request({
        question: "Did recorded expenses and task completions move together?",
        dataSharingAcknowledged: true,
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "missing_pattern_test",
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("rejects goal-specific pattern requests before consuming Analyst quota", async () => {
    const response = await POST(
      request({
        question: "Did recorded expenses and task completions move together?",
        goalId: "11111111-1111-4111-8111-111111111111",
        dataSharingAcknowledged: true,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("withholds a selected-goal answer if the planner uses whole-domain pattern evidence", async () => {
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [{ tool: "getPatternAssociation" }],
      evidence: [item],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(
      request({
        question: "What shifted around this goal?",
        goalId: "11111111-1111-4111-8111-111111111111",
        dataSharingAcknowledged: true,
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "unsupported_goal_pattern",
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("limits an association explanation to a qualified pattern citation", async () => {
    const patternQuestion =
      "Did my expenses and task completions rise together?";
    const pattern = {
      ...item,
      id: "pattern.expenses.tasks",
      metric: "Recorded expenses and task completions association",
      value: 0.96,
      unit: "correlation",
      provenance: { ...item.provenance, tool: "getPatternAssociation" },
    };
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [{ tool: "getPatternAssociation" }],
      evidence: [item, pattern],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(
      request({
        question: patternQuestion,
        dataSharingAcknowledged: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.answer).toHaveBeenCalledWith(patternQuestion, [pattern]);
  });
  it("requires identity and consent before reservation or planning", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(request(valid))).status).toBe(401);
    expect((await POST(request({ question }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("reserves the existing allowance before planning and audits a grounded answer", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "answered",
      evidence: [item],
      claims: [{ evidenceIds: [item.id] }],
    });
    expect(mocks.rpc.mock.calls[0]).toEqual([
      "reserve_ai_analyst_request_result",
      { p_type: "freeform", p_model: "gpt-4o-mini-2024-07-18" },
    ]);
    expect(mocks.rpc.mock.calls[1]).toEqual([
      "finish_ai_analyst_request",
      {
        p_id: 7,
        p_outcome: "success",
        p_input_tokens: 190,
        p_output_tokens: 50,
      },
    ]);
  });
  it("does not plan after a quota or migration rejection", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { status: "hourly_quota" },
      error: null,
    });
    expect((await POST(request(valid))).status).toBe(429);
    mocks.rpc.mockResolvedValueOnce({
      data: { status: "invalid_type" },
      error: null,
    });
    expect((await POST(request(valid))).status).toBe(503);
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("shows deterministic evidence when a tool or answer fails", async () => {
    mocks.plan.mockResolvedValueOnce({
      status: "partial",
      calls: [],
      evidence: [item],
      limitations: ["Missing source"],
      metadata: {},
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "fallback",
      evidence: [item],
      limitations: ["Missing source"],
    });
    expect(mocks.answer).not.toHaveBeenCalled();
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "invalid_response",
      inputTokens: 10,
      outputTokens: 5,
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "fallback",
      evidence: [item],
    });
    expect(mocks.rpc.mock.calls.at(-1)?.[1].p_outcome).toBe("invalid_response");
    expect(mocks.rpc.mock.calls.at(-1)?.[1]).toMatchObject({
      p_input_tokens: 100,
      p_output_tokens: 25,
    });
  });
  it("adds task titles to focus evidence without sending them to the model", async () => {
    const focus = {
      ...item,
      id: "getTaskFocus.tasks.focus.1.abc",
      metric: "Suggested focus task 1",
      value: "high",
      unit: "priority",
      source: { description: "Tasks", recordIds: ["task-1"], href: "/tasks" },
      claimType: "RECOMMENDATION",
      provenance: { ...item.provenance, tool: "getTaskFocus" },
    };
    mentionRows.tasks = [
      {
        id: "task-1",
        title: "File BIR return",
        due_at: null,
        scheduled_for: "2026-09-29",
      },
    ];
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [],
      evidence: [focus],
      limitations: [],
      metadata: {},
    });
    const body = await (await POST(request(valid))).json();
    expect(body.labels).toEqual({
      [focus.id]: { title: "File BIR return", date: "2026-09-29" },
    });
    expect(JSON.stringify(mocks.answer.mock.calls)).not.toContain(
      "File BIR return",
    );
  });
  it("explains complete facts when another tool finds no records", async () => {
    const reviews = {
      ...item,
      id: "reviews.overall_score",
      completeness: "partial",
      provenance: { ...item.provenance, tool: "getReviewSummary" },
    };
    const ready = {
      tool: "getMoneySummary",
      status: "ready",
      result: { evidence: [item] },
    };
    const empty = {
      tool: "getReviewSummary",
      status: "partial",
      result: { evidence: [reviews] },
    };
    mocks.plan.mockResolvedValueOnce({
      status: "partial",
      calls: [ready, empty],
      evidence: [item, reviews],
      limitations: ["Few completed reviews"],
      missingCapabilities: [],
      metadata: {},
    });
    const body = await (await POST(request(valid))).json();
    expect(body).toMatchObject({
      status: "answered",
      evidence: [item, reviews],
    });
    expect(body.limitations).toEqual([
      "Few completed reviews",
      expect.stringContaining("uses only the complete facts"),
    ]);
    expect(mocks.answer.mock.calls[0]![1]).toEqual([item]);

    // A capability the question needs but ATLAS lacks still falls back.
    mocks.plan.mockResolvedValueOnce({
      status: "partial",
      calls: [ready],
      evidence: [item],
      limitations: ["Credit scores are not tracked"],
      missingCapabilities: ["Credit scores are not tracked"],
      metadata: {},
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "fallback",
      failureCode: "insufficient_evidence",
    });
    expect(mocks.answer).toHaveBeenCalledTimes(1);
  });
  it("returns clarification without tool evidence or answer generation", async () => {
    mocks.plan.mockResolvedValueOnce({
      status: "clarification_required",
      clarification: "Which goal?",
      metadata: {},
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "clarification_required",
      message: "Which goal?",
      evidence: [],
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("resolves a selected goal before quota use and requires goal-specific retrieval", async () => {
    const goalId = "11111111-1111-4111-8111-111111111111";
    const body = { ...valid, goalId };
    const query = mocks.from();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(request(body))).status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const response = await POST(request(body));
    expect(await response.json()).toMatchObject({
      status: "fallback",
      failureCode: "missing_goal_context",
    });
    expect(mocks.plan).toHaveBeenCalledWith(
      `${question} Selected goal ID: ${goalId}.`,
    );
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner-a");
    expect(query.eq).toHaveBeenCalledWith("id", goalId);
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("explains selected-goal evidence without mixing whole-domain totals into its claim", async () => {
    const goalId = "11111111-1111-4111-8111-111111111111";
    const goalFact = {
      ...item,
      id: "goal.activity",
      provenance: { ...item.provenance, tool: "getGoalLinkedActivity" },
    };
    const historyFact = {
      ...item,
      id: "history.total",
      provenance: { ...item.provenance, tool: "getCrossDomainHistory" },
    };
    mocks.plan.mockResolvedValueOnce({
      status: "ready",
      calls: [
        { tool: "getGoalLinkedActivity" },
        { tool: "getCrossDomainHistory" },
      ],
      evidence: [goalFact, historyFact],
      limitations: [],
      metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
    });
    const response = await POST(request({ ...valid, goalId }));
    expect(response.status).toBe(200);
    expect(mocks.answer).toHaveBeenCalledWith(question, [goalFact]);
    expect(await response.json()).toMatchObject({
      status: "answered",
      evidence: [goalFact, historyFact],
    });
  });
});

describe("freeform Analyst model choice", () => {
  it("explains with the chosen exact model and records it on the quota", async () => {
    const response = await POST(request({ ...valid, model: "gpt-6-sol" }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      "reserve_ai_analyst_request_result",
      { p_type: "freeform", p_model: "gpt-6-sol" },
    );
    expect(mocks.answer).toHaveBeenCalledWith(question, [item], {
      model: "gpt-6-sol",
    });
    expect(await response.json()).toMatchObject({
      status: "answered",
      model: { id: "gpt-6-sol", label: "GPT-6 Sol" },
    });
  });
  it("rejects an alias or unknown model before quota", async () => {
    for (const model of ["gpt-4o-mini", "gpt-6-astra", "unknown"]) {
      const response = await POST(request({ ...valid, model }));
      expect(response.status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("falls back to GPT-4o mini when a large-pool model is used up", async () => {
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "pool_exhausted",
    });
    const body = await (
      await POST(request({ ...valid, model: "gpt-5.4-2026-03-05" }))
    ).json();
    expect(mocks.answer).toHaveBeenNthCalledWith(1, question, [item], {
      model: "gpt-5.4-2026-03-05",
    });
    expect(mocks.answer).toHaveBeenNthCalledWith(2, question, [item]);
    expect(body).toMatchObject({
      status: "answered",
      model: { id: "gpt-4o-mini-2024-07-18", label: "GPT-4o mini" },
    });
    expect(body.limitations.join(" ")).toMatch(
      /GPT-5\.4's free daily allowance is used up, so GPT-4o mini wrote/,
    );
  });
  it("shows facts only when the small pool is used up", async () => {
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "pool_exhausted",
    });
    const body = await (await POST(request(valid))).json();
    expect(mocks.answer).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      status: "fallback",
      failureCode: "pool_exhausted",
      message: expect.stringMatching(/free daily AI allowance is used up/),
    });
    expect(finishCalls()[0]![1]).toMatchObject({ p_outcome: "pool_exhausted" });
    mocks.plan.mockResolvedValueOnce({
      status: "error",
      error: {
        code: "pool_exhausted",
        message: "ATLAS's free daily AI allowance is used up.",
      },
      metadata: { inputTokens: 0, outputTokens: 0 },
    });
    await POST(request(valid));
    expect(finishCalls()[1]![1]).toMatchObject({ p_outcome: "pool_exhausted" });
  });
});

describe("freeform Analyst progress stream", () => {
  it("streams stages in order and ends with the JSON result", async () => {
    mocks.plan.mockImplementationOnce(async (_question, options) => {
      options.onStage({ type: "stage", stage: "understanding" });
      options.onStage({
        type: "stage",
        stage: "reading",
        domains: ["spending"],
      });
      return {
        status: "ready",
        calls: [{ tool: "getMoneySummary", input: { kind: "expense" } }],
        evidence: [item],
        limitations: [],
        metadata: { planner: { inputTokens: 90, outputTokens: 20 } },
      };
    });
    mocks.answer.mockImplementationOnce(
      async (_question, _evidence, options) => {
        options.onStage({ type: "stage", stage: "writing" });
        options.onStage({ type: "stage", stage: "checking" });
        options.onStage({ type: "stage", stage: "repairing" });
        return {
          status: "answered",
          claims: [
            {
              kind: "interpretation",
              text: "This may warrant a closer look.",
              evidenceIds: [item.id],
            },
          ],
          inputTokens: 100,
          outputTokens: 30,
        };
      },
    );
    const response = await POST(streamRequest(valid));
    expect(response.headers.get("content-type")).toContain(
      "application/x-ndjson",
    );
    const lines = await readLines(response);
    expect(lines.slice(0, -1)).toEqual([
      { type: "stage", stage: "understanding" },
      { type: "stage", stage: "reading", domains: ["spending"] },
      { type: "stage", stage: "writing" },
      { type: "stage", stage: "checking" },
      { type: "stage", stage: "repairing" },
    ]);
    expect(lines.at(-1)).toMatchObject({
      type: "result",
      status: 200,
      body: {
        status: "answered",
        evidence: [item],
        suggestions: expect.arrayContaining([
          "How does this compare to last month?",
        ]),
      },
    });
    expect(finishCalls()).toHaveLength(1);
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
  it("keeps the plain JSON response and call shape without the stream header", async () => {
    const response = await POST(request(valid));
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(mocks.plan).toHaveBeenCalledWith(question);
    expect(mocks.answer).toHaveBeenCalledWith(question, [item]);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ status: "answered" });
  });
  it("returns validation errors as JSON to a streaming caller", async () => {
    const response = await POST(streamRequest({ question }));
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("finishes the quota once when the client leaves mid-stream", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mocks.answer.mockImplementationOnce(
      async (_question, _evidence, options) => {
        options.onStage({ type: "stage", stage: "writing" });
        await gate;
        options.onStage({ type: "stage", stage: "checking" });
        return {
          status: "answered",
          claims: [
            {
              kind: "interpretation",
              text: "This may warrant a closer look.",
              evidenceIds: [item.id],
            },
          ],
          inputTokens: 100,
          outputTokens: 30,
        };
      },
    );
    const response = await POST(streamRequest(valid));
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('"writing"');
    await reader.cancel();
    expect(finishCalls()).toHaveLength(0);
    release();
    // The run continues under after() and records its real outcome once.
    await mocks.after.mock.calls[0]![0];
    expect(finishCalls()).toEqual([
      [
        "finish_ai_analyst_request",
        {
          p_id: 7,
          p_outcome: "success",
          p_input_tokens: 190,
          p_output_tokens: 50,
        },
      ],
    ]);
  });
  it("finishes the quota once when the run fails mid-stream", async () => {
    mocks.answer.mockRejectedValueOnce(new Error("network"));
    const lines = await readLines(await POST(streamRequest(valid)));
    expect(lines.at(-1)).toMatchObject({
      type: "result",
      status: 503,
      body: { status: "fallback", failureCode: "retrieval_error" },
    });
    expect(finishCalls()).toHaveLength(1);
  });
});
