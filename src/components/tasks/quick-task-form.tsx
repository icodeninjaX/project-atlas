"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskActionState } from "@/lib/tasks/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { TaskTimeRecommendations } from "@/components/tasks/task-time-recommendations";
import {
  EMPTY_SCHEDULED_TASKS,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";

const initialState: TaskActionState = { success: false, message: "" };

export function QuickTaskForm({
  defaultPriority = "medium",
  defaultEstimatedMinutes = null,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  autoFocus = false,
  focusRequest = 0,
  onCancel,
  onCreated,
}: {
  defaultPriority?: string;
  defaultEstimatedMinutes?: number | null;
  scheduledTasks?: ScheduledTaskSlot[];
  autoFocus?: boolean;
  focusRequest?: number;
  onCancel?: () => void;
  onCreated?: () => void;
}) {
  const [state, action, pending] = useOfflineActionState(
    "task.create",
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    defaultEstimatedMinutes?.toString() ?? "",
  );

  useEffect(() => {
    if (focusRequest > 0) titleRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      onCreated?.();
    } else {
      toast.error(state.message);
    }
  }, [onCreated, state]);

  return (
    <form
      id="quick-task-form"
      ref={formRef}
      action={action}
      onReset={() => {
        setScheduledFor("");
        setScheduledTime("");
        setEstimatedMinutes(defaultEstimatedMinutes?.toString() ?? "");
      }}
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
            autoFocus={autoFocus}
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
          <Input
            id="quick-task-date"
            name="scheduledFor"
            type="date"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="quick-task-time"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Exact time
          </label>
          <Input
            ref={timeRef}
            id="quick-task-time"
            name="scheduledTime"
            type="time"
            value={scheduledTime}
            onChange={(event) => setScheduledTime(event.target.value)}
          />
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
            value={estimatedMinutes}
            onChange={(event) => setEstimatedMinutes(event.target.value)}
          />
        </div>
        <TaskTimeRecommendations
          scheduledTasks={scheduledTasks}
          scheduledFor={scheduledFor}
          scheduledTime={scheduledTime}
          estimatedMinutes={estimatedMinutes ? Number(estimatedMinutes) : null}
          onSelectTime={(time) => {
            setScheduledTime(time);
            timeRef.current?.focus();
          }}
          className="md:col-span-2 xl:col-span-6"
        />
        <div className="flex items-end justify-end gap-2 md:col-span-2 xl:col-span-1 xl:col-start-6 xl:row-start-1">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="min-h-12 flex-1 xl:min-h-10"
          >
            {pending ? "Adding…" : "Add task"}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 font-mono text-[10px]">
        Press N from any quiet area to focus quick capture. Exact times use
        Asia/Manila.
      </p>
    </form>
  );
}
