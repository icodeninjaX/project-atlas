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

const fieldClass = "grid min-w-0 gap-1.5";
const labelTextClass = "text-sm font-medium";
const controlClass =
  "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm";

export function TaskEditForm({
  task,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
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
  /** Closes the form without saving, such as the dialog it sits in. */
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
      className="mt-5 grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="status" value={task.status} />
      <label className={`${fieldClass} sm:col-span-2`}>
        <span className={labelTextClass}>Task title</span>
        <Input
          name="title"
          defaultValue={task.title}
          required
          maxLength={160}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelTextClass}>Scheduled date</span>
        <Input
          name="scheduledFor"
          type="date"
          value={scheduledFor}
          onChange={(event) => setScheduledFor(event.target.value)}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelTextClass}>Exact time</span>
        <Input
          ref={timeRef}
          name="scheduledTime"
          type="time"
          value={scheduledTime}
          onChange={(event) => setScheduledTime(event.target.value)}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelTextClass}>Estimated minutes</span>
        <Input
          name="estimatedMinutes"
          type="number"
          min="1"
          max="1440"
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelTextClass}>Priority</span>
        <select
          name="priority"
          defaultValue={task.priority}
          className={`${controlClass} min-h-11`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <label className={fieldClass}>
        <span className={labelTextClass}>Energy needed</span>
        <select
          name="energyRequired"
          defaultValue={task.energy_required}
          className={`${controlClass} min-h-11`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
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
        className="sm:col-span-2"
      />
      <label className={`${fieldClass} sm:col-span-2`}>
        <span className={labelTextClass}>Description</span>
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          maxLength={2000}
          rows={3}
          className={`${controlClass} min-h-20 resize-y py-2`}
        />
      </label>
      <div className="flex flex-col-reverse gap-2 pt-1 min-[400px]:flex-row min-[400px]:justify-end sm:col-span-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <FormSubmitButton pendingLabel="Saving…">Save</FormSubmitButton>
      </div>
    </OfflineMutationForm>
  );
}
