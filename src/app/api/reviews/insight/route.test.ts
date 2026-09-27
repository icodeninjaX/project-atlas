import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  gather: vi.fn(),
  answer: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
const rows: {
  // Successive reads of last week's row.
  stored: Array<Record<string, unknown> | null>;
  preference: Record<string, unknown> | null;
} = { stored: [], preference: null };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/reviews/insight", () => ({
  WEEKLY_INSIGHT_QUESTIONS: {
    current: "What changed this week?",
    previous: "What changed last week?",
  },
  gatherWeeklyInsightEvidence: mocks.gather,
  previousWeekWindows: () => ({
    current: { from: "2026-09-14", through: "2026-09-20" },
    previous: { from: "2026-09-07", through: "2026-09-13" },
  }),
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
  rows.stored = [];
  rows.preference = null;
  mocks.insert.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({
    eq: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
  });
  mocks.remove.mockReturnValue({
    eq: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
  });
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data:
          table === "weekly_insights"
            ? (rows.stored.shift() ?? null)
            : rows.preference,
        error: null,
      }),
      insert: mocks.insert,
      update: mocks.update,
      delete: mocks.remove,
    };
    return query;
  });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
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
    expect(mocks.insert).not.toHaveBeenCalled();
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

  it("returns last week's stored insight without quota or a model call", async () => {
    rows.stored = [
      {
        status: "answered",
        claims: [{ kind: "observation", text: "stored" }],
        evidence: [item],
        limitations: [],
        created_at: new Date().toISOString(),
      },
    ];
    const response = await POST(request({ mode: "previous" }));
    expect(await response.json()).toMatchObject({
      status: "answered",
      stored: true,
      weekStart: "2026-09-14",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("needs the opt-in or explicit consent before claiming last week", async () => {
    expect((await POST(request({ mode: "previous" }))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("claims last week before quota, then completes the claim", async () => {
    rows.preference = { weekly_insight_auto: true };
    const response = await POST(request({ mode: "previous" }));
    expect(await response.json()).toMatchObject({
      status: "answered",
      weekStart: "2026-09-14",
    });
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: "owner-a",
      week_start: "2026-09-14",
      status: "pending",
    });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.rpc.mock.invocationCallOrder[0]!,
    );
    expect(mocks.gather).toHaveBeenCalledWith(
      expect.any(Date),
      undefined,
      "previous",
    );
    expect(mocks.answer).toHaveBeenCalledWith("What changed last week?", [
      item,
    ]);
    expect(mocks.update).toHaveBeenCalledWith({
      status: "answered",
      claims: [{ kind: "observation", text: "x", evidenceIds: [item.id] }],
      evidence: [item],
      limitations: ["Compared through today."],
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not prepare twice when another request already claimed the week", async () => {
    rows.preference = { weekly_insight_auto: true };
    mocks.insert.mockResolvedValueOnce({ error: { code: "23505" } });
    rows.stored = [
      null,
      {
        status: "pending",
        claims: [],
        evidence: [],
        limitations: [],
        created_at: new Date().toISOString(),
      },
    ];
    expect(
      await (await POST(request({ mode: "previous" }))).json(),
    ).toMatchObject({
      status: "fallback",
      failureCode: "in_progress",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.gather).not.toHaveBeenCalled();
  });
  it("releases the claim when quota is exhausted so a later visit can retry", async () => {
    rows.preference = { weekly_insight_auto: true };
    mocks.rpc.mockResolvedValueOnce({
      data: { status: "daily_quota" },
      error: null,
    });
    expect((await POST(request({ mode: "previous" }))).status).toBe(429);
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.gather).not.toHaveBeenCalled();
  });
  it("completes an incomplete week as insufficient", async () => {
    rows.preference = { weekly_insight_auto: true };
    mocks.gather.mockResolvedValueOnce({
      evidence: [item],
      limitations: [],
      complete: false,
    });
    await POST(request({ mode: "previous" }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "insufficient", claims: [] }),
    );
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("records a provider attempt as final for the week", async () => {
    rows.preference = { weekly_insight_auto: true };
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "invalid_response",
    });
    await POST(request({ mode: "previous" }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("keeps the week open when the free daily pool refuses the request", async () => {
    rows.preference = { weekly_insight_auto: true };
    mocks.answer.mockResolvedValueOnce({
      status: "error",
      code: "pool_exhausted",
    });
    expect(
      await (await POST(request({ mode: "previous" }))).json(),
    ).toMatchObject({
      status: "fallback",
      failureCode: "pool_exhausted",
      message: expect.stringMatching(/resets at 8:00 AM/),
    });
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "finish_ai_analyst_request",
      expect.objectContaining({ p_outcome: "pool_exhausted" }),
    );
  });
  it("shows an abandoned claim as not prepared instead of retrying", async () => {
    rows.stored = [
      {
        status: "pending",
        claims: [],
        evidence: [],
        limitations: [],
        created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    ];
    expect(
      await (await POST(request({ mode: "previous" }))).json(),
    ).toMatchObject({
      status: "fallback",
      failureCode: "not_prepared",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
