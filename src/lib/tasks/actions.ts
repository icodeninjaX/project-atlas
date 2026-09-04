"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validation/schemas";
import { offlineEntityId } from "@/lib/offline/server";

export type TaskActionState = { success: boolean; message: string };

export async function createTaskAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };

  const result = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("scheduledFor") ? "planned" : "inbox",
    priority: formData.get("priority") || "medium",
    scheduledFor: formData.get("scheduledFor") || undefined,
    scheduledTime: formData.get("scheduledTime") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes")
      ? Number(formData.get("estimatedMinutes"))
      : undefined,
    energyRequired: formData.get("energyRequired") || "medium",
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the task details.",
    };
  }

  const { error } = await supabase.from("tasks").insert({
    ...(offlineEntityId(formData) ? { id: offlineEntityId(formData) } : {}),
    user_id: user.id,
    title: result.data.title,
    description: result.data.description ?? null,
    status: result.data.status,
    priority: result.data.priority,
    scheduled_for: result.data.scheduledFor ?? null,
    scheduled_time: result.data.scheduledTime ?? null,
    estimated_minutes: result.data.estimatedMinutes ?? null,
    energy_required: result.data.energyRequired,
  });
  if (error) return { success: false, message: "The task could not be saved." };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, message: "Task added." };
}

export async function updateTaskAction(
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The task could not be found." };
  const result = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") || "inbox",
    priority: formData.get("priority") || "medium",
    scheduledFor: formData.get("scheduledFor") || undefined,
    scheduledTime: formData.get("scheduledTime") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes")
      ? Number(formData.get("estimatedMinutes"))
      : undefined,
    energyRequired: formData.get("energyRequired") || "medium",
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the task details.",
    };
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const { error } = await supabase
    .from("tasks")
    .update({
      title: result.data.title,
      description: result.data.description ?? null,
      priority: result.data.priority,
      scheduled_for: result.data.scheduledFor ?? null,
      scheduled_time: result.data.scheduledTime ?? null,
      estimated_minutes: result.data.estimatedMinutes ?? null,
      energy_required: result.data.energyRequired,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The task could not be updated." };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, message: "Task updated." };
}

export async function setTaskStatusAction(
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(taskId) ||
    !["completed", "inbox"].includes(status)
  )
    return { success: false, message: "Choose a valid task status." };

  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The task status could not be updated." };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, message: "Task status updated." };
}

export async function deleteTaskAction(
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(taskId))
    return { success: false, message: "The task could not be found." };

  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The task could not be deleted." };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, message: "Task deleted." };
}
