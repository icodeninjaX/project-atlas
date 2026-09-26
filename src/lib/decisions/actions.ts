"use server";

import { revalidatePath } from "next/cache";
import { manilaToday } from "@/lib/analyst/evidence";
import { createClient } from "@/lib/supabase/server";
import {
  decisionSchema,
  observationSchema,
  parseRecordReference,
  observationSourceTypes,
} from "./decision";

export type DecisionActionState = { success: boolean; message: string };

function decisionForm(data: FormData) {
  return decisionSchema.safeParse({
    title: data.get("title"),
    decisionOn: data.get("decisionOn"),
    intent: data.get("intent"),
    expectedOutcome: data.get("expectedOutcome"),
    rationale: data.get("rationale") ?? "",
    assumptions: data.get("assumptions") ?? "",
    reviewOn: data.get("reviewOn"),
    goalId: data.get("goalId") ?? "",
    actionRecord: data.get("actionRecord") ?? "",
    metricKey: data.get("metricKey") ?? "",
  });
}

const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

async function session() {
  const db = await createClient();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  return error || !data.user ? null : { db, userId: data.user.id };
}

export async function saveDecisionAction(
  _state: DecisionActionState,
  data: FormData,
): Promise<DecisionActionState> {
  const parsed = decisionForm(data);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the decision.",
    };
  if (parsed.data.decisionOn > manilaToday(new Date()))
    return {
      success: false,
      message: "Decision date cannot be in the future.",
    };
  const id = data.get("decisionId");
  if (id && !validId(id))
    return { success: false, message: "Decision not found." };
  const auth = await session();
  if (!auth) return { success: false, message: "Sign in to save a decision." };
  const fields = {
    title: parsed.data.title,
    decision_on: parsed.data.decisionOn,
    intent: parsed.data.intent,
    expected_outcome: parsed.data.expectedOutcome,
    rationale: parsed.data.rationale || null,
    assumptions: parsed.data.assumptions || null,
    review_on: parsed.data.reviewOn,
    goal_id: parsed.data.goalId || null,
    action_task_id:
      parseRecordReference(parsed.data.actionRecord, ["task"])?.id ?? null,
    metric_key: parsed.data.metricKey || null,
  };
  if (id) {
    const { data: updated, error } = await auth.db
      .from("decisions")
      .update(fields)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select("id")
      .maybeSingle();
    if (error || !updated)
      return {
        success: false,
        message: "Decision could not be updated. Check the linked goal.",
      };
  } else {
    const { error } = await auth.db
      .from("decisions")
      .insert({ ...fields, user_id: auth.userId });
    if (error)
      return {
        success: false,
        message: "Decision could not be saved. Check the linked goal.",
      };
  }
  revalidatePath("/decisions");
  if (id) revalidatePath(`/decisions/${id}`);
  revalidatePath("/timeline");
  revalidatePath("/goals");
  return {
    success: true,
    message: id ? "Decision updated." : "Decision recorded.",
  };
}

export async function deleteDecisionAction(
  data: FormData,
): Promise<DecisionActionState> {
  const id = data.get("decisionId");
  if (!validId(id)) return { success: false, message: "Decision not found." };
  const auth = await session();
  if (!auth)
    return { success: false, message: "Sign in to delete a decision." };
  const { data: deleted, error } = await auth.db
    .from("decisions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();
  if (error || !deleted)
    return { success: false, message: "Decision could not be deleted." };
  revalidatePath("/decisions");
  revalidatePath("/timeline");
  revalidatePath("/goals");
  return { success: true, message: "Decision deleted." };
}

export async function saveObservationAction(
  _state: DecisionActionState,
  data: FormData,
): Promise<DecisionActionState> {
  const decisionId = data.get("decisionId");
  const observationId = data.get("observationId");
  if (!validId(decisionId) || (observationId && !validId(observationId)))
    return { success: false, message: "Observation not found." };
  const parsed = observationSchema.safeParse({
    observedOn: data.get("observedOn"),
    note: data.get("note"),
    sourceRecord: data.get("sourceRecord") ?? "",
  });
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the observation.",
    };
  if (parsed.data.observedOn > manilaToday(new Date()))
    return {
      success: false,
      message: "Observation date cannot be in the future.",
    };
  const auth = await session();
  if (!auth)
    return { success: false, message: "Sign in to save an observation." };
  const { data: decision } = await auth.db
    .from("decisions")
    .select("decision_on")
    .eq("id", decisionId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!decision || parsed.data.observedOn < decision.decision_on)
    return {
      success: false,
      message: "Observation must follow your decision.",
    };
  const fields = {
    observed_on: parsed.data.observedOn,
    note: parsed.data.note,
    source_task_id: null as string | null,
    source_transaction_id: null as string | null,
    source_application_id: null as string | null,
  };
  const source = parseRecordReference(
    parsed.data.sourceRecord,
    observationSourceTypes,
  );
  if (source?.type === "task") fields.source_task_id = source.id;
  if (source?.type === "transaction") fields.source_transaction_id = source.id;
  if (source?.type === "job_application")
    fields.source_application_id = source.id;
  if (observationId) {
    const { data: updated, error } = await auth.db
      .from("decision_observations")
      .update(fields)
      .eq("id", observationId)
      .eq("decision_id", decisionId)
      .eq("user_id", auth.userId)
      .select("id")
      .maybeSingle();
    if (error || !updated)
      return { success: false, message: "Observation could not be updated." };
  } else {
    const { error } = await auth.db
      .from("decision_observations")
      .insert({ ...fields, decision_id: decisionId, user_id: auth.userId });
    if (error)
      return { success: false, message: "Observation could not be saved." };
  }
  revalidatePath(`/decisions/${decisionId}`);
  revalidatePath("/timeline");
  return {
    success: true,
    message: observationId ? "Observation updated." : "Observation added.",
  };
}

export async function deleteObservationAction(
  data: FormData,
): Promise<DecisionActionState> {
  const decisionId = data.get("decisionId");
  const observationId = data.get("observationId");
  if (!validId(decisionId) || !validId(observationId))
    return { success: false, message: "Observation not found." };
  const auth = await session();
  if (!auth)
    return { success: false, message: "Sign in to delete an observation." };
  const { data: deleted, error } = await auth.db
    .from("decision_observations")
    .delete()
    .eq("id", observationId)
    .eq("decision_id", decisionId)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();
  if (error || !deleted)
    return { success: false, message: "Observation could not be deleted." };
  revalidatePath(`/decisions/${decisionId}`);
  revalidatePath("/timeline");
  return { success: true, message: "Observation deleted." };
}
