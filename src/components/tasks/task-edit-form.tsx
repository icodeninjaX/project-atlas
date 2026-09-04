"use client";

import { useRef, useState } from "react";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_SCHEDULED_TASKS,
  taskTimeInputValue,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { TaskTimeRecommendations } from "@/components/tasks/task-time-recommendations";

export function TaskEditForm({
  task,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    scheduled_for: string | null;
    scheduled_time: string | null;
    estimated_minutes: number | null;
    status: string;
  };
  scheduledTasks?: ScheduledTaskSlot[];
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
      className="border-border mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_160px_140px_140px_auto]"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="status" value={task.status} />
      <label className="text-muted-foreground text-xs">
        Task title
        <Input
          name="title"
          defaultValue={task.title}
          required
          maxLength={160}
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Scheduled date
        <Input
          name="scheduledFor"
          type="date"
          value={scheduledFor}
          onChange={(event) => setScheduledFor(event.target.value)}
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Exact time
        <Input
          ref={timeRef}
          name="scheduledTime"
          type="time"
          value={scheduledTime}
          onChange={(event) => setScheduledTime(event.target.value)}
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Priority
        <select
          name="priority"
          defaultValue={task.priority}
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2 xl:col-span-2">
        Description
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          maxLength={2000}
          rows={3}
          className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Estimated minutes
        <Input
          name="estimatedMinutes"
          type="number"
          min="1"
          max="1440"
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
          className="mt-1.5"
        />
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
        className="sm:col-span-2 xl:col-span-5"
      />
      <FormSubmitButton
        variant="secondary"
        pendingLabel="Saving…"
        className="self-end sm:col-span-2 xl:col-span-1 xl:col-start-4 xl:row-start-2"
      >
        Save
      </FormSubmitButton>
    </OfflineMutationForm>
  );
}
