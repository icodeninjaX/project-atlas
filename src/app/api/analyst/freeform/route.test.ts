import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  plan: vi.fn(),
  answer: vi.fn(),
  from: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/analyst/planner/server", () => ({
  runAnalystQueryPlanner: mocks.plan,
}));
vi.mock("@/lib/analyst/freeform/answer", () => ({
  ANSWER_LIMITS: { evidenceItems: 12 },
  requestGroundedAnswer: mocks.answer,
}));

const question = "What needs attention in my finances?";
const request = (body: unknown) =>
  new Request("http://localhost/api/analyst/freeform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const valid = { question, dataSharingAcknowledged: true };
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
  const goalQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: "goal" }, error: null }),
  };
  goalQuery.select.mockReturnValue(goalQuery);
  goalQuery.eq.mockReturnValue(goalQuery);
  mocks.from.mockReturnValue(goalQuery);
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
