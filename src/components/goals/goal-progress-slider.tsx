"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import type { OfflineActionState } from "@/lib/offline/types";

const initialActionState: OfflineActionState = {
  success: false,
  message: "",
};

const progressKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

export function GoalProgressSlider({
  goalId,
  goalTitle,
  progressPercent,
  status,
}: {
  goalId: string;
  goalTitle: string;
  progressPercent: number;
  status: string;
}) {
  const [progress, setProgress] = useState(progressPercent);
  const [adjusting, setAdjusting] = useState(false);
  const [state, action, pending] = useOfflineActionState(
    "goal.updateProgress",
    initialActionState,
  );
  const form = useRef<HTMLFormElement>(null);
  const savedProgress = useRef(progressPercent);
  const lastSubmittedProgress = useRef(progressPercent);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      savedProgress.current = lastSubmittedProgress.current;
      toast.success(`Progress updated to ${lastSubmittedProgress.current}%.`);
    } else {
      lastSubmittedProgress.current = savedProgress.current;
      toast.error(state.message);
    }
  }, [state]);

  function commitProgress(nextProgress: number) {
    if (
      !adjusting ||
      pending ||
      nextProgress === lastSubmittedProgress.current
    ) {
      return;
    }
    lastSubmittedProgress.current = nextProgress;
    setAdjusting(false);
    form.current?.requestSubmit();
  }

  function toggleAdjustment() {
    if (adjusting) setProgress(savedProgress.current);
    setAdjusting((open) => !open);
  }

  return (
    <form ref={form} action={action} className="mt-5">
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="status" value={status} />
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Progress
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-h-8 rounded-lg px-2 text-[11px]"
          disabled={pending}
          aria-label={
            pending
              ? `Saving progress for ${goalTitle}`
              : adjusting
                ? `Cancel progress adjustment for ${goalTitle}`
                : `Adjust progress for ${goalTitle}`
          }
          aria-pressed={adjusting}
          onClick={toggleAdjustment}
        >
          {pending ? (
            "Saving…"
          ) : adjusting ? (
            <>
              <X aria-hidden="true" className="size-3.5" />
              Cancel
            </>
          ) : (
            <>
              <SlidersHorizontal aria-hidden="true" className="size-3.5" />
              Adjust
            </>
          )}
        </Button>
      </div>
      <label
        className={`bg-muted focus-within:ring-ring focus-within:ring-offset-background relative block h-10 overflow-hidden rounded-xl shadow-inner transition focus-within:ring-2 focus-within:ring-offset-2 ${pending ? "cursor-wait opacity-80" : adjusting ? "ring-primary/25 cursor-ew-resize ring-1" : "cursor-default"}`}
      >
        <span className="sr-only">Progress for {goalTitle}</span>
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-0 left-0 rounded-xl transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 flex -translate-x-1/2 items-center transition-[left] duration-100 ease-out"
          style={{
            left: `clamp(1.75rem, ${progress}%, calc(100% - 1.75rem))`,
          }}
        >
          <span className="bg-background/90 text-primary border-primary/15 min-w-11 rounded-full border px-2 py-1 text-center font-mono text-xs font-bold shadow-sm backdrop-blur-sm">
            {progress}%
          </span>
        </span>
        <input
          name="progress"
          type="range"
          min="0"
          max="100"
          step="1"
          value={progress}
          disabled={!adjusting || pending}
          aria-label={`Progress for ${goalTitle}`}
          aria-valuetext={`${progress}% complete`}
          title={
            adjusting
              ? "Drag horizontally or use the arrow keys to update progress"
              : "Choose Adjust before changing progress"
          }
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize touch-pan-y opacity-0 disabled:cursor-default"
          onChange={(event) => setProgress(Number(event.currentTarget.value))}
          onPointerUp={(event) =>
            commitProgress(Number(event.currentTarget.value))
          }
          onPointerCancel={() => setProgress(savedProgress.current)}
          onKeyUp={(event) => {
            if (progressKeys.has(event.key)) {
              commitProgress(Number(event.currentTarget.value));
            }
          }}
        />
      </label>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Saving progress" : state.message}
      </span>
    </form>
  );
}
