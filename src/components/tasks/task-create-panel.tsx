"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
import { Button } from "@/components/ui/button";
import {
  EMPTY_SCHEDULED_TASKS,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";

export function TaskCreatePanel({
  defaultPriority = "medium",
  defaultEstimatedMinutes = null,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  initiallyOpen = false,
}: {
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

  if (!isOpen) {
    return (
      <Button
        type="button"
        aria-expanded="false"
        aria-controls="quick-task-form"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" />
        Add task
      </Button>
    );
  }

  return (
    <QuickTaskForm
      defaultPriority={defaultPriority}
      defaultEstimatedMinutes={defaultEstimatedMinutes}
      scheduledTasks={scheduledTasks}
      autoFocus
      focusRequest={focusRequest}
      onCancel={closeForm}
      onCreated={closeForm}
    />
  );
}
