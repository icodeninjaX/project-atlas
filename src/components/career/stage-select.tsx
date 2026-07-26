"use client";

import { updateApplicationStageAction } from "@/lib/career/actions";

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
] as const;

export function StageSelect({
  applicationId,
  companyName,
  stage,
}: {
  applicationId: string;
  companyName: string;
  stage: string;
}) {
  return (
    <form action={updateApplicationStageAction}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <select
        name="stage"
        defaultValue={stage}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label={`Stage for ${companyName}`}
        className="border-border bg-background min-h-9 rounded-lg border px-2 text-xs"
      >
        {stages.map((item) => (
          <option key={item} value={item}>
            {item.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </form>
  );
}
