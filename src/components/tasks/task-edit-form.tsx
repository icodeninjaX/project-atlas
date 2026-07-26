import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTaskAction } from "@/lib/tasks/actions";

export function TaskEditForm({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    scheduled_for: string | null;
    estimated_minutes: number | null;
    status: string;
  };
}) {
  return (
    <form
      action={updateTaskAction}
      className="border-border mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_140px_140px_auto]"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="status" value={task.status} />
      <Input
        name="title"
        defaultValue={task.title}
        required
        aria-label={`Edit ${task.title} title`}
      />
      <Input
        name="scheduledFor"
        type="date"
        defaultValue={task.scheduled_for ?? ""}
        aria-label={`Edit ${task.title} date`}
      />
      <select
        name="priority"
        defaultValue={task.priority}
        aria-label={`Edit ${task.title} priority`}
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <Button type="submit" variant="secondary">
        Save
      </Button>
    </form>
  );
}
