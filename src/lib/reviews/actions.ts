"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { weeklyReviewSchema } from "@/lib/validation/schemas";

export type ReviewActionState = { success: boolean; message: string };

function optionalScore(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return text ? Number(text) : undefined;
}

export async function saveWeeklyReviewAction(
  _state: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  const submitted = formData.get("intent") === "submit";
  const result = weeklyReviewSchema.safeParse({
    weekStart: formData.get("weekStart"),
    wins: formData.get("wins"),
    challenges: formData.get("challenges"),
    lessons: formData.get("lessons"),
    timeWasters: formData.get("timeWasters"),
    moneyReflection: formData.get("moneyReflection"),
    careerReflection: formData.get("careerReflection"),
    nextWeekFocus: formData.get("nextWeekFocus"),
    energyScore: optionalScore(formData.get("energyScore")),
    stressScore: optionalScore(formData.get("stressScore")),
    overallScore: optionalScore(formData.get("overallScore")),
    submitted,
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the review.",
    };
  const value = result.data;
  const { error } = await supabase.from("weekly_reviews").upsert(
    {
      user_id: user.id,
      week_start: value.weekStart,
      wins: value.wins ?? null,
      challenges: value.challenges ?? null,
      lessons: value.lessons ?? null,
      time_wasters: value.timeWasters ?? null,
      money_reflection: value.moneyReflection ?? null,
      career_reflection: value.careerReflection ?? null,
      next_week_focus: value.nextWeekFocus ?? null,
      energy_score: value.energyScore ?? null,
      stress_score: value.stressScore ?? null,
      overall_score: value.overallScore ?? null,
      completed_at: value.submitted ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,week_start" },
  );
  if (error)
    return { success: false, message: "The review could not be saved." };
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  return {
    success: true,
    message: submitted ? "Weekly review submitted." : "Draft saved.",
  };
}
