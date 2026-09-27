"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WeeklyInsightPreferenceState = {
  success: boolean;
  message: string;
};

/**
 * Turns on or off preparing last week's insight automatically on /reviews.
 * Turning it on is standing consent to send weekly totals to OpenAI.
 */
export async function setWeeklyInsightAutoAction(
  enabled: boolean,
): Promise<WeeklyInsightPreferenceState> {
  if (typeof enabled !== "boolean")
    return { success: false, message: "Choose on or off." };
  const supabase = await createClient();
  if (!supabase) return { success: false, message: "ATLAS is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { success: false, message: "Your session expired. Log in again." };
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, weekly_insight_auto: enabled },
      { onConflict: "user_id" },
    );
  if (error)
    return {
      success: false,
      message: "The weekly insight setting could not be saved.",
    };
  revalidatePath("/reviews");
  return {
    success: true,
    message: enabled
      ? "Last week's insight will be prepared when you open Weekly reviews."
      : "Automatic weekly insights are off.",
  };
}
