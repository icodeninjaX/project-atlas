/**
 * OpenAI's complimentary daily tokens on traffic shared with OpenAI, as listed
 * at https://help.openai.com/en/articles/10306912 (reviewed 2026-09-27).
 *
 * Each pool is shared by every model in it and resets at 00:00 UTC
 * (08:00 Asia/Manila). A request that would take the day's total past the
 * limit is billed in full, so ATLAS reserves each request's largest possible
 * size before calling and stops short of the limit (see
 * `supabase/migrations/*_openai_free_pools.sql`). Only these exact model IDs
 * qualify; an alias can move to an unlisted snapshot, so ATLAS never sends one
 * to a pooled feature. The database keeps the same list and the limits.
 */
export type FreePool = "large" | "small";

/** Usage tiers 1–2. Tiers 3–5 get 1M and 10M. */
export const FREE_POOL_DAILY_TOKENS: Record<FreePool, number> = {
  large: 250_000,
  small: 2_500_000,
};

/** ATLAS stops at this share of each pool, leaving room for estimates. */
export const FREE_POOL_STOP_RATIO = 0.9;

const largePool = [
  "gpt-6-astra",
  "gpt-6-sol",
  "gpt-6-luna",
  "gpt-5.6-sol",
  "gpt-5.5-2026-04-23",
  "gpt-5.4-2026-03-05",
  "gpt-5.2-2025-12-11",
  "gpt-5.1-2025-11-13",
  "gpt-5.1-codex",
  "gpt-5-codex",
  "gpt-5-2025-08-07",
  "gpt-5-chat-latest",
  "gpt-4.1-2025-04-14",
  "gpt-4o-2024-05-13",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "o3-2025-04-16",
  "o1-preview-2024-09-12",
  "o1-2024-12-17",
] as const;

const smallPool = [
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.4-mini-2026-03-17",
  "gpt-5.4-nano-2026-03-17",
  "gpt-5.1-codex-mini",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano-2025-08-07",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano-2025-04-14",
  "gpt-4o-mini-2024-07-18",
  "o4-mini-2025-04-16",
  "o1-mini-2024-09-12",
  "codex-mini-latest",
] as const;

/** The free pool an exact model ID draws from, or null outside the offer. */
export function freePoolFor(model: string): FreePool | null {
  if ((largePool as readonly string[]).includes(model)) return "large";
  if ((smallPool as readonly string[]).includes(model)) return "small";
  return null;
}

export const FREE_POOL_MODELS = { large: largePool, small: smallPool };

/** Next 00:00 UTC, when both pools refresh. */
export function nextPoolReset(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}
