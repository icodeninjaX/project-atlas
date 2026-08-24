"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
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
  initiallyOpen = false,
}: {
  heading: ReactNode;
  description: ReactNode;
  defaultPriority?: string;
  defaultEstimatedMinutes?: number | null;
  scheduledTasks?: ScheduledTaskSlot[];
  initiallyOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [focusRequest, setFocusRequest] = useState(0);
  const closeForm = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key.toLowerCase() === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        setIsOpen(true);
        setFocusRequest((request) => request + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="mt-2 flex items-center justify-between gap-3">
        {heading}
        {!isOpen ? (
          <Button
            type="button"
            className="shrink-0"
            aria-expanded="false"
            aria-controls="quick-task-form"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="size-4" />
            Add task
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
            autoFocus
            focusRequest={focusRequest}
            onCancel={closeForm}
            onCreated={closeForm}
          />
        </div>
      ) : null}
    </>
  );
}
