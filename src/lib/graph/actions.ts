"use server";

import { revalidatePath } from "next/cache";
import {
  findExplicitPair,
  isGraphEntityType,
  type GraphEntityType,
  type GraphRelationshipType,
} from "@/lib/graph/registry";
import { searchGraphCandidates } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GraphActionResult = { success: boolean; message: string };

export async function addGraphRelationshipAction(input: {
  sourceType: GraphEntityType;
  sourceId: string;
  targetType: GraphEntityType;
  targetId: string;
  kind: GraphRelationshipType;
}): Promise<GraphActionResult> {
  if (
    !findExplicitPair(input.sourceType, input.targetType, input.kind) ||
    !uuidPattern.test(input.sourceId) ||
    !uuidPattern.test(input.targetId)
  )
    return { success: false, message: "Choose a valid relationship." };
  const supabase = await createClient();
  if (!supabase) return { success: false, message: "Graph is unavailable." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase.from("atlas_relationships").insert({
    user_id: user.id,
    source_type: input.sourceType,
    source_id: input.sourceId,
    target_type: input.targetType,
    target_id: input.targetId,
    relationship_type: input.kind,
  });
  if (error)
    return {
      success: false,
      message:
        error.code === "23505"
          ? "This relationship already exists."
          : "Could not link those items. Check that both still exist.",
    };
  revalidatePath("/goals");
  if (input.targetType === "goal") revalidatePath(`/goals/${input.targetId}`);
  return { success: true, message: "Relationship added." };
}

export async function removeGraphRelationshipAction(
  id: string,
): Promise<GraphActionResult> {
  if (!uuidPattern.test(id))
    return { success: false, message: "Relationship unavailable." };
  const supabase = await createClient();
  if (!supabase) return { success: false, message: "Graph is unavailable." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { data, error } = await supabase
    .from("atlas_relationships")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { success: false, message: "Relationship unavailable." };
  revalidatePath("/goals");
  return { success: true, message: "Relationship removed." };
}

export async function searchGraphCandidatesAction(type: string, query: string) {
  if (!isGraphEntityType(type) || typeof query !== "string") return [];
  return searchGraphCandidates(type, query);
}
