"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { stageTone } from "@/components/career/stage-tone";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { updateApplicationStageAction } from "@/lib/career/actions";
import { careerStages, stageLabels } from "@/lib/career/view";
import { cn } from "@/lib/utils";

/**
 * The stage as a tinted chip that opens the native picker, so keyboards,
 * screen readers, and phones get the platform's own menu. Saves on change
 * and rolls back if the save fails.
 */
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
  /** Sizes and places the chip; it fills its width. */
  className?: string;
  onStageChange?: (stage: string) => void;
}) {
  const [selection, setSelection] = useState({ baseline: stage, value: stage });
  const [pending, startTransition] = useTransition();
  const { submit, userId } = useOfflineSync();
  const selectedStage = selection.baseline === stage ? selection.value : stage;
  const tone = stageTone(selectedStage);

  return (
    <span
      className={cn(
        "relative inline-flex min-h-11 min-w-0 items-stretch sm:min-h-9",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full",
          tone.dot,
          pending && "animate-pulse motion-reduce:animate-none",
        )}
      />
      <select
        name="stage"
        value={selectedStage}
        disabled={pending}
        aria-busy={pending || undefined}
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
          "focus-visible:ring-ring w-full min-w-0 cursor-pointer appearance-none truncate rounded-full py-1 pr-8 pl-7 text-xs font-semibold ring-1 transition-[background-color,box-shadow] ring-inset focus-visible:ring-2 focus-visible:outline-none disabled:cursor-progress",
          tone.soft,
          tone.text,
          tone.ring,
          "hover:shadow-sm",
        )}
      >
        {careerStages.map((item) => (
          // The chip's tint is translucent; the open menu needs a solid face.
          <option
            key={item}
            value={item}
            className="bg-card text-card-foreground"
          >
            {stageLabels[item]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 opacity-70",
          tone.text,
        )}
      />
    </span>
  );
}
