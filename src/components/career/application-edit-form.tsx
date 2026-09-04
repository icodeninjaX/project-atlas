"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CareerActionState } from "@/lib/career/actions";
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

const labelClass = "text-muted-foreground text-xs font-medium";
const selectClass =
  "border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const sectionClass =
  "border-border/80 bg-card/35 rounded-2xl border p-4 sm:p-5";

export function ApplicationEditForm({
  application,
  compact = false,
  triggerClassName,
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
  compact?: boolean;
  triggerClassName?: string;
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
          variant={compact ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            compact
              ? "min-h-11 w-full justify-center rounded-xl px-3"
              : "text-primary -ml-3 justify-start",
            triggerClassName,
          )}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {compact ? "Edit details" : "Edit application"}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="bg-background fixed inset-0 z-50 overflow-y-auto outline-none sm:inset-6 sm:left-1/2 sm:max-w-3xl sm:-translate-x-1/2 sm:rounded-3xl sm:border lg:inset-y-10">
          <header className="border-border bg-background/95 sticky top-0 z-20 flex items-start justify-between gap-4 border-b px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur sm:rounded-t-3xl sm:px-6 sm:pt-5">
            <div className="min-w-0">
              <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.15em] uppercase">
                Application details
              </p>
              <Dialog.Title className="mt-1 truncate text-xl font-semibold tracking-[-0.025em]">
                Edit {application.company_name}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                Keep the role, progress, and next move up to date.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Close ${application.company_name} editor`}
                className="shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>

          <form action={action} className="px-4 pt-4 sm:px-6 sm:pt-6">
            <input type="hidden" name="applicationId" value={application.id} />

            <div className="space-y-4">
              <fieldset className={sectionClass}>
                <legend className="px-1 text-sm font-semibold">
                  Role details
                </legend>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  The opportunity and where it currently stands.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                </div>
              </fieldset>

              <fieldset className={sectionClass}>
                <legend className="px-1 text-sm font-semibold">
                  Next move
                </legend>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Keep one concrete follow-up visible on the board.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                </div>
              </fieldset>

              <fieldset className={sectionClass}>
                <legend className="px-1 text-sm font-semibold">
                  Compensation
                </legend>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Optional monthly salary range in Philippine pesos.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Minimum salary (PHP)
                    <Input
                      name="salaryMin"
                      defaultValue={
                        application.salary_min_centavos != null
                          ? String(application.salary_min_centavos / 100)
                          : ""
                      }
                      inputMode="decimal"
                      placeholder="e.g. 50000"
                      aria-label={`Edit ${application.company_name} minimum salary in pesos`}
                      className="mt-1.5"
                    />
                  </label>
                  <label className={labelClass}>
                    Maximum salary (PHP)
                    <Input
                      name="salaryMax"
                      defaultValue={
                        application.salary_max_centavos != null
                          ? String(application.salary_max_centavos / 100)
                          : ""
                      }
                      inputMode="decimal"
                      placeholder="e.g. 70000"
                      aria-label={`Edit ${application.company_name} maximum salary in pesos`}
                      className="mt-1.5"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className={sectionClass}>
                <legend className="px-1 text-sm font-semibold">
                  Contact & notes
                </legend>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Keep useful context close to the application.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                      className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    />
                  </label>
                </div>
              </fieldset>
            </div>

            <footer className="border-border bg-background/95 sticky bottom-0 z-20 -mx-4 mt-5 flex gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 sm:pb-4">
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
