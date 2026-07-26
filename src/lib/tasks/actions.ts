"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validation/schemas";

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
    estimatedMinutes: formData.get("estimatedMinutes")
      ? Number(formData.get("estimatedMinutes"))
      : undefined,
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the task details.",
    };
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: result.data.title,
    description: result.data.description ?? null,
    status: result.data.status,
    priority: result.data.priority,
    scheduled_for: result.data.scheduledFor ?? null,
    estimated_minutes: result.data.estimatedMinutes ?? null,
  });
  if (error) return { success: false, message: "The task could not be saved." };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, message: "Task added." };
}

export async function updateTaskAction(formData: FormData) {
  const id = String(formData.get("taskId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const result = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") || "inbox",
    priority: formData.get("priority") || "medium",
    scheduledFor: formData.get("scheduledFor") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes")
      ? Number(formData.get("estimatedMinutes"))
      : undefined,
  });
  if (!result.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("tasks")
    .update({
      title: result.data.title,
      description: result.data.description ?? null,
      priority: result.data.priority,
      scheduled_for: result.data.scheduledFor ?? null,
      estimated_minutes: result.data.estimatedMinutes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function setTaskStatusAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(taskId) ||
    !["completed", "inbox"].includes(status)
  )
    return;

  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return;

  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
