import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIGEST_QUESTION } from "@/lib/analyst/intelligence/digest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-00000000000a" } as { id: string } | null,
  reservation: { status: "reserved", request_id: 7 } as Record<string, unknown>,
  stored: null as unknown,
  readError: null as unknown,
  saved: [] as Array<Record<string, unknown>>,
  rpc: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@/lib/analyst/intelligence/diagnostics-store", () => ({
  recordDiagnostics: async () => undefined,
}));
vi.mock("@/lib/analyst/intelligence/memory-store", () => ({
  listMemories: async () => [],
  touchMemories: async () => undefined,
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
    from: (table: string) => {
      if (table !== "analyst_digests") throw new Error(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: state.stored,
              error: state.readError,
            }),
          }),
        }),
        upsert: async (row: Record<string, unknown>) => {
          state.saved.push(row);
          return { error: null };
        },
      };
    },
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
  domains: ["money", "goals"],
  profiles: ["aggregate"],
  grantedAt: "2026-09-24T00:00:00.000Z",
};
const key = "openai_shared:goals,money:aggregate";
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/analyst/digest", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const presentation = (findings: number) => ({
  language: "en",
  status: "answered",
  statusLabel: "Answered",
  direct: [],
  findings: Array.from({ length: findings }, (_, index) => ({
    id: `c${index}`,
    kind: "fact",
    text: "Recorded spending is higher than the same days of August.",
    recommendation: null,
  })),
  options: [],
  limitations: [],
  unresolved: [],
  verification: { figures: "", review: "", freshness: null },
  sources: [],
  shortened: null,
});
const result = (status = "answered", findings = 1) => ({
  version: "2",
  status,
  presentation: presentation(findings),
  candidates: [],
  suggestions: [],
  models: { planner: null, writer: null, reviewer: null, fallback: false },
  context: "sealed-token",
  contextNotice: null,
  memorySuggestion: "Saving for a laptop",
  outcome: "success",
  usage: { inputTokens: 10, outputTokens: 5, providerCalls: 1 },
  relatedMemoryIds: [],
  diagnostics: undefined,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-24T04:00:00Z") });
  process.env.ATLAS_ANALYST_V2 = "1";
  process.env.OPENAI_API_KEY = "sk-synthetic";
  state.user = { id: "00000000-0000-4000-8000-00000000000a" };
  state.reservation = { status: "reserved", request_id: 7 };
  state.stored = null;
  state.readError = null;
  state.saved = [];
  state.rpc.mockReset();
  state.run.mockReset();
  state.run.mockResolvedValue(result());
  state.rpc.mockImplementation(async (name: string) =>
    name === "reserve_ai_analyst_request_result"
      ? { data: state.reservation, error: null }
      : { data: null, error: null },
  );
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.ATLAS_ANALYST_V2;
});

describe("the month's summary route", () => {
  it("is guarded like any Analyst request", async () => {
    delete process.env.ATLAS_ANALYST_V2;
    expect((await post({ consent })).status).toBe(404);
    process.env.ATLAS_ANALYST_V2 = "1";
    state.user = null;
    expect((await post({ consent })).status).toBe(401);
    state.user = { id: "00000000-0000-4000-8000-00000000000a" };
    expect((await post({})).status).toBe(400);
    expect((await post({ consent, owner: "someone" })).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("makes today's summary once, metered, and keeps it without the conversation token", async () => {
    const response = await post({ consent });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ day: "2026-09-24", cached: false });
    expect(body.digest.presentation.findings).toHaveLength(1);
    for (const field of [
      "context",
      "outcome",
      "usage",
      "relatedMemoryIds",
      "memorySuggestion",
    ])
      expect(body.digest).not.toHaveProperty(field);
    expect(state.run.mock.calls[0]![0]).toMatchObject({
      question: DIGEST_QUESTION,
      contextToken: null,
    });
    expect(
      state.rpc.mock.calls.filter(
        ([name]) => name === "finish_ai_analyst_request",
      ),
    ).toHaveLength(1);
    expect(state.saved).toEqual([
      expect.objectContaining({
        user_id: state.user!.id,
        day: "2026-09-24",
        consent_key: key,
        body: body.digest,
      }),
    ]);
  });

  it("reads today's kept summary without running or reserving", async () => {
    state.stored = {
      day: "2026-09-24",
      consent_key: key,
      body: { ...result(), context: undefined },
    };
    const body = await (await post({ consent })).json();
    expect(body).toMatchObject({ cached: true });
    expect(state.run).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("makes a new one on a new day or under a different consent", async () => {
    state.stored = { day: "2026-09-23", consent_key: key, body: result() };
    await post({ consent });
    state.stored = {
      day: "2026-09-24",
      consent_key: "openai_shared:money:aggregate",
      body: result(),
    };
    await post({ consent });
    expect(state.run).toHaveBeenCalledTimes(2);
  });

  it("runs nothing when the store cannot be read", async () => {
    state.readError = { message: "relation does not exist" };
    expect((await post({ consent })).status).toBe(503);
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.run).not.toHaveBeenCalled();
  });

  it("keeps a run with nothing to show, and shows nothing", async () => {
    state.run.mockResolvedValue(result("insufficient_evidence", 0));
    const body = await (await post({ consent })).json();
    expect(body).toEqual({ digest: null, reason: "nothing_to_show" });
    expect(state.saved).toHaveLength(1);
  });

  it("needs money, and a few days of the month", async () => {
    expect(
      await (
        await post({ consent: { ...consent, domains: ["goals"] } })
      ).json(),
    ).toEqual({ digest: null, reason: "no_money" });
    vi.setSystemTime(new Date("2026-10-01T20:00:00Z")); // Oct 2 in Manila
    expect(await (await post({ consent })).json()).toEqual({
      digest: null,
      reason: "too_early",
    });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("reports a used-up allowance without running", async () => {
    state.reservation = { status: "daily_quota" };
    expect((await post({ consent })).status).toBe(429);
    expect(state.run).not.toHaveBeenCalled();
    expect(state.saved).toEqual([]);
  });
});
