"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function chooseCareerFollowupAction(
  applicationId: string,
  expectedAt: string,
  expectedUpdatedAt: string,
  choice: "dismissed" | "confirmed",
): Promise<{ success: boolean; message: string }> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      applicationId,
    ) ||
    !Number.isFinite(Date.parse(expectedAt)) ||
    !Number.isFinite(Date.parse(expectedUpdatedAt)) ||
    !["dismissed", "confirmed"].includes(choice)
  ) {
    return { success: false, message: "Refresh this recommendation." };
  }
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Recommendations are unavailable." };
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return { success: false, message: "Your session expired." };

  const { data, error } = await supabase.rpc("choose_career_followup", {
    p_application_id: applicationId,
    p_expected_next_action_at: expectedAt,
    p_expected_updated_at: expectedUpdatedAt,
    p_choice: choice,
  });
  if (error)
    return {
      success: false,
      message: "This choice could not be saved. Try again.",
    };
  if (data === "stale")
    return {
      success: false,
      message: "This application changed. Refresh to review it again.",
    };
  if (data === "already_confirmed" || data === "already_dismissed") {
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "This recommendation was already handled.",
    };
  }
  if (data !== choice)
    return { success: false, message: "This choice could not be saved." };
  revalidatePath("/dashboard");
  if (choice === "confirmed") revalidatePath("/tasks");
  return {
    success: true,
    message:
      choice === "confirmed"
        ? "Follow-up task created."
        : "Recommendation dismissed.",
  };
}
