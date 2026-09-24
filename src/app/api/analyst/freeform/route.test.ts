import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  plan: vi.fn(),
  answer: vi.fn(),
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
});
