import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  meteredOpenAIFetch,
  PoolExhaustedError,
  PoolMeterError,
  readPoolStatus,
} from "./pool-meter";

vi.mock("server-only", () => ({}));
const supabase = vi.hoisted(() => ({
  rpc: vi.fn(),
  statusRpc: vi.fn(),
  getUser: vi.fn(),
  admin: true,
}));
// Reserving and settling use the server's service-role client; the session
// client only identifies the account and reads pool status.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => (supabase.admin ? { rpc: supabase.rpc } : null),
}));
const usage = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("./provider-usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./provider-usage")>()),
  syncProviderUsage: usage.sync,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: supabase.statusRpc,
    auth: { getUser: supabase.getUser },
  }),
}));

const url = "https://api.openai.com/v1/chat/completions";
const init = { method: "POST", body: "{}" };
const options = (fetch: typeof globalThis.fetch, model = "gpt-6-sol") => ({
  model,
  feature: "analyst_answer" as const,
  reserveTokens: 1234.2,
  fetch,
});
const settleCalls = () =>
  supabase.rpc.mock.calls.filter(([name]) => name === "settle_ai_pool_tokens");

beforeEach(() => {
  delete process.env.OPENAI_ADMIN_KEY;
  usage.sync.mockReset();
  usage.sync.mockResolvedValue(true);
  supabase.admin = true;
  supabase.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } } });
  supabase.statusRpc.mockReset();
  supabase.rpc.mockReset();
  supabase.rpc.mockImplementation(async (name: string) =>
    name === "reserve_ai_pool_tokens"
      ? { data: { status: "reserved", reservation_id: 9 }, error: null }
      : { data: null, error: null },
  );
});

describe("free daily pool meter", () => {
  it("reserves the largest size, sends, then settles the reported usage", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        usage: { prompt_tokens: 400, completion_tokens: 60 },
        choices: [],
      }),
    );
    const response = await meteredOpenAIFetch(url, init, options(fetch));
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "reserve_ai_pool_tokens", {
      p_user_id: "owner-a",
      p_model: "gpt-6-sol",
      p_feature: "analyst_answer",
      p_tokens: 1235,
    });
    expect(fetch).toHaveBeenCalledWith(url, init);
    expect(settleCalls()).toEqual([
      ["settle_ai_pool_tokens", { p_id: 9, p_used: 460 }],
    ]);
    // The caller still reads the whole body.
    expect(await response.json()).toMatchObject({
      usage: { prompt_tokens: 400 },
    });
  });
  it("reads Responses API usage too", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ usage: { input_tokens: 900, output_tokens: 100 } }),
      );
    await meteredOpenAIFetch(
      "https://api.openai.com/v1/responses",
      init,
      options(fetch, "gpt-4o-mini-2024-07-18"),
    );
    expect(settleCalls()[0]![1]).toEqual({ p_id: 9, p_used: 1000 });
  });
  it("refuses without calling OpenAI when the pool is used up", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { status: "exhausted", pool: "large", remaining: 20 },
      error: null,
    });
    const fetch = vi.fn();
    await expect(
      meteredOpenAIFetch(url, init, options(fetch)),
    ).rejects.toBeInstanceOf(PoolExhaustedError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses an alias or an unavailable meter without calling OpenAI", async () => {
    const fetch = vi.fn();
    await expect(
      meteredOpenAIFetch(url, init, options(fetch, "gpt-4o-mini")),
    ).rejects.toBeInstanceOf(PoolMeterError);
    expect(supabase.rpc).not.toHaveBeenCalled();
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "missing" },
    });
    await expect(
      meteredOpenAIFetch(url, init, options(fetch)),
    ).rejects.toBeInstanceOf(PoolMeterError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses without the service-role key or a signed-in account", async () => {
    const fetch = vi.fn();
    supabase.admin = false;
    await expect(
      meteredOpenAIFetch(url, init, options(fetch)),
    ).rejects.toBeInstanceOf(PoolMeterError);
    supabase.admin = true;
    supabase.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(
      meteredOpenAIFetch(url, init, options(fetch)),
    ).rejects.toBeInstanceOf(PoolMeterError);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("frees a rejected request and keeps the reserve when usage is unknown", async () => {
    await meteredOpenAIFetch(
      url,
      init,
      options(vi.fn().mockResolvedValue(new Response("{}", { status: 429 }))),
    );
    expect(settleCalls().at(-1)![1]).toEqual({ p_id: 9, p_used: 0 });
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    await expect(
      meteredOpenAIFetch(
        url,
        init,
        options(vi.fn().mockRejectedValue(aborted)),
      ),
    ).rejects.toBe(aborted);
    expect(settleCalls().at(-1)![1]).toEqual({ p_id: 9, p_used: null });
    await meteredOpenAIFetch(
      url,
      init,
      options(vi.fn().mockResolvedValue(Response.json({ choices: [] }))),
    );
    expect(settleCalls().at(-1)![1]).toEqual({ p_id: 9, p_used: null });
  });
  it("reads today's pool status", async () => {
    supabase.statusRpc.mockResolvedValueOnce({
      data: [
        { pool: "large", used: 1000, budget: 225000, dailyTokens: 250000 },
        { pool: "small", used: 0, budget: 2250000, dailyTokens: 2500000 },
      ],
      error: null,
    });
    expect(await readPoolStatus()).toEqual({
      large: {
        used: 1000,
        budget: 225000,
        dailyTokens: 250000,
        syncedAt: null,
      },
      small: { used: 0, budget: 2250000, dailyTokens: 2500000, syncedAt: null },
    });
    supabase.statusRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "x" },
    });
    expect(await readPoolStatus()).toBeNull();
    expect(usage.sync).not.toHaveBeenCalled();
  });
  it("refreshes OpenAI's count before showing a stale status", async () => {
    process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
    const row = (used: number, syncedAt: string | null) => [
      { pool: "large", used, budget: 225000, dailyTokens: 250000, syncedAt },
      { pool: "small", used, budget: 2250000, dailyTokens: 2500000, syncedAt },
    ];
    const fresh = new Date().toISOString();
    supabase.statusRpc
      .mockResolvedValueOnce({ data: row(0, null), error: null })
      .mockResolvedValueOnce({ data: row(69542, fresh), error: null });
    expect((await readPoolStatus())?.small).toMatchObject({
      used: 69542,
      syncedAt: fresh,
    });
    expect(usage.sync).toHaveBeenCalledTimes(1);
    // A recent figure is shown without asking OpenAI again.
    supabase.statusRpc.mockResolvedValueOnce({
      data: row(69542, fresh),
      error: null,
    });
    await readPoolStatus();
    expect(usage.sync).toHaveBeenCalledTimes(1);
  });
  it("refreshes a stale OpenAI count alongside a pooled call", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ usage: {}, choices: [] }));
    await meteredOpenAIFetch(url, init, options(fetch));
    expect(usage.sync).not.toHaveBeenCalled();
    process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
    supabase.rpc.mockImplementation(async (name: string) =>
      name === "reserve_ai_pool_tokens"
        ? {
            data: {
              status: "reserved",
              reservation_id: 9,
              provider_synced_at: new Date(
                Date.now() - 10 * 60_000,
              ).toISOString(),
            },
            error: null,
          }
        : { data: null, error: null },
    );
    await meteredOpenAIFetch(url, init, options(fetch));
    expect(usage.sync).toHaveBeenCalledTimes(1);
  });
});
