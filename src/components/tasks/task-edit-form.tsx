import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { taskTimeInputValue } from "@/lib/tasks/task-time";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";

export function TaskEditForm({
  task,
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
}) {
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
          defaultValue={task.scheduled_for ?? ""}
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Exact time
        <Input
          name="scheduledTime"
          type="time"
          defaultValue={taskTimeInputValue(task.scheduled_time)}
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
          defaultValue={task.estimated_minutes ?? ""}
          className="mt-1.5"
        />
      </label>
      <Button type="submit" variant="secondary" className="self-end">
        Save
      </Button>
    </OfflineMutationForm>
  );
}
