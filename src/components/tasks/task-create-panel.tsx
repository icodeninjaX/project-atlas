"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
import { OPEN_TASK_CREATE_EVENT } from "@/components/tasks/task-create-trigger";
import { Button } from "@/components/ui/button";
import {
  EMPTY_SCHEDULED_TASKS,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";

export function TaskCreatePanel({
  heading,
  description,
  defaultPriority = "medium",
  defaultEstimatedMinutes = null,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  today,
  initiallyOpen = false,
}: {
  heading: ReactNode;
  description: ReactNode;
  defaultPriority?: string;
  defaultEstimatedMinutes?: number | null;
  scheduledTasks?: ScheduledTaskSlot[];
  /** Today in Asia/Manila as `YYYY-MM-DD`, for the date shortcuts. */
  today?: string;
  initiallyOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [focusRequest, setFocusRequest] = useState(0);
  const closeForm = useCallback(() => setIsOpen(false), []);
  const openForm = useCallback(() => {
    setIsOpen(true);
    setFocusRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_TASK_CREATE_EVENT, openForm);
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key.toLowerCase() === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        openForm();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_TASK_CREATE_EVENT, openForm);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openForm]);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {heading}
        {!isOpen ? (
          <Button
            type="button"
            className="shrink-0 rounded-full pr-4 pl-3.5"
            aria-expanded="false"
            aria-controls="quick-task-form"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="size-4" />
            Add task
            <kbd
              aria-hidden="true"
              className="ml-1 hidden h-5 min-w-5 place-items-center rounded-md bg-white/20 px-1 text-[0.625rem] font-semibold lg:inline-grid"
            >
              N
            </kbd>
          </Button>
        ) : null}
      </div>
      {description}
      {isOpen ? (
        <div className="mt-6 sm:mt-7">
          <QuickTaskForm
            defaultPriority={defaultPriority}
            defaultEstimatedMinutes={defaultEstimatedMinutes}
            scheduledTasks={scheduledTasks}
            today={today}
            autoFocus
            focusRequest={focusRequest}
            onCancel={closeForm}
            onCreated={closeForm}
          />
        </div>
      ) : (
        // Phones: a new task stays one tap away while scrolling the list.
        // It rides above the bottom navigation and leaves with it when the
        // keyboard opens.
        <button
          type="button"
          onClick={openForm}
          className="bg-primary-solid text-primary-solid-foreground focus-visible:ring-ring focus-visible:ring-offset-background fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_14px_30px_-10px_color-mix(in_srgb,var(--primary-solid)_80%,transparent)] transition-transform duration-150 [-webkit-tap-highlight-color:transparent] group-data-[keyboard=open]/shell:hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 motion-reduce:transition-none sm:hidden"
        >
          <Plus className="size-6" aria-hidden="true" />
          <span className="sr-only">New task</span>
        </button>
      )}
    </>
  );
}
