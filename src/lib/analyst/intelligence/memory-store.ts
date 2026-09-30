import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MEMORY_LIMITS, memoryCutoff, memoryText, type Memory } from "./memory";

/**
 * Owner-scoped storage of Analyst priorities (`analyst_memories`). Every call
 * filters by the signed-in owner on top of row-level security. Reading also
 * forgets priorities that have not come up for 90 days.
 */

const row = z.object({
  id: z.uuid(),
  text: z.string(),
  last_mentioned_at: z.string(),
});

const toMemory = (item: z.infer<typeof row>): Memory => ({
  id: item.id,
  text: item.text,
  lastMentionedAt: item.last_mentioned_at,
});

/** The owner's current priorities, newest mention first; null if unavailable. */
export async function listMemories(
  client: SupabaseClient,
  owner: string,
  now: Date,
): Promise<Memory[] | null> {
  const cutoff = memoryCutoff(now).toISOString();
  // Forgetting is best effort; an old row is never read either way.
  await client
    .from("analyst_memories")
    .delete()
    .eq("user_id", owner)
    .lt("last_mentioned_at", cutoff);
  const result = await client
    .from("analyst_memories")
    .select("id,text,last_mentioned_at")
    .eq("user_id", owner)
    .gte("last_mentioned_at", cutoff)
    .order("last_mentioned_at", { ascending: false })
    .limit(MEMORY_LIMITS.items);
  if (result.error) return null;
  const parsed = z.array(row).safeParse(result.data ?? []);
  return parsed.success ? parsed.data.map(toMemory) : null;
}

export type SaveResult =
  | { status: "saved"; memory: Memory }
  | { status: "invalid" | "full" | "duplicate" | "unavailable" };

/** Saves one confirmed priority for the owner. */
export async function saveMemory(
  client: SupabaseClient,
  owner: string,
  raw: unknown,
  now: Date,
): Promise<SaveResult> {
  const text = memoryText(raw);
  if (!text) return { status: "invalid" };
  const current = await listMemories(client, owner, now);
  if (!current) return { status: "unavailable" };
  if (
    current.some(
      (item) => item.text.toLocaleLowerCase() === text.toLocaleLowerCase(),
    )
  )
    return { status: "duplicate" };
  if (current.length >= MEMORY_LIMITS.items) return { status: "full" };
  const result = await client
    .from("analyst_memories")
    .insert({ user_id: owner, text })
    .select("id,text,last_mentioned_at")
    .single();
  if (result.error)
    return {
      status: result.error.code === "23514" ? "full" : "unavailable",
    };
  const parsed = row.safeParse(result.data);
  return parsed.success
    ? { status: "saved", memory: toMemory(parsed.data) }
    : { status: "unavailable" };
}

/** Deletes one of the owner's priorities; true when the request succeeded. */
export async function deleteMemory(
  client: SupabaseClient,
  owner: string,
  id: string,
): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  const result = await client
    .from("analyst_memories")
    .delete()
    .eq("user_id", owner)
    .eq("id", id);
  return !result.error;
}

/** Marks priorities as having come up now, so they are kept longer. */
export async function touchMemories(
  client: SupabaseClient,
  owner: string,
  ids: readonly string[],
  now: Date,
) {
  if (ids.length === 0) return;
  await client
    .from("analyst_memories")
    .update({ last_mentioned_at: now.toISOString() })
    .eq("user_id", owner)
    .in("id", [...ids]);
}
