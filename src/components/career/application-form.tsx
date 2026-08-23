"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CareerActionState } from "@/lib/career/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { cn } from "@/lib/utils";

const initial: CareerActionState = { success: false, message: "" };

export function ApplicationForm({
  className,
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
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
    <form
      ref={form}
      action={action}
      className={cn(
        "border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      <label className="text-muted-foreground text-xs">
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
      <label className="text-muted-foreground text-xs">
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
      <label className="text-muted-foreground text-xs">
        Application stage
        <select
          name="stage"
          defaultValue="interested"
          aria-label="Application stage"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="interested">Interested</option>
          <option value="preparing">Preparing</option>
          <option value="applied">Applied</option>
          <option value="assessment">Assessment</option>
          <option value="interview">Interview</option>
          <option value="final_interview">Final interview</option>
          <option value="offer">Offer</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Work setup
        <select
          name="workSetup"
          defaultValue="unspecified"
          aria-label="Work setup"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="unspecified">Setup unspecified</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Employment type
        <select
          name="employmentType"
          defaultValue="full_time"
          aria-label="Employment type"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="freelance">Freelance</option>
          <option value="internship">Internship</option>
          <option value="unspecified">Unspecified</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Location
        <Input
          name="location"
          maxLength={120}
          placeholder="e.g. Makati or Remote"
          aria-label="Location"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
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
          className="text-muted-foreground text-xs"
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
      <label className="text-muted-foreground text-xs">
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
          className="text-muted-foreground text-xs"
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
      <label className="text-muted-foreground text-xs">
        Minimum salary (PHP)
        <Input
          name="salaryMin"
          inputMode="decimal"
          placeholder="e.g. 50000"
          aria-label="Minimum salary in pesos"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Maximum salary (PHP)
        <Input
          name="salaryMax"
          inputMode="decimal"
          placeholder="e.g. 70000"
          aria-label="Maximum salary in pesos"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Contact name
        <Input
          name="contactName"
          maxLength={160}
          placeholder="e.g. Recruiter or hiring manager"
          aria-label="Contact name"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Contact email
        <Input
          name="contactEmail"
          type="email"
          placeholder="name@company.com"
          aria-label="Contact email"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Resume version
        <Input
          name="resumeVersion"
          maxLength={80}
          placeholder="e.g. Frontend v2"
          aria-label="Resume version"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-3">
        Notes
        <textarea
          name="notes"
          maxLength={4000}
          placeholder="Add useful details about the role or company"
          aria-label="Application notes"
          className="border-border bg-background mt-1.5 min-h-20 w-full rounded-xl border px-3 py-2 text-sm outline-none"
        />
      </label>
      <Button type="submit" disabled={pending} className="self-end">
        {pending ? "Adding…" : "Add application"}
      </Button>
    </form>
  );
}
