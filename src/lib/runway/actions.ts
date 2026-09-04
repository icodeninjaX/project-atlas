"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runwayPreferencesSchema } from "@/lib/validation/schemas";

export type RunwayActionState = { success: boolean; message: string };

export async function saveRunwayPreferencesAction(
  _state: RunwayActionState,
  formData: FormData,
): Promise<RunwayActionState> {
  const parsed = runwayPreferencesSchema.safeParse({
    accountIds: formData.getAll("accountId"),
    categoryIds: formData.getAll("categoryId"),
    targetMonths: Number(formData.get("targetMonths")),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check your runway choices.",
    };
  }

  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session has expired." };

  const { error } = await supabase.rpc("save_runway_preferences", {
    p_account_ids: [...new Set(parsed.data.accountIds)],
    p_category_ids: [...new Set(parsed.data.categoryIds)],
    p_target_months: parsed.data.targetMonths,
  });
  if (error)
    return {
      success: false,
      message: "Your runway choices could not be saved. Refresh and try again.",
    };

  revalidatePath("/money/runway");
  revalidatePath("/money/accounts");
  revalidatePath("/money/budget");
  revalidatePath("/dashboard");
  return { success: true, message: "Runway assumptions saved." };
}
