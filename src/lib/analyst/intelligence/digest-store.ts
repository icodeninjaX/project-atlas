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
    .select("day,consent_key,body")
    .eq("user_id", owner)
    .maybeSingle();
  if (error) throw new Error("Summary store unavailable.");
  const parsed = digestRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Replaces the owner's summary with today's. */
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
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Summary could not be saved.");
}
