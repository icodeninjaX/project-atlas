import { Check, Clock3, Inbox, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { manilaDateLabel } from "@/lib/dates/dates";
import { createClient } from "@/lib/supabase/server";
import { deleteTaskAction, setTaskStatusAction } from "@/lib/tasks/actions";

export const metadata = { title: "Tasks" };

const views = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "inbox", label: "Inbox" },
  { value: "completed", label: "Completed" },
] as const;

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const selected = (await searchParams).view ?? "today";
  const supabase = await createClient();
  const today = localDate();
  let tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    scheduled_for: string | null;
    due_at: string | null;
    estimated_minutes: number | null;
  }> = [];

  if (supabase) {
    let query = supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,scheduled_for,due_at,estimated_minutes",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (selected === "today")
      query = query.eq("scheduled_for", today).neq("status", "completed");
    if (selected === "upcoming")
      query = query.gt("scheduled_for", today).neq("status", "completed");
    if (selected === "inbox") query = query.eq("status", "inbox");
    if (selected === "completed") query = query.eq("status", "completed");
    const { data } = await query;
    tasks = data ?? [];
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        {manilaDateLabel(new Date())}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Tasks</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Capture quickly. Keep today small enough to finish.
      </p>

      <div className="mt-7">
        <QuickTaskForm />
      </div>

      <nav
        aria-label="Task views"
        className="border-border mt-6 flex gap-1 overflow-x-auto border-b"
      >
        {views.map((view) => (
          <Link
            key={view.value}
            href={`/tasks?view=${view.value}`}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${
              selected === view.value
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            {view.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 space-y-2">
        {tasks.length === 0 ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed text-center">
            <div>
              <Inbox className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No tasks in this view.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Capture one above or choose another view.
              </p>
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <form action={setTaskStatusAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={task.status === "completed" ? "inbox" : "completed"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="submit"
                    aria-label={
                      task.status === "completed"
                        ? `Reopen ${task.title}`
                        : `Complete ${task.title}`
                    }
                  >
                    {task.status === "completed" ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                </form>
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                    >
                      {task.title}
                    </p>
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] capitalize">
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {task.description}
                    </p>
                  )}
                  {(task.scheduled_for || task.estimated_minutes) && (
                    <p className="text-muted-foreground mt-2 flex items-center gap-1.5 font-mono text-[10px]">
                      <Clock3 className="size-3" />
                      {task.scheduled_for ?? "Unscheduled"}
                      {task.estimated_minutes
                        ? ` · ${task.estimated_minutes} min`
                        : ""}
                    </p>
                  )}
                  <details className="mt-3">
                    <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px]">
                      Edit task
                    </summary>
                    <TaskEditForm task={task} />
                  </details>
                </div>
                <form action={deleteTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="submit"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 className="text-muted-foreground size-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
