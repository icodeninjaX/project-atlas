import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  parseHistoricalMetrics,
  type HistoricalMetric,
  type MetricGrain,
} from "./metrics";

export async function loadHistoricalMetrics(
  input: { from: string; through: string; grain: MetricGrain },
  client?: SupabaseClient,
): Promise<HistoricalMetric[] | null> {
  const db = client ?? (await createClient());
  if (!db) return null;
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) return null;
  const { data, error } = await db.rpc("atlas_historical_metrics", {
    p_from: input.from,
    p_through: input.through,
    p_grain: input.grain,
  });
  if (error) throw new Error("Historical metrics are unavailable.");
  return parseHistoricalMetrics(data, input);
}
