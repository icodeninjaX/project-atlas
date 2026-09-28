import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchProviderUsage,
  providerUsageStale,
  refreshProviderUsage,
  syncProviderUsage,
} from "./provider-usage";

vi.mock("server-only", () => ({}));
const admin = vi.hoisted(() => ({ rpc: vi.fn(), configured: true }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => (admin.configured ? { rpc: admin.rpc } : null),
}));

const now = new Date("2026-09-27T16:40:00Z");
const TOKEN = "5f0c6f1e-8d3a-4c52-9b7e-2a1d4e6f8a90";
const page = (results: unknown[], more?: string) =>
  Response.json({
    data: [{ results }],
    has_more: Boolean(more),
    next_page: more ?? null,
  });

let clock = Date.now();
beforeEach(() => {
  // Each test runs two minutes after the last, outside any earlier backoff.
  clock += 120_000;
  vi.useFakeTimers({ now: clock, shouldAdvanceTime: true });
  process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
  delete process.env.OPENAI_PROJECT_ID;
  admin.configured = true;
  admin.rpc.mockReset();
  admin.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.OPENAI_ADMIN_KEY;
  delete process.env.OPENAI_PROJECT_ID;
});

describe("OpenAI usage sync", () => {
  it("reads today's usage by model and tier and sums it per free pool", async () => {
    process.env.OPENAI_PROJECT_ID = "proj_atlas";
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          [
            {
              model: "gpt-4o-mini-2024-07-18",
              service_tier: "default",
              input_tokens: 60000,
              output_tokens: 9542,
            },
            {
              model: "gpt-6-sol",
              service_tier: "default",
              input_tokens: 1000,
              output_tokens: 200,
            },
            // Outside the free pools, such as transcription or an alias.
            { model: "gpt-transcribe", input_tokens: 500, output_tokens: 0 },
          ],
          "page_2",
        ),
      )
      .mockResolvedValueOnce(
        page([
          {
            model: "gpt-5.4-mini-2026-03-17",
            service_tier: null,
            input_tokens: 300,
            output_tokens: -5,
          },
        ]),
      );
    const usage = await fetchProviderUsage({ fetch, now });
    expect(usage?.day).toBe("2026-09-27");
    expect(usage?.totals).toEqual({ large: 1200, small: 69842 });
    expect(usage?.details).toContainEqual({
      model: "gpt-6-sol",
      serviceTier: "default",
      pool: "large",
      tokens: 1200,
    });
    const first = new URL(fetch.mock.calls[0]![0]);
    expect(first.origin + first.pathname).toBe(
      "https://api.openai.com/v1/organization/usage/completions",
    );
    expect(first.searchParams.get("start_time")).toBe(
      String(Date.parse("2026-09-27T00:00:00Z") / 1000),
    );
    expect(first.searchParams.get("bucket_width")).toBe("1d");
    expect(first.searchParams.getAll("group_by")).toEqual([
      "model",
      "service_tier",
    ]);
    expect(first.searchParams.getAll("project_ids")).toEqual(["proj_atlas"]);
    expect(fetch.mock.calls[0]![1].headers).toEqual({
      Authorization: "Bearer sk-admin-test",
    });
    expect(new URL(fetch.mock.calls[1]![0]).searchParams.get("page")).toBe(
      "page_2",
    );
  });
  it("counts the whole organization without a project and skips without a key", async () => {
    const fetch = vi.fn().mockResolvedValue(page([]));
    await fetchProviderUsage({ fetch, now });
    expect(
      new URL(fetch.mock.calls[0]![0]).searchParams.has("project_ids"),
    ).toBe(false);
    delete process.env.OPENAI_ADMIN_KEY;
    fetch.mockClear();
    expect(await fetchProviderUsage({ fetch, now })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the last figure when OpenAI refuses or fails", async () => {
    expect(
      await fetchProviderUsage({
        fetch: vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
        now,
      }),
    ).toBeNull();
    expect(
      await fetchProviderUsage({
        fetch: vi.fn().mockRejectedValue(new Error("offline")),
        now,
      }),
    ).toBeNull();
    expect(
      await syncProviderUsage({
        token: TOKEN,
        fetch: vi.fn().mockRejectedValue(new Error("offline")),
        now,
      }),
    ).toBe(false);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("records the totals through the server-only function", async () => {
    const fetch = vi.fn().mockResolvedValue(
      page([
        {
          model: "gpt-4o-mini-2024-07-18",
          service_tier: "default",
          input_tokens: 100,
          output_tokens: 20,
        },
      ]),
    );
    expect(await syncProviderUsage({ token: TOKEN, fetch, now })).toBe(true);
    expect(admin.rpc).toHaveBeenCalledWith("record_ai_pool_provider_usage", {
      p_token: TOKEN,
      p_day: "2026-09-27",
      p_large: 0,
      p_small: 120,
      p_details: [
        {
          model: "gpt-4o-mini-2024-07-18",
          serviceTier: "default",
          pool: "small",
          tokens: 120,
        },
      ],
    });
    // A claim that lapsed and passed to another caller records nothing.
    admin.rpc.mockResolvedValue({ data: false, error: null });
    expect(await syncProviderUsage({ token: TOKEN, fetch, now })).toBe(false);
    admin.configured = false;
    expect(await syncProviderUsage({ token: TOKEN, fetch, now })).toBe(false);
  });
  it("refreshes a figure older than five minutes", () => {
    expect(providerUsageStale(null)).toBe(true);
    expect(providerUsageStale(new Date().toISOString())).toBe(false);
    expect(
      providerUsageStale(new Date(Date.now() - 6 * 60_000).toISOString()),
    ).toBe(true);
  });

  it("shares one refresh between concurrent callers in an instance", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: TOKEN, error: null }
        : { data: true, error: null },
    );
    const fetch = vi.fn().mockResolvedValue(page([]));
    const results = await Promise.all([
      refreshProviderUsage({ fetch, now }),
      refreshProviderUsage({ fetch, now }),
      refreshProviderUsage({ fetch, now }),
    ]);
    expect(results).toEqual(["fresh", "fresh", "fresh"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      admin.rpc.mock.calls.filter(
        ([name]) => name === "claim_ai_pool_provider_sync",
      ),
    ).toHaveLength(1);
  });
  it("releases its claim after refreshing, whether or not it succeeded", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: TOKEN, error: null }
        : { data: true, error: null },
    );
    await refreshProviderUsage({
      fetch: vi.fn().mockResolvedValue(page([])),
      now,
    });
    await refreshProviderUsage({
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
      now,
    });
    expect(
      admin.rpc.mock.calls.filter(
        ([name]) => name === "release_ai_pool_provider_sync",
      ),
    ).toEqual([
      ["release_ai_pool_provider_sync", { p_token: TOKEN }],
      ["release_ai_pool_provider_sync", { p_token: TOKEN }],
    ]);
  });
  it("reports no fresh figure when its claim lapsed before recording", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: TOKEN, error: null }
        : name === "record_ai_pool_provider_usage"
          ? { data: false, error: null }
          : { data: null, error: null },
    );
    expect(
      await refreshProviderUsage({
        fetch: vi.fn().mockResolvedValue(page([])),
        now,
      }),
    ).toBe("failed");
    expect(admin.rpc).toHaveBeenCalledWith("release_ai_pool_provider_sync", {
      p_token: TOKEN,
    });
  });
  it("waits while another instance holds the claim, then uses its figure", async () => {
    const stale = new Date(Date.now() - 10 * 60_000).toISOString();
    const fresh = new Date().toISOString();
    const states = [
      { syncedAt: stale, claimActive: true },
      { syncedAt: stale, claimActive: true },
      { syncedAt: fresh, claimActive: false },
    ];
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: null, error: null }
        : name === "ai_pool_provider_sync_state"
          ? { data: states.shift(), error: null }
          : { data: true, error: null },
    );
    const fetch = vi.fn();
    expect(await refreshProviderUsage({ fetch, now, pollMs: 1 })).toBe("fresh");
    expect(fetch).not.toHaveBeenCalled();
    expect(states).toHaveLength(0);
  });
  it("keeps the ledger decision once the other refresh ends without a figure", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: null, error: null }
        : name === "ai_pool_provider_sync_state"
          ? { data: { syncedAt: null, claimActive: false }, error: null }
          : { data: true, error: null },
    );
    const fetch = vi.fn();
    expect(await refreshProviderUsage({ fetch, now, pollMs: 1 })).toBe(
      "failed",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps waiting through a failed check instead of treating it as released", async () => {
    const fresh = new Date().toISOString();
    const polls: Array<() => unknown> = [
      () => ({ data: null, error: { message: "timeout" } }),
      () => {
        throw new Error("network");
      },
      () => ({ data: { syncedAt: fresh, claimActive: false }, error: null }),
    ];
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: null, error: null }
        : name === "ai_pool_provider_sync_state"
          ? polls.shift()!()
          : { data: true, error: null },
    );
    expect(await refreshProviderUsage({ fetch: vi.fn(), now, pollMs: 1 })).toBe(
      "fresh",
    );
    expect(polls).toHaveLength(0);
  });
  it("reports the outcome as unknown once the wait for a claim runs out", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: null, error: null }
        : { data: null, error: { message: "down" } },
    );
    expect(
      await refreshProviderUsage({
        fetch: vi.fn(),
        now,
        pollMs: 1,
        waitMs: 20,
      }),
    ).toBe("pending");
  });
  it("keeps waiting when a claim is taken over after a lapse, up to the cap", async () => {
    const stale = new Date(Date.now() - 10 * 60_000).toISOString();
    const fresh = new Date().toISOString();
    let polls = 0;
    admin.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_ai_pool_provider_sync")
        return { data: null, error: null };
      polls += 1;
      // The successor's claim stays active past the first wait, then its
      // figure lands.
      return polls < 30
        ? {
            data: { syncedAt: stale, claimActive: true, claimRemainingMs: 50 },
            error: null,
          }
        : { data: { syncedAt: fresh, claimActive: false }, error: null };
    });
    expect(
      await refreshProviderUsage({
        fetch: vi.fn(),
        now,
        pollMs: 2,
        waitMs: 20,
        maxWaitMs: 2_000,
      }),
    ).toBe("fresh");
    expect(polls).toBe(30);

    // A claim that never ends leaves the outcome unknown at the cap.
    vi.setSystemTime(Date.now() + 120_000);
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: null, error: null }
        : {
            data: { syncedAt: stale, claimActive: true, claimRemainingMs: 50 },
            error: null,
          },
    );
    expect(
      await refreshProviderUsage({
        fetch: vi.fn(),
        now,
        pollMs: 2,
        waitMs: 20,
        maxWaitMs: 200,
      }),
    ).toBe("pending");
  });
  it("waits a minute after a failed refresh before asking OpenAI again", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: TOKEN, error: null }
        : { data: true, error: null },
    );
    const failing = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await refreshProviderUsage({ fetch: failing, now })).toBe("failed");
    expect(await refreshProviderUsage({ fetch: failing, now })).toBe("failed");
    expect(failing).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 61_000);
    const working = vi.fn().mockResolvedValue(page([]));
    expect(await refreshProviderUsage({ fetch: working, now })).toBe("fresh");
    expect(working).toHaveBeenCalledTimes(1);
  });
});
