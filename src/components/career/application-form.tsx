"use client";

import {
  BriefcaseBusiness,
  CalendarClock,
  NotebookPen,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  FormSection,
  PesoField,
  fieldLabelClass,
  fieldSelectClass,
  fieldTextareaClass,
} from "@/components/career/application-fields";
import { RelatedGoalField } from "@/components/graph/related-goal-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CareerActionState } from "@/lib/career/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { pipelineStages, stageLabels } from "@/lib/career/view";
import { cn } from "@/lib/utils";

const initial: CareerActionState = { success: false, message: "" };

export function ApplicationForm({
  className,
  footerClassName,
  onSuccess,
  onCancel,
}: {
  className?: string;
  /** Lets a dialog pin the actions to its bottom edge. */
  footerClassName?: string;
  onSuccess?: () => void;
  /** Adds a Cancel button beside the submit button. */
  onCancel?: () => void;
} = {}) {
  const [state, action, pending] = useOfflineActionState(
    "application.create",
    initial,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
    if (state.success) {
      form.current?.reset();
      onSuccess?.();
    }
  }, [onSuccess, state]);
  return (
    <form ref={form} action={action} className={cn("min-w-0", className)}>
      <div className="space-y-4">
        <FormSection
          icon={BriefcaseBusiness}
          title="Role details"
          description="The opportunity and where it stands today."
        >
          <label className={fieldLabelClass}>
            Company name
            <Input
              name="companyName"
              required
              maxLength={160}
              placeholder="e.g. Acme Philippines"
              aria-label="Company name"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Role title
            <Input
              name="roleTitle"
              required
              maxLength={160}
              placeholder="e.g. Frontend developer"
              aria-label="Role title"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Application stage
            <select
              name="stage"
              defaultValue="interested"
              aria-label="Application stage"
              className={fieldSelectClass}
            >
              {pipelineStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabels[stage]}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Work setup
            <select
              name="workSetup"
              defaultValue="unspecified"
              aria-label="Work setup"
              className={fieldSelectClass}
            >
              <option value="unspecified">Setup unspecified</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Employment type
            <select
              name="employmentType"
              defaultValue="full_time"
              aria-label="Employment type"
              className={fieldSelectClass}
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
              <option value="internship">Internship</option>
              <option value="unspecified">Unspecified</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Location
            <Input
              name="location"
              maxLength={120}
              placeholder="e.g. Makati or Remote"
              aria-label="Location"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Job posting link
            <Input
              name="jobUrl"
              type="url"
              placeholder="https://…"
              aria-label="Job posting link"
              className="mt-1.5"
            />
          </label>
          <div>
            <label
              htmlFor="new-application-applied-at"
              className={fieldLabelClass}
            >
              Date applied
            </label>
            <Input
              id="new-application-applied-at"
              name="appliedAt"
              type="date"
              aria-describedby="new-application-applied-at-help"
              className="mt-1.5"
            />
            <p
              id="new-application-applied-at-help"
              className="text-muted-foreground mt-1.5 text-[11px] leading-snug"
            >
              When you submitted the application. Leave blank if you have not
              applied yet.
            </p>
          </div>
        </FormSection>

        <FormSection
          icon={CalendarClock}
          title="Next move"
          description="One concrete step and when you will take it, so the application never goes quiet."
        >
          <label className={fieldLabelClass}>
            Next action
            <Input
              name="nextAction"
              maxLength={200}
              placeholder="e.g. Follow up with recruiter"
              aria-label="Next action"
              className="mt-1.5"
            />
          </label>
          <div>
            <label
              htmlFor="new-application-next-action-at"
              className={fieldLabelClass}
            >
              Next action due date
            </label>
            <Input
              id="new-application-next-action-at"
              name="nextActionAt"
              type="date"
              aria-describedby="new-application-next-action-at-help"
              className="mt-1.5"
            />
            <p
              id="new-application-next-action-at-help"
              className="text-muted-foreground mt-1.5 text-[11px] leading-snug"
            >
              When you plan to complete the next action.
            </p>
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
            placeholder="50,000"
            aria-label="Minimum salary in pesos"
          />
          <PesoField
            label="Maximum salary (PHP)"
            name="salaryMax"
            placeholder="70,000"
            aria-label="Maximum salary in pesos"
          />
        </FormSection>

        <FormSection
          icon={NotebookPen}
          title="Contact & notes"
          description="Who you are talking to, and anything worth remembering."
        >
          <label className={fieldLabelClass}>
            Contact name
            <Input
              name="contactName"
              maxLength={160}
              placeholder="e.g. Recruiter or hiring manager"
              aria-label="Contact name"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Contact email
            <Input
              name="contactEmail"
              type="email"
              placeholder="name@company.com"
              aria-label="Contact email"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Resume version
            <Input
              name="resumeVersion"
              maxLength={80}
              placeholder="e.g. Frontend v2"
              aria-label="Resume version"
              className="mt-1.5"
            />
          </label>
          <label className={cn(fieldLabelClass, "sm:col-span-2")}>
            Notes
            <textarea
              name="notes"
              maxLength={4000}
              placeholder="Add useful details about the role or company"
              aria-label="Application notes"
              className={fieldTextareaClass}
            />
          </label>
          <RelatedGoalField className="sm:col-span-2" />
        </FormSection>
      </div>

      <div className={cn("mt-5 flex gap-2", footerClassName)}>
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Adding…"
          className="flex-1 sm:ml-auto sm:flex-none"
        >
          Add application
        </Button>
      </div>
    </form>
  );
}
