import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freePoolFor, type FreePool } from "./pools";

/**
 * Reads today's token usage from OpenAI's organization Usage API
 * (`/v1/organization/usage/completions`) with the admin key and records it
 * per free pool, so the daily meter also counts usage it did not make.
 * `OPENAI_PROJECT_ID` narrows it to ATLAS's project; without it the whole
 * organization counts, which can only make the meter stop sooner.
 */

/** A figure older than this is refreshed on the next pooled request. */
export const PROVIDER_USAGE_MAX_AGE_MS = 5 * 60_000;

const USAGE_URL = "https://api.openai.com/v1/organization/usage/completions";
const SYNC_TIMEOUT_MS = 4_000;
// A claim lapses after 15 seconds; waiters never give up before that.
const CLAIM_WAIT_MS = 16_000;
const MAX_PAGES = 5;

type UsageResult = {
  model?: unknown;
  service_tier?: unknown;
  input_tokens?: unknown;
  output_tokens?: unknown;
};

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;

/** True when a pool figure should be read again. */
export function providerUsageStale(syncedAt: string | null | undefined) {
  if (!syncedAt) return true;
  const age = Date.now() - Date.parse(syncedAt);
  return !Number.isFinite(age) || age > PROVIDER_USAGE_MAX_AGE_MS;
}

/** Today's tokens per pool from OpenAI, with a model and tier breakdown. */
export async function fetchProviderUsage(
  options: { fetch?: typeof globalThis.fetch; now?: Date } = {},
) {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return null;
  const now = options.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
  const start = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000);
  const totals: Record<FreePool, number> = { large: 0, small: 0 };
  const details: Array<{
    model: string;
    serviceTier: string | null;
    pool: FreePool;
    tokens: number;
  }> = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    let page: string | null = null;
    for (let index = 0; index < MAX_PAGES; index += 1) {
      const params = new URLSearchParams({
        start_time: String(start),
        bucket_width: "1d",
        limit: "1",
      });
      params.append("group_by", "model");
      params.append("group_by", "service_tier");
      const project = process.env.OPENAI_PROJECT_ID;
      if (project) params.append("project_ids", project);
      if (page) params.set("page", page);
      const response = await (options.fetch ?? globalThis.fetch)(
        `${USAGE_URL}?${params}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as {
        data?: Array<{ results?: UsageResult[] }>;
        has_more?: boolean;
        next_page?: string | null;
      };
      for (const bucket of body.data ?? [])
        for (const result of bucket.results ?? []) {
          if (typeof result.model !== "string") continue;
          // The Usage API names the resolved snapshot, as the pools do.
          const pool = freePoolFor(result.model);
          if (!pool) continue;
          const tokens =
            count(result.input_tokens) + count(result.output_tokens);
          totals[pool] += tokens;
          details.push({
            model: result.model,
            serviceTier:
              typeof result.service_tier === "string"
                ? result.service_tier
                : null,
            pool,
            tokens,
          });
        }
      if (!body.has_more || !body.next_page) return { day, totals, details };
      page = body.next_page;
    }
    // Too many pages to be sure of the total; keep the last known figure.
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Refreshes the recorded figure. Never throws: without the admin key or when
 * OpenAI is unreachable, the meter keeps using its own ledger.
 */
export async function syncProviderUsage(
  options: { fetch?: typeof globalThis.fetch; now?: Date } = {},
) {
  const admin = createAdminClient();
  if (!admin) return false;
  const usage = await fetchProviderUsage(options);
  if (!usage) return false;
  try {
    const { error } = await admin.rpc("record_ai_pool_provider_usage", {
      p_day: usage.day,
      p_large: usage.totals.large,
      p_small: usage.totals.small,
      p_details: usage.details,
    });
    return !error;
  } catch {
    return false;
  }
}

let inflight: Promise<boolean> | null = null;

/**
 * Refreshes OpenAI's figure once for everyone waiting on it. Callers in this
 * server instance share one in-flight refresh, and across instances only the
 * caller that claims the refresh calls the Usage API; the rest wait up to
 * `waitMs` for its figure. Resolves true once a fresh figure is recorded,
 * false when the caller should keep its ledger decision.
 */
export function refreshProviderUsage(
  options: {
    fetch?: typeof globalThis.fetch;
    now?: Date;
    pollMs?: number;
    waitMs?: number;
  } = {},
): Promise<boolean> {
  inflight ??= coordinatedRefresh(options).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function coordinatedRefresh(options: {
  fetch?: typeof globalThis.fetch;
  now?: Date;
  pollMs?: number;
  waitMs?: number;
}) {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { data: claimed, error } = await admin.rpc(
      "claim_ai_pool_provider_sync",
    );
    if (error) return false;
    if (claimed === true) {
      try {
        return await syncProviderUsage(options);
      } finally {
        // Waiting callers learn the outcome instead of timing out.
        await admin.rpc("release_ai_pool_provider_sync");
      }
    }
    // Another instance is refreshing: wait until its figure lands or its
    // claim ends (released, or lapsed after 15 seconds).
    const deadline = Date.now() + (options.waitMs ?? CLAIM_WAIT_MS);
    while (Date.now() < deadline) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollMs ?? 400),
      );
      const { data } = await admin.rpc("ai_pool_provider_sync_state");
      const state = (data ?? {}) as {
        syncedAt?: unknown;
        claimActive?: unknown;
      };
      if (
        typeof state.syncedAt === "string" &&
        !providerUsageStale(state.syncedAt)
      )
        return true;
      if (state.claimActive !== true) return false;
    }
    return false;
  } catch {
    return false;
  }
}
