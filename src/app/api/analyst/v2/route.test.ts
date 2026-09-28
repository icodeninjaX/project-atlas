import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-00000000000a" } as { id: string } | null,
  reservation: { status: "reserved", request_id: 7 } as Record<string, unknown>,
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
    rpc: state.rpc,
  }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: () => undefined,
}));

import { POST } from "./route";

const consent = {
  version: "2",
  providerProcessing: true,
  domains: ["money"],
  profiles: ["aggregate"],
  grantedAt: "2026-09-24T00:00:00.000Z",
};
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/analyst/v2", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  process.env.ATLAS_ANALYST_V2 = "1";
  process.env.OPENAI_API_KEY = "sk-synthetic";
  state.user = { id: "00000000-0000-4000-8000-00000000000a" };
  state.reservation = { status: "reserved", request_id: 7 };
  state.rpc.mockReset();
  state.rpc.mockImplementation(async (name: string) =>
    name === "reserve_ai_analyst_request_result"
      ? { data: state.reservation, error: null }
      : { data: null, error: null },
  );
});
afterEach(() => {
  delete process.env.ATLAS_ANALYST_V2;
});

describe("Analyst V2 route guards", () => {
  it("does not exist while the flag is off", async () => {
    delete process.env.ATLAS_ANALYST_V2;
    expect(
      (await post({ question: "How much did I spend this month?", consent }))
        .status,
    ).toBe(404);
  });

  it("requires sign-in", async () => {
    state.user = null;
    expect(
      (await post({ question: "How much did I spend this month?", consent }))
        .status,
    ).toBe(401);
  });

  it("requires current versioned consent before reserving quota", async () => {
    expect(
      (await post({ question: "How much did I spend this month?" })).status,
    ).toBe(400);
    expect(
      (
        await post({
          question: "How much did I spend this month?",
          consent: { ...consent, version: "1" },
        })
      ).status,
    ).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("rejects unknown models, extra fields and short messages without context", async () => {
    expect(
      (
        await post({
          question: "How much did I spend this month?",
          consent,
          model: "gpt-unknown",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post({
          question: "How much did I spend this month?",
          consent,
          owner: "someone",
        })
      ).status,
    ).toBe(400);
    expect((await post({ question: "Why?", consent })).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("reports a used-up allowance without running the analysis", async () => {
    state.reservation = { status: "daily_quota" };
    const response = await post({
      question: "How much did I spend this month?",
      consent,
    });
    expect(response.status).toBe(429);
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
});
