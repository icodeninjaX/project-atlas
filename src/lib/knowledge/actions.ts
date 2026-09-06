"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  knowledgeConceptSchema,
  knowledgeReviewSchema,
} from "@/lib/validation/schemas";

export type KnowledgeActionState = { success: boolean; message: string };

async function authenticatedClient() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

export async function createKnowledgeConceptAction(
  _state: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const context = await authenticatedClient();
  if (!context) return { success: false, message: "Your session expired." };
  const result = knowledgeConceptSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    category: formData.get("category"),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    example: formData.get("example"),
    personalExplanation: formData.get("personalExplanation"),
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the concept.",
    };
  }
  const { error } = await context.supabase.from("knowledge_concepts").insert({
    user_id: context.user.id,
    title: result.data.title,
    notes: result.data.notes,
    category: result.data.category,
    tags: result.data.tags,
    example: result.data.example ?? null,
    personal_explanation: result.data.personalExplanation ?? null,
  });
  if (error)
    return { success: false, message: "The concept could not be saved." };
  revalidatePath("/knowledge");
  revalidatePath("/search");
  return { success: true, message: "Concept added to your library." };
}

function parseConceptForm(formData: FormData) {
  return knowledgeConceptSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    category: formData.get("category"),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    example: formData.get("example"),
    personalExplanation: formData.get("personalExplanation"),
  });
}

export async function updateKnowledgeConceptAction(
  _state: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const conceptId = String(formData.get("conceptId") ?? "");
  const result = parseConceptForm(formData);
  if (!/^[0-9a-f-]{36}$/i.test(conceptId) || !result.success)
    return {
      success: false,
      message: result.success
        ? "The concept could not be found."
        : (result.error.issues[0]?.message ?? "Check the concept."),
    };
  const context = await authenticatedClient();
  if (!context) return { success: false, message: "Your session expired." };
  const { error } = await context.supabase
    .from("knowledge_concepts")
    .update({
      title: result.data.title,
      notes: result.data.notes,
      category: result.data.category,
      tags: result.data.tags,
      example: result.data.example ?? null,
      personal_explanation: result.data.personalExplanation ?? null,
    })
    .eq("id", conceptId)
    .eq("user_id", context.user.id);
  if (error)
    return { success: false, message: "The concept could not be updated." };
  revalidatePath("/knowledge");
  revalidatePath("/search");
  return { success: true, message: "Concept updated." };
}

export async function reviewKnowledgeConceptAction(
  _state: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const result = knowledgeReviewSchema.safeParse({
    conceptId: formData.get("conceptId"),
    outcome: formData.get("outcome"),
    recalledAnswer: formData.get("recalledAnswer"),
  });
  if (!result.success)
    return { success: false, message: "Choose a valid review outcome." };
  const context = await authenticatedClient();
  if (!context) return { success: false, message: "Your session expired." };
  const { error } = await context.supabase.rpc("review_knowledge_concept", {
    p_concept_id: result.data.conceptId,
    p_outcome: result.data.outcome,
    p_recalled_answer: result.data.recalledAnswer ?? null,
  });
  if (error)
    return { success: false, message: "The review could not be recorded." };
  revalidatePath("/knowledge");
  revalidatePath("/settings/activity");
  return {
    success: true,
    message: "Review recorded. Your schedule is updated.",
  };
}

export async function setKnowledgeConceptArchivedAction(
  _state: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const conceptId = String(formData.get("conceptId") ?? "");
  const archived = formData.get("archived") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(conceptId))
    return { success: false, message: "The concept could not be found." };
  const context = await authenticatedClient();
  if (!context) return { success: false, message: "Your session expired." };
  const { error } = await context.supabase
    .from("knowledge_concepts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", conceptId)
    .eq("user_id", context.user.id);
  if (error)
    return { success: false, message: "The concept could not be updated." };
  revalidatePath("/knowledge");
  revalidatePath("/search");
  return {
    success: true,
    message: archived ? "Concept archived." : "Concept restored.",
  };
}
