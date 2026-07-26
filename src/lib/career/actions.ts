"use server";

import { revalidatePath } from "next/cache";
import { pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { jobApplicationSchema } from "@/lib/validation/schemas";

export type CareerActionState = { success: boolean; message: string };

function optionalMoney(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? pesoInputToCentavos(text) : undefined;
}

export async function createApplicationAction(
  _state: CareerActionState,
  formData: FormData,
): Promise<CareerActionState> {
  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };
  let salaryMinCentavos: number | undefined;
  let salaryMaxCentavos: number | undefined;
  try {
    salaryMinCentavos = optionalMoney(formData.get("salaryMin"));
    salaryMaxCentavos = optionalMoney(formData.get("salaryMax"));
  } catch {
    return { success: false, message: "Enter valid salary amounts." };
  }
  const appliedDate = String(formData.get("appliedAt") ?? "");
  const nextActionDate = String(formData.get("nextActionAt") ?? "");
  const result = jobApplicationSchema.safeParse({
    companyName: formData.get("companyName"),
    roleTitle: formData.get("roleTitle"),
    jobUrl: formData.get("jobUrl") || undefined,
    location: formData.get("location"),
    workSetup: formData.get("workSetup"),
    employmentType: formData.get("employmentType"),
    salaryMinCentavos,
    salaryMaxCentavos,
    stage: formData.get("stage"),
    appliedAt: appliedDate
      ? new Date(`${appliedDate}T12:00:00+08:00`).toISOString()
      : undefined,
    nextAction: formData.get("nextAction"),
    nextActionAt: nextActionDate
      ? new Date(`${nextActionDate}T09:00:00+08:00`).toISOString()
      : undefined,
    resumeVersion: formData.get("resumeVersion"),
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the application.",
    };
  const value = result.data;
  const { error } = await supabase.from("job_applications").insert({
    user_id: user.id,
    company_name: value.companyName,
    role_title: value.roleTitle,
    job_url: value.jobUrl ?? null,
    location: value.location ?? null,
    work_setup: value.workSetup,
    employment_type: value.employmentType,
    salary_min_centavos: value.salaryMinCentavos ?? null,
    salary_max_centavos: value.salaryMaxCentavos ?? null,
    stage: value.stage,
    applied_at: value.appliedAt ?? null,
    next_action: value.nextAction ?? null,
    next_action_at: value.nextActionAt ?? null,
    resume_version: value.resumeVersion ?? null,
    notes: value.notes ?? null,
  });
  if (error)
    return { success: false, message: "The application could not be saved." };
  revalidatePath("/career");
  revalidatePath("/dashboard");
  return { success: true, message: "Application added." };
}

export async function updateApplicationStageAction(formData: FormData) {
  const id = String(formData.get("applicationId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const stages = [
    "interested",
    "preparing",
    "applied",
    "assessment",
    "interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn",
    "accepted",
  ];
  if (!/^[0-9a-f-]{36}$/i.test(id) || !stages.includes(stage)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("job_applications")
    .update({ stage })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/career");
  revalidatePath("/dashboard");
}
