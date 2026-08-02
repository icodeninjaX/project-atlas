"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateApplicationAction,
  type CareerActionState,
} from "@/lib/career/actions";

const initial: CareerActionState = { success: false, message: "" };

function dateValue(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function ApplicationEditForm({
  application,
}: {
  application: {
    id: string;
    company_name: string;
    role_title: string;
    job_url: string | null;
    location: string | null;
    work_setup: string;
    employment_type: string;
    stage: string;
    applied_at: string | null;
    next_action: string | null;
    next_action_at: string | null;
    contact_name: string | null;
    contact_email: string | null;
    resume_version: string | null;
    notes: string | null;
    salary_min_centavos: number | null;
    salary_max_centavos: number | null;
  };
}) {
  const [state, action, pending] = useActionState(
    updateApplicationAction,
    initial,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <details className="mt-3">
      <summary className="text-primary cursor-pointer text-xs font-semibold">
        Edit application
      </summary>
      <form
        action={action}
        className="border-border bg-background mt-3 grid gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="applicationId" value={application.id} />
        <Input
          name="companyName"
          defaultValue={application.company_name}
          required
          aria-label={`Edit ${application.company_name} company name`}
        />
        <Input
          name="roleTitle"
          defaultValue={application.role_title}
          required
          aria-label={`Edit ${application.company_name} role title`}
        />
        <select
          name="stage"
          defaultValue={application.stage}
          aria-label={`Edit ${application.company_name} stage`}
          className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
        >
          <option value="interested">Interested</option>
          <option value="preparing">Preparing</option>
          <option value="applied">Applied</option>
          <option value="assessment">Assessment</option>
          <option value="interview">Interview</option>
          <option value="final_interview">Final interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="accepted">Accepted</option>
        </select>
        <select
          name="workSetup"
          defaultValue={application.work_setup}
          aria-label={`Edit ${application.company_name} work setup`}
          className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
        >
          <option value="unspecified">Setup unspecified</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>
        <select
          name="employmentType"
          defaultValue={application.employment_type}
          aria-label={`Edit ${application.company_name} employment type`}
          className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="freelance">Freelance</option>
          <option value="internship">Internship</option>
          <option value="unspecified">Unspecified</option>
        </select>
        <Input
          name="location"
          defaultValue={application.location ?? ""}
          placeholder="Location"
          aria-label={`Edit ${application.company_name} location`}
        />
        <Input
          name="jobUrl"
          type="url"
          defaultValue={application.job_url ?? ""}
          placeholder="Job link"
          aria-label={`Edit ${application.company_name} job link`}
        />
        <Input
          name="appliedAt"
          type="date"
          defaultValue={dateValue(application.applied_at)}
          aria-label={`Edit ${application.company_name} applied date`}
        />
        <Input
          name="nextAction"
          defaultValue={application.next_action ?? ""}
          placeholder="Next action"
          aria-label={`Edit ${application.company_name} next action`}
        />
        <Input
          name="nextActionAt"
          type="date"
          defaultValue={dateValue(application.next_action_at)}
          aria-label={`Edit ${application.company_name} next action date`}
        />
        <Input
          name="salaryMin"
          defaultValue={
            application.salary_min_centavos != null
              ? String(application.salary_min_centavos / 100)
              : ""
          }
          inputMode="decimal"
          placeholder="Salary min PHP"
          aria-label={`Edit ${application.company_name} minimum salary in pesos`}
        />
        <Input
          name="salaryMax"
          defaultValue={
            application.salary_max_centavos != null
              ? String(application.salary_max_centavos / 100)
              : ""
          }
          inputMode="decimal"
          placeholder="Salary max PHP"
          aria-label={`Edit ${application.company_name} maximum salary in pesos`}
        />
        <Input
          name="contactName"
          defaultValue={application.contact_name ?? ""}
          placeholder="Contact name"
          aria-label={`Edit ${application.company_name} contact name`}
        />
        <Input
          name="contactEmail"
          type="email"
          defaultValue={application.contact_email ?? ""}
          placeholder="Contact email"
          aria-label={`Edit ${application.company_name} contact email`}
        />
        <Input
          name="resumeVersion"
          defaultValue={application.resume_version ?? ""}
          placeholder="Resume version"
          aria-label={`Edit ${application.company_name} resume version`}
        />
        <textarea
          name="notes"
          defaultValue={application.notes ?? ""}
          placeholder="Notes"
          aria-label={`Edit ${application.company_name} notes`}
          className="border-border bg-background min-h-20 rounded-xl border px-3 py-2 text-sm outline-none sm:col-span-2 lg:col-span-3"
        />
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}
