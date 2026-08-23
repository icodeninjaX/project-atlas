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
      <Input
        name="location"
        maxLength={120}
        placeholder="Location"
        aria-label="Location"
      />
      <Input
        name="jobUrl"
        type="url"
        placeholder="Job link"
        aria-label="Job link"
      />
      <Input name="appliedAt" type="date" aria-label="Applied date" />
      <Input
        name="nextAction"
        maxLength={200}
        placeholder="Next action"
        aria-label="Next action"
      />
      <Input name="nextActionAt" type="date" aria-label="Next action date" />
      <Input
        name="salaryMin"
        inputMode="decimal"
        placeholder="Salary min PHP"
        aria-label="Minimum salary in pesos"
      />
      <Input
        name="salaryMax"
        inputMode="decimal"
        placeholder="Salary max PHP"
        aria-label="Maximum salary in pesos"
      />
      <Input
        name="contactName"
        maxLength={160}
        placeholder="Contact name"
        aria-label="Contact name"
      />
      <Input
        name="contactEmail"
        type="email"
        placeholder="Contact email"
        aria-label="Contact email"
      />
      <Input
        name="resumeVersion"
        maxLength={80}
        placeholder="Resume version"
        aria-label="Resume version"
      />
      <textarea
        name="notes"
        maxLength={4000}
        placeholder="Notes"
        aria-label="Application notes"
        className="border-border bg-background min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none sm:col-span-2 lg:col-span-3"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add application"}
      </Button>
    </form>
  );
}
