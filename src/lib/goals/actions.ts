"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema } from "@/lib/validation/schemas";

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

export async function updateGoalProgressAction(formData: FormData) {
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
    return;
  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("goals")
    .update({ progress_percent: progress, status })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
