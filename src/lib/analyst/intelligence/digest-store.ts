import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/database.types";
import { digestRowSchema, type DigestBody } from "./digest";

/**
 * The owner's latest summary. Throws when the store cannot be read, so the
 * caller never runs an analysis it could not remember making.
 */
export async function readDigest(client: SupabaseClient, owner: string) {
  const { data, error } = await client
    .from("analyst_digests")
    .select("day,consent_key,state,body")
    .eq("user_id", owner)
    .maybeSingle();
  if (error) throw new Error("Summary store unavailable.");
  const parsed = digestRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Claims today's summary for the owner under this consent, atomically: true
 * for exactly one of several views arriving at once, false while another
 * holds today's claim or today's summary is kept. Throws when the store is
 * unavailable.
 */
export async function claimDigest(
  client: SupabaseClient,
  row: { day: string; consentKey: string },
) {
  const { data, error } = await client.rpc("claim_analyst_digest", {
    p_day: row.day,
    p_consent_key: row.consentKey,
  });
  if (error || typeof data !== "boolean")
    throw new Error("Summary store unavailable.");
  return data;
}

/** Gives up a claim that did not run, so a later view may try again. */
export async function releaseDigest(client: SupabaseClient, owner: string) {
  await client
    .from("analyst_digests")
    .delete()
    .eq("user_id", owner)
    .eq("state", "running");
}

/** Saves the claimed run's answer as the owner's summary for the day. */
export async function saveDigest(
  client: SupabaseClient,
  owner: string,
  row: { day: string; consentKey: string; body: DigestBody },
) {
  const { error } = await client.from("analyst_digests").upsert(
    {
      user_id: owner,
      day: row.day,
      consent_key: row.consentKey,
      body: row.body as unknown as Json,
      state: "ready",
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Summary could not be saved.");
}
