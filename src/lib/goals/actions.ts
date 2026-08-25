"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema } from "@/lib/validation/schemas";
import { offlineEntityId } from "@/lib/offline/server";

export type GoalActionState = { success: boolean; message: string };

export async function createGoalAction(
  _state: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const result = goalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    area: formData.get("area"),
    status: "active",
    targetDate: formData.get("targetDate") || undefined,
    successDefinition: formData.get("successDefinition"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the goal.",
    };
  const { error } = await supabase.from("goals").insert({
    ...(offlineEntityId(formData) ? { id: offlineEntityId(formData) } : {}),
    user_id: user.id,
    title: result.data.title,
    description: result.data.description ?? null,
    area: result.data.area,
    status: result.data.status,
    target_date: result.data.targetDate ?? null,
    success_definition: result.data.successDefinition ?? null,
  });
  if (error) return { success: false, message: "The goal could not be saved." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Goal created." };
}

export async function updateGoalAction(
  _state: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("goalId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The goal could not be found." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const result = goalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    area: formData.get("area"),
    status: formData.get("status") || "active",
    targetDate: formData.get("targetDate") || undefined,
    successDefinition: formData.get("successDefinition"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the goal.",
    };
  const { error } = await supabase
    .from("goals")
    .update({
      title: result.data.title,
      description: result.data.description ?? null,
      area: result.data.area,
      status: result.data.status,
      target_date: result.data.targetDate ?? null,
      success_definition: result.data.successDefinition ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The goal could not be updated." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Goal updated." };
}

export async function deleteGoalAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("goalId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The goal could not be found." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The goal could not be deleted." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { success: true, message: "Goal deleted." };
}

export async function updateGoalProgressAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("goalId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The goal could not be found." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };

  // Retain compatibility with progress mutations queued by older clients.
  // The database trigger replaces this sentinel with the milestone-derived value.
  const { error } = await supabase
    .from("goals")
    .update({ progress_percent: 0 })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "Goal progress could not be refreshed." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return {
    success: true,
    message: "Goal progress recalculated from milestones.",
  };
}

export async function createMilestoneAction(
  formData: FormData,
): Promise<GoalActionState> {
  const goalId = String(formData.get("goalId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(goalId) ||
    !title ||
    title.length > 160 ||
    description.length > 20_000
  )
    return { success: false, message: "Check the milestone details." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase.from("goal_milestones").insert({
    ...(offlineEntityId(formData) ? { id: offlineEntityId(formData) } : {}),
    user_id: user.id,
    goal_id: goalId,
    title,
    description: description || null,
    target_date: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
  });
  if (error)
    return { success: false, message: "The milestone could not be added." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Milestone added." };
}

export async function updateMilestoneAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("milestoneId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !title ||
    title.length > 160 ||
    description.length > 20_000 ||
    (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate))
  ) {
    return { success: false, message: "Check the milestone details." };
  }
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("goal_milestones")
    .update({
      title,
      description: description || null,
      target_date: targetDate || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The milestone could not be updated." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Milestone updated." };
}

export async function toggleMilestoneAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("milestoneId") ?? "");
  const completed = formData.get("completed") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The milestone could not be found." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("goal_milestones")
    .update({
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The milestone could not be updated." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Milestone updated." };
}

export async function deleteMilestoneAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("milestoneId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The milestone could not be found." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("goal_milestones")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The milestone could not be removed." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Milestone removed." };
}
