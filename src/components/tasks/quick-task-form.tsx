"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskActionState } from "@/lib/tasks/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initialState: TaskActionState = { success: false, message: "" };

export function QuickTaskForm({
  defaultPriority = "medium",
  defaultEstimatedMinutes = null,
}: {
  defaultPriority?: string;
  defaultEstimatedMinutes?: number | null;
}) {
  const [state, action, pending] = useOfflineActionState(
    "task.create",
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key.toLowerCase() === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        titleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="border-border bg-card rounded-2xl border p-3.5 shadow-sm sm:p-5 sm:shadow-none"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(210px,1fr)_145px_125px_125px_130px_auto]">
        <div>
          <label
            htmlFor="quick-task-title"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Task title
          </label>
          <Input
            ref={titleRef}
            id="quick-task-title"
            name="title"
            required
            maxLength={160}
            placeholder="Capture a task…"
          />
        </div>
        <div>
          <label
            htmlFor="quick-task-date"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Scheduled date
          </label>
          <Input id="quick-task-date" name="scheduledFor" type="date" />
        </div>
        <div>
          <label
            htmlFor="quick-task-time"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Exact time
          </label>
          <Input id="quick-task-time" name="scheduledTime" type="time" />
        </div>
        <div>
          <label
            htmlFor="quick-task-priority"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Priority
          </label>
          <select
            id="quick-task-priority"
            name="priority"
            defaultValue={defaultPriority}
            className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="quick-task-estimated-minutes"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Estimated minutes
          </label>
          <Input
            id="quick-task-estimated-minutes"
            name="estimatedMinutes"
            type="number"
            inputMode="numeric"
            min="1"
            max="1440"
            placeholder="30"
            defaultValue={defaultEstimatedMinutes ?? ""}
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="min-h-12 self-end md:col-span-2 xl:col-span-1 xl:min-h-10"
        >
          {pending ? "Adding…" : "Add task"}
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 font-mono text-[10px]">
        Press N from any quiet area to focus quick capture. Exact times use
        Asia/Manila.
      </p>
    </form>
  );
}
