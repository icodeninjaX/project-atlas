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
const page = (results: unknown[], more?: string) =>
  Response.json({
    data: [{ results }],
    has_more: Boolean(more),
    next_page: more ?? null,
  });

beforeEach(() => {
  process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
  delete process.env.OPENAI_PROJECT_ID;
  admin.configured = true;
  admin.rpc.mockReset();
  admin.rpc.mockResolvedValue({ error: null });
});
afterEach(() => {
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
    expect(await syncProviderUsage({ fetch, now })).toBe(true);
    expect(admin.rpc).toHaveBeenCalledWith("record_ai_pool_provider_usage", {
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
    admin.configured = false;
    expect(await syncProviderUsage({ fetch, now })).toBe(false);
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
        ? { data: true, error: null }
        : { error: null },
    );
    const fetch = vi.fn().mockResolvedValue(page([]));
    const results = await Promise.all([
      refreshProviderUsage({ fetch, now }),
      refreshProviderUsage({ fetch, now }),
      refreshProviderUsage({ fetch, now }),
    ]);
    expect(results).toEqual([true, true, true]);
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
        ? { data: true, error: null }
        : { error: null },
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
    ).toHaveLength(2);
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
        ? { data: false, error: null }
        : name === "ai_pool_provider_sync_state"
          ? { data: states.shift(), error: null }
          : { error: null },
    );
    const fetch = vi.fn();
    expect(await refreshProviderUsage({ fetch, now, pollMs: 1 })).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(states).toHaveLength(0);
  });
  it("keeps the ledger decision once the other refresh ends without a figure", async () => {
    admin.rpc.mockImplementation(async (name: string) =>
      name === "claim_ai_pool_provider_sync"
        ? { data: false, error: null }
        : name === "ai_pool_provider_sync_state"
          ? { data: { syncedAt: null, claimActive: false }, error: null }
          : { error: null },
    );
    const fetch = vi.fn();
    expect(await refreshProviderUsage({ fetch, now, pollMs: 1 })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
