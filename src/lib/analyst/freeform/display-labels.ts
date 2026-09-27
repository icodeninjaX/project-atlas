import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";

/** Private display text for an evidence item, shown only to its owner. */
export type DisplayLabel = { title: string; date: string | null };

const manilaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
});
const focusItem = /^getTaskFocus\.tasks\.focus\.\d+\./;

/**
 * Task titles for suggested focus tasks. The model only ever sees "Suggested
 * focus task N"; the owner's titles are added to the response after the answer
 * is generated and checked, so they are never sent to the provider.
 */
export async function focusTaskLabels(
  client: SupabaseClient,
  owner: string,
  evidence: ToolEvidence[],
): Promise<Record<string, DisplayLabel> | undefined> {
  const items = evidence.filter(
    // A ranking from a truncated task sample is not a recommendation to show.
    (item) =>
      focusItem.test(item.id) &&
      item.completeness === "complete" &&
      item.source.recordIds.length === 1,
  );
  if (items.length === 0) return undefined;
  try {
    const { data, error } = await client
      .from("tasks")
      .select("id,title,due_at,scheduled_for")
      .eq("user_id", owner)
      .in(
        "id",
        items.map((item) => item.source.recordIds[0]!),
      );
    if (error || !data) return undefined;
    const rows = data as Array<{
      id: string;
      title: string | null;
      due_at: string | null;
      scheduled_for: string | null;
    }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    const labels: Record<string, DisplayLabel> = {};
    for (const item of items) {
      const row = byId.get(item.source.recordIds[0]!);
      if (!row?.title) continue;
      labels[item.id] = {
        title: row.title,
        date:
          row.scheduled_for ??
          (row.due_at ? manilaDate.format(new Date(row.due_at)) : null),
      };
    }
    return Object.keys(labels).length ? labels : undefined;
  } catch {
    // Labels are a display convenience; the answer stands without them.
    return undefined;
  }
}
