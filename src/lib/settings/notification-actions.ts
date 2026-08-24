"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ReminderState = { success: boolean; message: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const reminderSchema = z.object({
  remindersEnabled: z.boolean(),
  taskReminders: z.boolean(),
  debtReminders: z.boolean(),
  paydayReminders: z.boolean(),
  reviewReminders: z.boolean(),
  quietHoursStart: z.string().regex(timePattern),
  quietHoursEnd: z.string().regex(timePattern),
});

const subscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

async function authenticatedClient() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveReminderPreferencesAction(
  _state: ReminderState,
  formData: FormData,
): Promise<ReminderState> {
  const values = reminderSchema.safeParse({
    remindersEnabled: formData.get("remindersEnabled") === "on",
    taskReminders: formData.get("taskReminders") === "on",
    debtReminders: formData.get("debtReminders") === "on",
    paydayReminders: formData.get("paydayReminders") === "on",
    reviewReminders: formData.get("reviewReminders") === "on",
    quietHoursStart: String(formData.get("quietHoursStart") ?? ""),
    quietHoursEnd: String(formData.get("quietHoursEnd") ?? ""),
  });
  if (!values.success) {
    return { success: false, message: "Check the reminder schedule." };
  }

  const { supabase, user } = await authenticatedClient();
  if (!supabase || !user) {
    return { success: false, message: "Your session expired. Log in again." };
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      reminders_enabled: values.data.remindersEnabled,
      task_reminders: values.data.taskReminders,
      debt_reminders: values.data.debtReminders,
      payday_reminders: values.data.paydayReminders,
      review_reminders: values.data.reviewReminders,
      quiet_hours_start: values.data.quietHoursStart,
      quiet_hours_end: values.data.quietHoursEnd,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return {
      success: false,
      message: "Reminder preferences could not be saved.",
    };
  }

  if (!values.data.remindersEnabled) {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }

  revalidatePath("/settings");
  return {
    success: true,
    message: values.data.remindersEnabled
      ? "ATLAS reminders are enabled for this device."
      : "Reminders are turned off.",
  };
}

export async function savePushSubscriptionAction(subscription: unknown) {
  const values = subscriptionSchema.safeParse(subscription);
  if (!values.success) {
    return { success: false, message: "The browser subscription is invalid." };
  }
  const { supabase, user } = await authenticatedClient();
  if (!supabase || !user) {
    return { success: false, message: "Your session expired. Log in again." };
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: values.data.endpoint,
      p256dh: values.data.keys.p256dh,
      auth: values.data.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  return error
    ? { success: false, message: "This device could not be subscribed." }
    : { success: true, message: "This device is subscribed." };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const endpointValue = z.url().max(2048).safeParse(endpoint);
  if (!endpointValue.success) return { success: false };
  const { supabase, user } = await authenticatedClient();
  if (!supabase || !user) return { success: false };
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpointValue.data);
  return { success: !error };
}
