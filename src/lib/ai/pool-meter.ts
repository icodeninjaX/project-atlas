import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { freePoolFor, type FreePool } from "./pools";
import { providerUsageStale, refreshProviderUsage } from "./provider-usage";

export type PoolFeature =
  | "analyst_planner"
  | "analyst_answer"
  | "analyst_preset"
  | "capture"
  | "capture_batch"
  | "capture_media";

/** The pool would pass ATLAS's stop point today; nothing was sent. */
export class PoolExhaustedError extends Error {
  constructor(public readonly pool: FreePool) {
    super("pool_exhausted");
    this.name = "PoolExhaustedError";
  }
}

/** The meter could not reserve (setup, auth or a model outside the offer). */
export class PoolMeterError extends Error {
  constructor(public readonly reason: string) {
    super("pool_meter_unavailable");
    this.name = "PoolMeterError";
  }
}

// Usage is read from a copy of the response; larger bodies keep the reserve.
const USAGE_READ_BYTES = 262_144;

async function usedTokens(response: Response) {
  try {
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > USAGE_READ_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(buffer);
    const usage = (JSON.parse(text) as { usage?: Record<string, unknown> })
      .usage;
    // Chat Completions reports prompt/completion; Responses input/output.
    const input = usage?.prompt_tokens ?? usage?.input_tokens;
    const output = usage?.completion_tokens ?? usage?.output_tokens;
    return Number.isSafeInteger(input) && Number.isSafeInteger(output)
      ? (input as number) + (output as number)
      : null;
  } catch {
    return null;
  }
}

/**
 * Sends one OpenAI request inside its model's free daily pool. It reserves
 * `reserveTokens` (the request's largest possible input plus its output cap)
 * before sending, because a request that crosses the daily limit is billed in
 * full, and settles the reservation with the reported usage afterwards.
 * Throws `PoolExhaustedError` or `PoolMeterError` without calling OpenAI.
 */
export async function meteredOpenAIFetch(
  url: string,
  init: RequestInit,
  options: {
    model: string;
    feature: PoolFeature;
    reserveTokens: number;
    fetch?: typeof globalThis.fetch;
  },
): Promise<Response> {
  const send = options.fetch ?? globalThis.fetch;
  const pool = freePoolFor(options.model);
  if (!pool) throw new PoolMeterError("unpooled_model");
  // Only the server may reserve, for the account this request verified.
  const session = await createClient();
  const admin = createAdminClient();
  if (!session || !admin) throw new PoolMeterError("unconfigured");
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new PoolMeterError("unauthenticated");
  type Reservation = {
    status?: string;
    reservation_id?: number;
    provider_synced_at?: string | null;
  } | null;
  const reserve = async () => {
    const { data, error } = await admin.rpc("reserve_ai_pool_tokens", {
      p_user_id: user.id,
      p_model: options.model,
      p_feature: options.feature,
      p_tokens: Math.max(1, Math.ceil(options.reserveTokens)),
    });
    return error ? null : (data as Reservation);
  };
  const settleReservation = async (id: number, used: number | null) => {
    try {
      await admin.rpc("settle_ai_pool_tokens", { p_id: id, p_used: used });
    } catch {
      /* The reservation stays counted at its full size. */
    }
  };
  let reservation = await reserve();
  // A stale OpenAI count is refreshed before anything is sent, then the
  // request reserves again against it, so usage outside the meter cannot
  // let this request cross the limit. If the refresh fails, the ledger
  // decision stands.
  if (
    reservation?.status === "reserved" &&
    reservation.reservation_id &&
    process.env.OPENAI_ADMIN_KEY &&
    providerUsageStale(reservation.provider_synced_at) &&
    (await refreshProviderUsage())
  ) {
    // Only a released reservation may be replaced; otherwise nothing is
    // sent and the first one stays counted.
    const { error: releaseError } = await admin
      .rpc("settle_ai_pool_tokens", {
        p_id: reservation.reservation_id,
        p_used: 0,
      })
      .then(
        (result) => result,
        () => ({ error: true }),
      );
    if (releaseError) throw new PoolMeterError("release_failed");
    reservation = await reserve();
  }
  if (!reservation?.status) throw new PoolMeterError("unavailable");
  if (reservation.status === "exhausted") throw new PoolExhaustedError(pool);
  if (reservation.status !== "reserved" || !reservation.reservation_id)
    throw new PoolMeterError(reservation.status);
  const reservationId = reservation.reservation_id;
  const settle = (used: number | null) =>
    settleReservation(reservationId, used);
  let response: Response;
  try {
    response = await send(url, init);
  } catch (sendError) {
    // A request that timed out may still have been billed.
    await settle(null);
    throw sendError;
  }
  // A rejected request uses no tokens.
  if (!response.ok) {
    await settle(0);
    return response;
  }
  await settle(await usedTokens(response.clone()));
  return response;
}

export type PoolStatus = Record<
  FreePool,
  { used: number; budget: number; dailyTokens: number; syncedAt: string | null }
>;

async function readStatusOnce(): Promise<PoolStatus | null> {
  const client = await createClient();
  if (!client) return null;
  const { data, error } = await client.rpc("ai_pool_status");
  if (error || !Array.isArray(data)) return null;
  const status: Partial<PoolStatus> = {};
  for (const row of data as Array<Record<string, unknown>>) {
    if (row.pool !== "large" && row.pool !== "small") continue;
    status[row.pool] = {
      used: Number(row.used) || 0,
      budget: Number(row.budget) || 0,
      dailyTokens: Number(row.dailyTokens) || 0,
      syncedAt: typeof row.syncedAt === "string" ? row.syncedAt : null,
    };
  }
  return status.large && status.small ? (status as PoolStatus) : null;
}

/**
 * Today's use of each pool, or null when the meter is unavailable. A stale
 * OpenAI figure is refreshed first, so the picker shows OpenAI's own count.
 */
export async function readPoolStatus(): Promise<PoolStatus | null> {
  const status = await readStatusOnce();
  if (
    !status ||
    !process.env.OPENAI_ADMIN_KEY ||
    (!providerUsageStale(status.large.syncedAt) &&
      !providerUsageStale(status.small.syncedAt))
  )
    return status;
  return (await refreshProviderUsage()) ? await readStatusOnce() : status;
}
