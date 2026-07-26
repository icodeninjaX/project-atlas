"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskAction, type TaskActionState } from "@/lib/tasks/actions";

const initialState: TaskActionState = { success: false, message: "" };

export function QuickTaskForm() {
  const [state, action, pending] = useActionState(
    createTaskAction,
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
      className="border-border bg-card rounded-2xl border p-4 sm:p-5"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_150px_130px_auto]">
        <div>
          <label htmlFor="quick-task-title" className="sr-only">
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
          <label htmlFor="quick-task-date" className="sr-only">
            Scheduled date
          </label>
          <Input id="quick-task-date" name="scheduledFor" type="date" />
        </div>
        <div>
          <label htmlFor="quick-task-priority" className="sr-only">
            Priority
          </label>
          <select
            id="quick-task-priority"
            name="priority"
            defaultValue="medium"
            className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add task"}
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 font-mono text-[10px]">
        Press N from any quiet area to focus quick capture.
      </p>
    </form>
  );
}
