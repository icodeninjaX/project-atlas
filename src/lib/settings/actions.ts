"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Keep your display name under 80 characters."),
  debtStrategy: z.enum(["avalanche", "snowball", "priority"]),
  homeRoute: z.enum([
    "/dashboard",
    "/tasks",
    "/money/accounts",
    "/money/transactions",
    "/debts",
    "/career",
    "/reviews",
  ]),
  defaultTaskPriority: z.enum(["low", "medium", "high", "critical"]),
  defaultTaskEstimatedMinutes: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(1440)])
    .transform((value) => (value === "" ? null : value)),
  defaultAccountId: z
    .union([z.literal(""), z.string().uuid()])
    .transform((value) => value || null),
});

export type SettingsState = { success: boolean; message: string };

export async function saveSettingsAction(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const values = settingsSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    debtStrategy: String(formData.get("debtStrategy") ?? ""),
    homeRoute: String(formData.get("homeRoute") ?? ""),
    defaultTaskPriority: String(formData.get("defaultTaskPriority") ?? ""),
    defaultTaskEstimatedMinutes: String(
      formData.get("defaultTaskEstimatedMinutes") ?? "",
    ),
    defaultAccountId: String(formData.get("defaultAccountId") ?? ""),
  });
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your preferences.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Connect Supabase before saving preferences.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Your session expired. Log in again." };
  }

  if (values.data.defaultAccountId) {
    const { data: account } = await supabase
      .from("financial_accounts")
      .select("id")
      .eq("id", values.data.defaultAccountId)
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .maybeSingle();
    if (!account) {
      return {
        success: false,
        message: "Choose an active account that belongs to you.",
      };
    }
  }

  const [profileResult, preferencesResult] = await Promise.all([
    supabase
      .from("profiles")
      .update({ display_name: values.data.displayName || null })
      .eq("id", user.id),
    supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        debt_strategy: values.data.debtStrategy,
        home_route: values.data.homeRoute,
        default_task_priority: values.data.defaultTaskPriority,
        default_task_estimated_minutes: values.data.defaultTaskEstimatedMinutes,
        default_account_id: values.data.defaultAccountId,
      },
      { onConflict: "user_id" },
    ),
  ]);

  if (profileResult.error || preferencesResult.error) {
    return {
      success: false,
      message: "Your preferences could not be saved. Try again.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/debts");
  revalidatePath("/tasks");
  revalidatePath("/money/transactions");
  return { success: true, message: "Preferences saved." };
}
