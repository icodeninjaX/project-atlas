import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DIAGNOSTICS_DAYS,
  cleanDiagnostics,
  type RunDiagnostics,
} from "./diagnostics";

/**
 * Saves one answer's diagnostics for its owner and forgets the owner's
 * records older than 14 days. Best effort: a failure never affects the
 * answer, and a record that does not fit the codes-only shape is not saved.
 */
export async function recordDiagnostics(
  client: SupabaseClient,
  owner: string,
  raw: Omit<RunDiagnostics, "durationMs">,
  durationMs: number,
  now: Date,
) {
  const detail = cleanDiagnostics({ ...raw, durationMs });
  if (!detail) return;
  const cutoff = new Date(now.getTime() - DIAGNOSTICS_DAYS * 86_400_000);
  await client
    .from("analyst_run_diagnostics")
    .delete()
    .eq("user_id", owner)
    .lt("created_at", cutoff.toISOString());
  await client.from("analyst_run_diagnostics").insert({
    user_id: owner,
    status: detail.status,
    outcome: detail.outcome,
    duration_ms: detail.durationMs,
    detail,
  });
}
