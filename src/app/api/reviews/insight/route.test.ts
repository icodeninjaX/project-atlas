import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  gather: vi.fn(),
  answer: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/reviews/insight", () => ({
  WEEKLY_INSIGHT_QUESTION: "What changed this week?",
  gatherWeeklyInsightEvidence: mocks.gather,
}));
vi.mock("@/lib/analyst/freeform/answer", () => ({
  ANSWER_LIMITS: { evidenceItems: 16 },
  requestGroundedAnswer: mocks.answer,
}));

const request = (body: unknown) =>
  new Request("http://localhost/api/reviews/insight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const valid = { dataSharingAcknowledged: true };
const item = { id: "expense_centavos.2026-09-21", metric: "Recorded expenses" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner-a" } },
    error: null,
  });
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "reserve_ai_analyst_request_result"
      ? { data: { status: "reserved", request_id: 9 }, error: null }
      : { data: true, error: null },
  );
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  });
  mocks.gather.mockResolvedValue({
    evidence: [item],
    limitations: ["Compared through today."],
    complete: true,
  });
  mocks.answer.mockResolvedValue({
    status: "answered",
    claims: [{ kind: "observation", text: "x", evidenceIds: [item.id] }],
    inputTokens: 120,
    outputTokens: 40,
  });
});

describe("weekly insight route", () => {
  it("requires sign-in and explicit data-sharing consent before quota use", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(request(valid))).status).toBe(401);
    expect((await POST(request({}))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.gather).not.toHaveBeenCalled();
  });
  it("answers the fixed weekly question and audits the shared allowance", async () => {
    const response = await POST(request(valid));
    expect(await response.json()).toMatchObject({
      status: "answered",
      evidence: [item],
      limitations: ["Compared through today."],
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "reserve_ai_analyst_request_result",
      expect.objectContaining({ p_type: "freeform" }),
    );
    expect(mocks.answer).toHaveBeenCalledWith("What changed this week?", [
      item,
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("finish_ai_analyst_request", {
      p_id: 9,
      p_outcome: "success",
      p_input_tokens: 120,
      p_output_tokens: 40,
    });
  });
  it("shows facts without an AI answer when weekly evidence is incomplete", async () => {
    mocks.gather.mockResolvedValueOnce({
      evidence: [item],
      limitations: [],
      complete: false,
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "fallback",
      failureCode: "insufficient_evidence",
      evidence: [item],
    });
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("returns quota exhaustion without gathering evidence", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { status: "daily_quota" },
      error: null,
    });
    expect((await POST(request(valid))).status).toBe(429);
    expect(mocks.gather).not.toHaveBeenCalled();
  });
  it("falls back to verified facts when the answer is rejected", async () => {
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "invalid_response",
      inputTokens: 100,
      outputTokens: 30,
    });
    expect(await (await POST(request(valid))).json()).toMatchObject({
      status: "fallback",
      failureCode: "invalid_response",
      evidence: [item],
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "finish_ai_analyst_request",
      expect.objectContaining({ p_outcome: "invalid_response" }),
    );
  });
});
