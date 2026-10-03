import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { explicitGraphPairs } from "@/lib/graph/registry";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GoalLinkableType =
  "knowledge_concept" | "debt" | "job_application" | "transaction";

/** The optional goal a create form asked to link, or null when none was chosen. */
export function relatedGoalIdFrom(formData: FormData) {
  const value = String(formData.get("relatedGoalId") ?? "").trim();
  return uuidPattern.test(value) ? value : null;
}

/**
 * Links a just-created record to the goal chosen in its form. The record is
 * already saved, so a failed link is reported rather than undoing the create.
 */
export async function linkCreatedRecordToGoal(
  client: SupabaseClient,
  ownerId: string,
  sourceType: GoalLinkableType,
  sourceId: string,
  goalId: string | null,
): Promise<{ linked: boolean; failed: boolean }> {
  if (!goalId) return { linked: false, failed: false };
  const pair = explicitGraphPairs.find(
    (candidate) =>
      candidate.source === sourceType && candidate.target === "goal",
  );
  if (!pair || !uuidPattern.test(sourceId))
    return { linked: false, failed: true };
  const { error } = await client.from("atlas_relationships").insert({
    user_id: ownerId,
    source_type: sourceType,
    source_id: sourceId,
    target_type: "goal",
    target_id: goalId,
    relationship_type: pair.kind,
  });
  // A replayed offline create may already carry its link.
  if (error && error.code !== "23505") return { linked: false, failed: true };
  return { linked: true, failed: false };
}

export function withGoalLinkMessage(
  message: string,
  result: { linked: boolean; failed: boolean },
) {
  if (result.failed)
    return `${message} It could not be linked to the goal; add it from the goal's related items.`;
  if (result.linked) return `${message} Linked to your goal.`;
  return message;
}
