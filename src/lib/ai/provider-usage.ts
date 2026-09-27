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
// However many times a claim changes hands, a request waits no longer.
const MAX_CLAIM_WAIT_MS = 32_000;
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
 * Refreshes the recorded figure under the refresh claim `token`. Never
 * throws: without the admin key, when OpenAI is unreachable, or once the
 * claim has passed to another caller, the meter keeps its own ledger.
 */
export async function syncProviderUsage(options: {
  token: string;
  fetch?: typeof globalThis.fetch;
  now?: Date;
}) {
  const admin = createAdminClient();
  if (!admin) return false;
  const usage = await fetchProviderUsage(options);
  if (!usage) return false;
  try {
    const { data, error } = await admin.rpc("record_ai_pool_provider_usage", {
      p_token: options.token,
      p_day: usage.day,
      p_large: usage.totals.large,
      p_small: usage.totals.small,
      p_details: usage.details,
    });
    // False when the claim lapsed and another caller holds it now.
    return !error && data === true;
  } catch {
    return false;
  }
}

/**
 * How a refresh ended: `fresh` once a new figure is recorded, `failed` when
 * the caller should keep its ledger decision, and `pending` when another
 * instance's refresh was still under way after the longest wait, so its
 * outcome is unknown.
 */
export type RefreshResult = "fresh" | "failed" | "pending";

let inflight: Promise<RefreshResult> | null = null;
// After a failed refresh (a revoked key, say), requests keep the ledger
// decision for a minute instead of each waiting on OpenAI again.
const FAILURE_BACKOFF_MS = 60_000;
let failedAt = 0;

/**
 * Refreshes OpenAI's figure once for everyone waiting on it. Callers in this
 * server instance share one in-flight refresh, and across instances only the
 * caller that claims the refresh calls the Usage API; the rest wait for its
 * figure while a claim is active, up to `maxWaitMs` in all.
 */
export function refreshProviderUsage(
  options: {
    fetch?: typeof globalThis.fetch;
    now?: Date;
    pollMs?: number;
    waitMs?: number;
    maxWaitMs?: number;
  } = {},
): Promise<RefreshResult> {
  if (Date.now() - failedAt < FAILURE_BACKOFF_MS)
    return Promise.resolve("failed");
  inflight ??= coordinatedRefresh(options)
    .then((result) => {
      if (result === "failed") failedAt = Date.now();
      return result;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function coordinatedRefresh(options: {
  fetch?: typeof globalThis.fetch;
  now?: Date;
  pollMs?: number;
  waitMs?: number;
  maxWaitMs?: number;
}): Promise<RefreshResult> {
  const admin = createAdminClient();
  if (!admin) return "failed";
  try {
    const { data: token, error } = await admin.rpc(
      "claim_ai_pool_provider_sync",
    );
    if (error) return "failed";
    if (typeof token === "string") {
      try {
        return (await syncProviderUsage({ ...options, token }))
          ? "fresh"
          : "failed";
      } finally {
        // Waiting callers learn the outcome instead of timing out. Only this
        // claim is released, never one taken after it lapsed.
        await Promise.resolve(
          admin.rpc("release_ai_pool_provider_sync", { p_token: token }),
        ).catch(() => undefined);
      }
    }
    // Another instance is refreshing: wait until its figure lands or its
    // claim ends (released, or lapsed after 15 seconds). A claim taken over
    // after a lapse extends the wait to its own lease, up to the cap.
    const start = Date.now();
    const cap = start + (options.maxWaitMs ?? MAX_CLAIM_WAIT_MS);
    let deadline = Math.min(cap, start + (options.waitMs ?? CLAIM_WAIT_MS));
    while (Date.now() < deadline) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollMs ?? 400),
      );
      // A failed check says nothing about the claim, so keep waiting.
      const polled = await Promise.resolve(
        admin.rpc("ai_pool_provider_sync_state"),
      ).catch(() => null);
      if (!polled || polled.error || !polled.data) continue;
      const state = polled.data as {
        syncedAt?: unknown;
        claimActive?: unknown;
        claimRemainingMs?: unknown;
      };
      if (
        typeof state.syncedAt === "string" &&
        !providerUsageStale(state.syncedAt)
      )
        return "fresh";
      if (state.claimActive !== true) return "failed";
      if (typeof state.claimRemainingMs === "number")
        deadline = Math.min(
          cap,
          Math.max(deadline, Date.now() + state.claimRemainingMs + 1_000),
        );
    }
    // Still claimed, or unknown: the refresh may yet show the pool is full.
    return "pending";
  } catch {
    return "failed";
  }
}
