"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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

    // Opens after the rest of the page has hydrated, so the modal does not
    // mark server-rendered siblings aria-hidden mid-hydration.
    const openTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(notificationId, "shown");
      } catch {
        // Keep showing the report even if the browser cannot persist its state.
      }
      setOpen(true);
    }, 400);
    return () => window.clearTimeout(openTimer);
  }, [normalizedTaskCount, summaryDate, userId]);

  if (normalizedTaskCount < 1) return null;

  const taskLabel = normalizedTaskCount === 1 ? "task" : "tasks";
  const verb = normalizedTaskCount === 1 ? "was" : "were";
  const sentenceTaskCount =
    SMALL_COUNT_WORDS[normalizedTaskCount] ?? String(normalizedTaskCount);
  const dateLabel = formatSummaryDate(summaryDate);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby="yesterday-progress-description"
          className="bg-background fixed top-1/2 left-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border p-5 shadow-2xl outline-none sm:p-6"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            doneButtonRef.current?.focus();
          }}
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {dateLabel ? (
                <p className="text-muted-foreground text-xs font-medium">
                  {dateLabel}
                </p>
              ) : null}
              <Dialog.Title className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                {normalizedTaskCount} {taskLabel} completed yesterday
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button
                aria-label="Close daily progress report"
                className="-mt-1.5 -mr-2 shrink-0"
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </header>

          <Dialog.Description
            className="text-muted-foreground mt-2 text-sm leading-6"
            id="yesterday-progress-description"
          >
            {sentenceTaskCount} {taskLabel} {verb} completed yesterday. They are
            listed under Completed in Tasks.
          </Dialog.Description>

          <div className="mt-5 flex justify-end">
            <Dialog.Close asChild>
              <Button ref={doneButtonRef} type="button">
                Done
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatSummaryDate(summaryDate: string) {
  const date = new Date(`${summaryDate}T12:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
