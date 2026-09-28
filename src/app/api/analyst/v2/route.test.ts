import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-00000000000a" } as { id: string } | null,
  reservation: { status: "reserved", request_id: 7 } as Record<string, unknown>,
  rpc: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@/lib/analyst/intelligence/run", () => ({
  runAnalystV2: state.run,
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
  state.run.mockReset();
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

const usage = (inputTokens: number, outputTokens: number) => ({
  inputTokens,
  outputTokens,
  providerCalls: 1,
});
const finishes = () =>
  state.rpc.mock.calls.filter(([name]) => name === "finish_ai_analyst_request");

describe("Analyst V2 quota settlement (AI-07)", () => {
  const ask = { question: "How much did I spend this month?", consent };

  it("finishes the reserved request once, with the run's tokens", async () => {
    state.run.mockResolvedValue({
      version: "2",
      status: "answered",
      outcome: "success",
      usage: usage(1_600, 400),
    });
    const response = await post(ask);
    expect(response.status).toBe(200);
    const body = await response.json();
    // Quota bookkeeping never reaches the browser.
    expect(body).not.toHaveProperty("usage");
    expect(body).not.toHaveProperty("outcome");
    expect(finishes()).toEqual([
      [
        "finish_ai_analyst_request",
        {
          p_id: 7,
          p_outcome: "success",
          p_input_tokens: 1_600,
          p_output_tokens: 400,
        },
      ],
    ]);
  });

  it("settles the tokens a run was charged even when it throws", async () => {
    state.run.mockImplementation(
      async (
        _input: unknown,
        deps: { onLedger?: (ledger: unknown) => void },
      ) => {
        deps.onLedger?.({ usage: usage(900, 1_200) });
        throw new Error("synthetic failure after a provider call");
      },
    );
    const response = await post(ask);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Analysis could not be completed. Try again.",
    });
    expect(finishes()).toEqual([
      [
        "finish_ai_analyst_request",
        {
          p_id: 7,
          p_outcome: "provider_error",
          p_input_tokens: 900,
          p_output_tokens: 1_200,
        },
      ],
    ]);
  });

  it("records no tokens for a run that failed before any provider call", async () => {
    state.run.mockRejectedValue(new Error("synthetic early failure"));
    await post(ask);
    expect(finishes()).toEqual([
      [
        "finish_ai_analyst_request",
        {
          p_id: 7,
          p_outcome: "provider_error",
          p_input_tokens: null,
          p_output_tokens: null,
        },
      ],
    ]);
  });

  it("keeps the answer when the audit write fails", async () => {
    state.run.mockResolvedValue({
      version: "2",
      status: "answered",
      outcome: "success",
      usage: usage(10, 10),
    });
    state.rpc.mockImplementation(async (name: string) => {
      if (name === "finish_ai_analyst_request") throw new Error("audit down");
      return { data: state.reservation, error: null };
    });
    const response = await post(ask);
    expect(response.status).toBe(200);
  });

  it("passes the client's disconnect to the run and still finishes once", async () => {
    let signal: AbortSignal | undefined;
    state.run.mockImplementation(
      async (_input: unknown, deps: { signal?: AbortSignal }) => {
        signal = deps.signal;
        await new Promise((resolve) =>
          deps.signal?.addEventListener("abort", resolve),
        );
        return {
          version: "2",
          status: "error",
          outcome: "insufficient",
          usage: { inputTokens: 0, outputTokens: 0, providerCalls: 0 },
        };
      },
    );
    const response = await POST(
      new Request("http://localhost/api/analyst/v2", {
        method: "POST",
        headers: { accept: "application/x-ndjson" },
        body: JSON.stringify(ask),
      }),
    );
    await response.body!.cancel();
    expect(signal?.aborted).toBe(true);
    await vi.waitFor(() => expect(finishes()).toHaveLength(1));
    expect(finishes()[0]![1]).toMatchObject({ p_outcome: "insufficient" });
  });
});
