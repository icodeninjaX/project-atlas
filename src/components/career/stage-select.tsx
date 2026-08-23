"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { updateApplicationStageAction } from "@/lib/career/actions";
import { cn } from "@/lib/utils";

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
  className,
  onStageChange,
}: {
  applicationId: string;
  companyName: string;
  stage: string;
  className?: string;
  onStageChange?: (stage: string) => void;
}) {
  const [selection, setSelection] = useState({ baseline: stage, value: stage });
  const [pending, startTransition] = useTransition();
  const { submit, userId } = useOfflineSync();
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
            const formData = new FormData();
            formData.set("applicationId", applicationId);
            formData.set("stage", nextStage);
            const result = userId
              ? await submit("application.setStage", formData)
              : await updateApplicationStageAction(applicationId, nextStage);
            if (result.success) {
              onStageChange?.(nextStage);
              toast.success(result.message);
            } else {
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
      className={cn(
        "border-border bg-background min-h-9 rounded-lg border px-2 text-xs capitalize",
        className,
      )}
    >
      {stages.map((item) => (
        <option key={item} value={item}>
          {item.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
