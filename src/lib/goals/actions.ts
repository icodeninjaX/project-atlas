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
    progressPercent: Number(formData.get("progressPercent") || 0),
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
    progress_percent: result.data.progressPercent,
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
    progressPercent: Number(formData.get("progressPercent") || 0),
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
      progress_percent: result.data.progressPercent,
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

export async function updateGoalProgressAction(
  formData: FormData,
): Promise<GoalActionState> {
  const id = String(formData.get("goalId") ?? "");
  const progress = Number(formData.get("progress"));
  const status = String(formData.get("status") ?? "active");
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !Number.isInteger(progress) ||
    progress < 0 ||
    progress > 100 ||
    !["active", "paused", "completed", "abandoned"].includes(status)
  )
    return { success: false, message: "Choose valid goal progress." };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("goals")
    .update({ progress_percent: progress, status })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "Goal progress could not be updated." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Goal progress updated." };
}

export async function createMilestoneAction(
  formData: FormData,
): Promise<GoalActionState> {
  const goalId = String(formData.get("goalId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(goalId) || !title || title.length > 160)
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
    target_date: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
  });
  if (error)
    return { success: false, message: "The milestone could not be added." };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, message: "Milestone added." };
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
