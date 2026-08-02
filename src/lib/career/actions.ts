"use server";

import { revalidatePath } from "next/cache";
import { pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { jobApplicationSchema } from "@/lib/validation/schemas";

export type CareerActionState = { success: boolean; message: string };

const applicationStages = [
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
] as const;

function optionalMoney(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? pesoInputToCentavos(text) : undefined;
}

function applicationValues(formData: FormData) {
  const salaryMinCentavos = optionalMoney(formData.get("salaryMin"));
  const salaryMaxCentavos = optionalMoney(formData.get("salaryMax"));
  const appliedDate = String(formData.get("appliedAt") ?? "");
  const nextActionDate = String(formData.get("nextActionAt") ?? "");

  return jobApplicationSchema.safeParse({
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
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail") || undefined,
    resumeVersion: formData.get("resumeVersion"),
    notes: formData.get("notes"),
  });
}

function applicationRecord(
  value: ReturnType<typeof jobApplicationSchema.parse>,
) {
  return {
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
    contact_name: value.contactName ?? null,
    contact_email: value.contactEmail ?? null,
    resume_version: value.resumeVersion ?? null,
    notes: value.notes ?? null,
  };
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
  let result: ReturnType<typeof jobApplicationSchema.safeParse>;
  try {
    result = applicationValues(formData);
  } catch {
    return { success: false, message: "Enter valid salary amounts." };
  }
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the application.",
    };
  const value = result.data;
  const { error } = await supabase.from("job_applications").insert({
    user_id: user.id,
    ...applicationRecord(value),
  });
  if (error)
    return { success: false, message: "The application could not be saved." };
  revalidatePath("/career");
  revalidatePath("/dashboard");
  return { success: true, message: "Application added." };
}

export async function updateApplicationAction(
  _state: CareerActionState,
  formData: FormData,
): Promise<CareerActionState> {
  const id = String(formData.get("applicationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { success: false, message: "The application could not be found." };

  let result: ReturnType<typeof jobApplicationSchema.safeParse>;
  try {
    result = applicationValues(formData);
  } catch {
    return { success: false, message: "Enter valid salary amounts." };
  }
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the application.",
    };

  const supabase = await createClient();
  if (!supabase)
    return { success: false, message: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session expired." };

  const { error } = await supabase
    .from("job_applications")
    .update(applicationRecord(result.data))
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return { success: false, message: "The application could not be saved." };

  revalidatePath("/career");
  revalidatePath("/dashboard");
  return { success: true, message: "Application updated." };
}

export async function updateApplicationStageAction(formData: FormData) {
  const id = String(formData.get("applicationId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !applicationStages.includes(stage as (typeof applicationStages)[number])
  )
    return;
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
