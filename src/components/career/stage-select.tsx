"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  const [selection, setSelection] = useState({ baseline: stage, value: stage });
  const [pending, startTransition] = useTransition();
  const selectedStage = selection.baseline === stage ? selection.value : stage;

  return (
    <select
      name="stage"
      value={selectedStage}
      disabled={pending}
      onChange={(event) => {
        const nextStage = event.currentTarget.value;
        setSelection({ baseline: stage, value: nextStage });
        startTransition(async () => {
          try {
            const result = await updateApplicationStageAction(
              applicationId,
              nextStage,
            );
            if (result.success) toast.success(result.message);
            else {
              setSelection({ baseline: stage, value: stage });
              toast.error(result.message);
            }
          } catch {
            setSelection({ baseline: stage, value: stage });
            toast.error("The application stage could not be updated.");
          }
        });
      }}
      aria-label={`Stage for ${companyName}`}
      className="border-border bg-background min-h-9 rounded-lg border px-2 text-xs"
    >
      {stages.map((item) => (
        <option key={item} value={item}>
          {item.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
