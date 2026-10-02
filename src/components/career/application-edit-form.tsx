"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BriefcaseBusiness,
  CalendarClock,
  NotebookPen,
  Pencil,
  WalletCards,
  X,
} from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { toast } from "sonner";
import {
  careerDialogContentClass,
  careerDialogFooterClass,
  careerDialogHeaderClass,
  careerDialogOverlayClass,
} from "@/components/career/application-create-dialog";
import {
  FormSection,
  PesoField,
  fieldLabelClass as labelClass,
  fieldSelectClass as selectClass,
  fieldTextareaClass,
} from "@/components/career/application-fields";
import { CompanyMark } from "@/components/career/company-mark";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CareerActionState } from "@/lib/career/actions";
import { careerStages, stageLabel, stageLabels } from "@/lib/career/view";
import { cn } from "@/lib/utils";

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

/** A round pencil, named for the company, that opens the full editor. */
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
  const [open, setOpen] = useState(false);
  const { submit } = useOfflineSync();
  const updateApplication = useCallback(
    async (_state: CareerActionState, formData: FormData) => {
      const result = await submit("application.update", formData);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
      return result;
    },
    [submit],
  );
  const [, action, pending] = useActionState(updateApplication, initial);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Edit ${application.company_name}`}
          title="Edit application"
          className="shrink-0 rounded-full sm:size-9"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={careerDialogOverlayClass} />
        <Dialog.Content className={careerDialogContentClass}>
          <header className={careerDialogHeaderClass}>
            <div className="flex min-w-0 items-start gap-3.5">
              <CompanyMark
                name={application.company_name}
                size="lg"
                className="max-[359px]:hidden"
              />
              <div className="min-w-0">
                <p className="text-primary text-[11px] font-semibold tracking-[0.12em] uppercase">
                  {stageLabel(application.stage)} · Application details
                </p>
                <Dialog.Title className="mt-1 truncate text-xl font-semibold tracking-[-0.025em]">
                  Edit {application.company_name}
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                  Keep the role, progress, and next move up to date.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Close ${application.company_name} editor`}
                className="shrink-0 rounded-full"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>

          <form action={action} className="px-4 pt-4 sm:px-6 sm:pt-6">
            <input type="hidden" name="applicationId" value={application.id} />

            <div className="space-y-4">
              <FormSection
                icon={BriefcaseBusiness}
                title="Role details"
                description="The opportunity and where it stands today."
              >
                <label className={labelClass}>
                  Company name
                  <Input
                    name="companyName"
                    defaultValue={application.company_name}
                    required
                    maxLength={160}
                    aria-label={`Edit ${application.company_name} company name`}
                    className="mt-1.5"
                  />
                </label>
                <label className={labelClass}>
                  Role title
                  <Input
                    name="roleTitle"
                    defaultValue={application.role_title}
                    required
                    maxLength={160}
                    aria-label={`Edit ${application.company_name} role title`}
                    className="mt-1.5"
                  />
                </label>
                <label className={labelClass}>
                  Application stage
                  <select
                    name="stage"
                    defaultValue={application.stage}
                    aria-label={`Edit ${application.company_name} stage`}
                    className={selectClass}
                  >
                    {careerStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stageLabels[stage]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Work setup
                  <select
                    name="workSetup"
                    defaultValue={application.work_setup}
                    aria-label={`Edit ${application.company_name} work setup`}
                    className={selectClass}
                  >
                    <option value="unspecified">Setup unspecified</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Employment type
                  <select
                    name="employmentType"
                    defaultValue={application.employment_type}
                    aria-label={`Edit ${application.company_name} employment type`}
                    className={selectClass}
                  >
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                    <option value="internship">Internship</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Location
                  <Input
                    name="location"
                    defaultValue={application.location ?? ""}
                    maxLength={120}
                    placeholder="e.g. Makati or Remote"
                    aria-label={`Edit ${application.company_name} location`}
                    className="mt-1.5"
                  />
                </label>
                <label className={labelClass}>
                  Job posting link
                  <Input
                    name="jobUrl"
                    type="url"
                    defaultValue={application.job_url ?? ""}
                    placeholder="https://…"
                    aria-label={`Edit ${application.company_name} job link`}
                    className="mt-1.5"
                  />
                </label>
                <div>
                  <label
                    htmlFor={`edit-${application.id}-applied-at`}
                    className={labelClass}
                  >
                    Date applied
                  </label>
                  <Input
                    id={`edit-${application.id}-applied-at`}
                    name="appliedAt"
                    type="date"
                    defaultValue={dateValue(application.applied_at)}
                    aria-label={`Edit ${application.company_name} applied date`}
                    className="mt-1.5"
                  />
                </div>
              </FormSection>

              <FormSection
                icon={CalendarClock}
                title="Next move"
                description="One concrete step and when you will take it, so the application never goes quiet."
              >
                <label className={labelClass}>
                  Next action
                  <Input
                    name="nextAction"
                    defaultValue={application.next_action ?? ""}
                    maxLength={200}
                    placeholder="e.g. Follow up with recruiter"
                    aria-label={`Edit ${application.company_name} next action`}
                    className="mt-1.5"
                  />
                </label>
                <div>
                  <label
                    htmlFor={`edit-${application.id}-next-action-at`}
                    className={labelClass}
                  >
                    Next action due date
                  </label>
                  <Input
                    id={`edit-${application.id}-next-action-at`}
                    name="nextActionAt"
                    type="date"
                    defaultValue={dateValue(application.next_action_at)}
                    aria-label={`Edit ${application.company_name} next action date`}
                    className="mt-1.5"
                  />
                </div>
              </FormSection>

              <FormSection
                icon={WalletCards}
                title="Compensation"
                description="Optional monthly salary range in Philippine pesos."
              >
                <PesoField
                  label="Minimum salary (PHP)"
                  name="salaryMin"
                  defaultValue={
                    application.salary_min_centavos != null
                      ? String(application.salary_min_centavos / 100)
                      : ""
                  }
                  placeholder="50,000"
                  aria-label={`Edit ${application.company_name} minimum salary in pesos`}
                />
                <PesoField
                  label="Maximum salary (PHP)"
                  name="salaryMax"
                  defaultValue={
                    application.salary_max_centavos != null
                      ? String(application.salary_max_centavos / 100)
                      : ""
                  }
                  placeholder="70,000"
                  aria-label={`Edit ${application.company_name} maximum salary in pesos`}
                />
              </FormSection>

              <FormSection
                icon={NotebookPen}
                title="Contact & notes"
                description="Who you are talking to, and anything worth remembering."
              >
                <label className={labelClass}>
                  Contact name
                  <Input
                    name="contactName"
                    defaultValue={application.contact_name ?? ""}
                    maxLength={160}
                    placeholder="e.g. Recruiter or hiring manager"
                    aria-label={`Edit ${application.company_name} contact name`}
                    className="mt-1.5"
                  />
                </label>
                <label className={labelClass}>
                  Contact email
                  <Input
                    name="contactEmail"
                    type="email"
                    defaultValue={application.contact_email ?? ""}
                    placeholder="name@company.com"
                    aria-label={`Edit ${application.company_name} contact email`}
                    className="mt-1.5"
                  />
                </label>
                <label className={labelClass}>
                  Resume version
                  <Input
                    name="resumeVersion"
                    defaultValue={application.resume_version ?? ""}
                    maxLength={80}
                    placeholder="e.g. Frontend v2"
                    aria-label={`Edit ${application.company_name} resume version`}
                    className="mt-1.5"
                  />
                </label>
                <label className={cn(labelClass, "sm:col-span-2")}>
                  Notes
                  <textarea
                    name="notes"
                    defaultValue={application.notes ?? ""}
                    maxLength={4000}
                    placeholder="Add useful details about the role or company"
                    aria-label={`Edit ${application.company_name} notes`}
                    className={fieldTextareaClass}
                  />
                </label>
              </FormSection>
            </div>

            <footer className={cn(careerDialogFooterClass, "mt-5 flex gap-2")}>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                pending={pending}
                pendingLabel="Saving…"
                className="flex-1 sm:ml-auto sm:flex-none"
              >
                Save changes
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
