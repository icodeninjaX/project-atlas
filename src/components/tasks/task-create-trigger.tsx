"use client";

import { Button } from "@/components/ui/button";

export const OPEN_TASK_CREATE_EVENT = "atlas:open-task-create";

export function TaskCreateTrigger() {
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => window.dispatchEvent(new Event(OPEN_TASK_CREATE_EVENT))}
    >
      Add task
    </Button>
  );
}
