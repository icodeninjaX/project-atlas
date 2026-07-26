"use server";

import { redirect } from "next/navigation";
import { pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/schemas";

export type OnboardingState = { success: boolean; message: string };

export async function completeOnboardingAction(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Connect Supabase before completing onboarding.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { success: false, message: "Your session expired. Log in again." };

  let currentCashCentavos: number;
  let monthlyNetIncomeCentavos: number;
  try {
    currentCashCentavos = pesoInputToCentavos(
      String(formData.get("currentCash") || "0"),
    );
    monthlyNetIncomeCentavos = pesoInputToCentavos(
      String(formData.get("monthlyNetIncome") || "0"),
    );
  } catch {
    return {
      success: false,
      message: "Enter valid peso amounts with at most two decimal places.",
    };
  }

  const goals = ["goal1", "goal2", "goal3"]
    .map((key) => String(formData.get(key) ?? "").trim())
    .filter(Boolean);
  const values = onboardingSchema.safeParse({
    displayName: String(formData.get("displayName") ?? "").trim() || undefined,
    currentCashCentavos,
    monthlyNetIncomeCentavos,
    nextPayday: String(formData.get("nextPayday") ?? "") || undefined,
    goals,
  });
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: values.data.displayName ?? null,
    p_current_cash_centavos: values.data.currentCashCentavos,
    p_monthly_net_income_centavos: values.data.monthlyNetIncomeCentavos,
    p_next_payday: values.data.nextPayday ?? null,
    p_goals: values.data.goals,
  });
  if (error) {
    return {
      success: false,
      message:
        "Onboarding could not be saved. Check the database migration and try again.",
    };
  }

  redirect("/dashboard");
}
