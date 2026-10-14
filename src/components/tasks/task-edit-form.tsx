"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_SCHEDULED_TASKS,
  taskTimeInputValue,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { TaskTimeRecommendations } from "@/components/tasks/task-time-recommendations";

const fieldClass = "grid gap-1.5 text-xs font-medium text-muted-foreground";
const selectClass =
  "border-border bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm";

export function TaskEditForm({
  task,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  onSaved,
  onCancel,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    scheduled_for: string | null;
    scheduled_time: string | null;
    estimated_minutes: number | null;
    energy_required: string;
    status: string;
  };
  scheduledTasks?: ScheduledTaskSlot[];
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [scheduledFor, setScheduledFor] = useState(task.scheduled_for ?? "");
  const [scheduledTime, setScheduledTime] = useState(
    taskTimeInputValue(task.scheduled_time),
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimated_minutes?.toString() ?? "",
  );
  const timeRef = useRef<HTMLInputElement>(null);

  return (
    <OfflineMutationForm
      mutation="task.update"
      onResult={(result) => {
        if (result.success) onSaved?.();
      }}
      className="border-border mt-4 grid gap-4 border-t pt-4"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="status" value={task.status} />
      <label className={fieldClass}>
        Task title
        <Input
          name="title"
          defaultValue={task.title}
          required
          maxLength={160}
          className="text-foreground"
        />
      </label>
      <label className={fieldClass}>
        Description
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          maxLength={2000}
          rows={3}
          placeholder="Add notes or context"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 min-h-24 w-full resize-y rounded-xl border px-3 py-2 text-base leading-6 outline-none focus-visible:ring-2 sm:text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <label className={fieldClass}>
          Scheduled date
          <Input
            name="scheduledFor"
            type="date"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            className="text-foreground"
          />
        </label>
        <label className={fieldClass}>
          Exact time
          <Input
            ref={timeRef}
            name="scheduledTime"
            type="time"
            value={scheduledTime}
            onChange={(event) => setScheduledTime(event.target.value)}
            className="text-foreground"
          />
        </label>
      </div>
      <TaskTimeRecommendations
        scheduledTasks={scheduledTasks}
        scheduledFor={scheduledFor}
        scheduledTime={scheduledTime}
        estimatedMinutes={estimatedMinutes ? Number(estimatedMinutes) : null}
        excludeTaskId={task.id}
        onSelectTime={(time) => {
          setScheduledTime(time);
          timeRef.current?.focus();
        }}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <label className={fieldClass}>
          Priority
          <select
            name="priority"
            defaultValue={task.priority}
            className={selectClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className={fieldClass}>
          Energy needed
          <select
            name="energyRequired"
            defaultValue={task.energy_required}
            className={selectClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className={`${fieldClass} col-span-2 sm:col-span-1`}>
          Estimated minutes
          <Input
            name="estimatedMinutes"
            type="number"
            inputMode="numeric"
            min="1"
            max="1440"
            placeholder="e.g. 30"
            value={estimatedMinutes}
            onChange={(event) => setEstimatedMinutes(event.target.value)}
            className="text-foreground"
          />
        </label>
      </div>
      <div className="border-border bg-card sticky -bottom-5 z-10 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <FormSubmitButton pendingLabel="Saving…" className="sm:min-w-28">
          Save changes
        </FormSubmitButton>
      </div>
    </OfflineMutationForm>
  );
}
