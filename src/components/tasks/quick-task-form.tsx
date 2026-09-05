"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
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
  const [planningDetailsOpen, setPlanningDetailsOpen] = useState(false);
  const planningDetailsVisible =
    planningDetailsOpen || Boolean(state.message && !state.success);

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
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
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
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Adding…"
          className="min-h-12 sm:min-h-11"
        >
          Add task
        </Button>
      </div>

      <div className="border-border mt-3 border-t pt-3">
        <button
          type="button"
          aria-expanded={planningDetailsVisible}
          aria-controls="quick-task-planning-details"
          onClick={() => setPlanningDetailsOpen((open) => !open)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-2 rounded-md text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Planning details
          <ChevronDown
            className={`size-3.5 transition-transform ${planningDetailsVisible ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {!planningDetailsVisible && (
          <>
            <input type="hidden" name="priority" value={defaultPriority} />
            <input type="hidden" name="energyRequired" value="medium" />
            {defaultEstimatedMinutes ? (
              <input
                type="hidden"
                name="estimatedMinutes"
                value={defaultEstimatedMinutes}
              />
            ) : null}
          </>
        )}
      </div>

      {planningDetailsVisible && (
        <div
          id="quick-task-planning-details"
          className="border-border mt-3 grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-[140px_120px_110px_120px_115px]"
        >
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
              className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm"
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
          <div>
            <label
              htmlFor="quick-task-energy"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              Energy needed
            </label>
            <select
              id="quick-task-energy"
              name="energyRequired"
              defaultValue="medium"
              className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <TaskTimeRecommendations
            scheduledTasks={scheduledTasks}
            scheduledFor={scheduledFor}
            scheduledTime={scheduledTime}
            estimatedMinutes={
              estimatedMinutes ? Number(estimatedMinutes) : null
            }
            onSelectTime={(time) => {
              setScheduledTime(time);
              timeRef.current?.focus();
            }}
            className="md:col-span-2 xl:col-span-5"
          />
        </div>
      )}
      {onCancel && (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
      <p className="text-muted-foreground mt-2 font-mono text-[10px]">
        Press N from any quiet area to focus quick capture. Exact times use
        Asia/Manila.
      </p>
    </form>
  );
}
