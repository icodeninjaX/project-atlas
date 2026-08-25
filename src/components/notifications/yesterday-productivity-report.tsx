"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SMALL_COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

export function YesterdayProductivityReport({
  completedTaskCount,
  summaryDate,
  userId,
}: {
  completedTaskCount: number;
  summaryDate: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const doneButtonRef = useRef<HTMLButtonElement>(null);
  const normalizedTaskCount = Math.max(0, Math.trunc(completedTaskCount));

  useEffect(() => {
    if (normalizedTaskCount < 1) return;

    const notificationId = `atlas:v2:yesterday-productivity-report:${userId}:${summaryDate}`;

    try {
      if (window.localStorage.getItem(notificationId)) return;
    } catch {
      // The report can still be useful when private storage is unavailable.
    }

    const openTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(notificationId, "shown");
      } catch {
        // Keep showing the report even if the browser cannot persist its state.
      }
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(openTimer);
  }, [normalizedTaskCount, summaryDate, userId]);

  if (normalizedTaskCount < 1) return null;

  const taskLabel = normalizedTaskCount === 1 ? "task" : "tasks";
  const verb = normalizedTaskCount === 1 ? "was" : "were";
  const momentumSegments = Math.min(normalizedTaskCount, 6);
  const sentenceTaskCount =
    SMALL_COUNT_WORDS[normalizedTaskCount] ?? String(normalizedTaskCount);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#070a0f]/80 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby="yesterday-progress-description"
          className="bg-card/90 fixed top-1/2 left-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border p-1 shadow-2xl outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            doneButtonRef.current?.focus();
          }}
        >
          <section className="bg-card relative overflow-hidden rounded-xl border p-4 sm:p-5">
            <Circle
              aria-hidden="true"
              className="text-foreground/55 pointer-events-none absolute -top-16 -right-16 size-44"
              strokeWidth={0.35}
            />

            <header className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Yesterday
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Daily system report
                </p>
              </div>
              <Dialog.Close asChild>
                <Button
                  aria-label="Close daily progress report"
                  className="-mt-1 -mr-1 shrink-0 rounded-full"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </Dialog.Close>
            </header>

            <div className="bg-background/70 relative mt-5 flex items-center gap-4 rounded-xl border p-4">
              <span className="text-primary border-primary/50 grid size-11 shrink-0 place-items-center rounded-xl border">
                <CheckCircle2 aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-4xl leading-none font-semibold tracking-[-0.08em] tabular-nums">
                  {String(normalizedTaskCount).padStart(2, "0")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {taskLabel} completed
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <Dialog.Title className="text-[1.375rem] leading-7 font-semibold tracking-[-0.035em] text-balance">
                A productive day, recorded.
              </Dialog.Title>
              <Dialog.Description
                className="text-muted-foreground mt-2 text-sm leading-5"
                id="yesterday-progress-description"
              >
                {sentenceTaskCount} {taskLabel} {verb} completed yesterday.
                Atlas has recorded the progress in your daily route.
              </Dialog.Description>
            </div>

            <div className="relative mt-6">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-medium">Yesterday&apos;s momentum</span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {normalizedTaskCount} completed
                </span>
              </div>
              <div
                aria-label={`${normalizedTaskCount} ${taskLabel} completed yesterday`}
                className="bg-background/70 mt-3 flex h-3 gap-1 rounded-full border p-0.5"
                role="img"
              >
                {Array.from({ length: momentumSegments }, (_, index) => (
                  <span
                    className="bg-primary min-w-0 flex-1 rounded-full"
                    key={index}
                  />
                ))}
              </div>
            </div>

            <Dialog.Close asChild>
              <Button
                className="relative mt-5 w-full"
                ref={doneButtonRef}
                type="button"
              >
                Done
              </Button>
            </Dialog.Close>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
