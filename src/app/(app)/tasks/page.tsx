import { Check, Clock3, Inbox, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskFocusMode } from "@/components/tasks/task-focus-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { manilaDateLabel } from "@/lib/dates/dates";
import { createClient } from "@/lib/supabase/server";
import { getTaskPriorityBadgeClass } from "@/lib/tasks/priority";
import { formatTaskTime, type ScheduledTaskSlot } from "@/lib/tasks/task-time";

export const metadata = { title: "Tasks" };

const views = [
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
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
    scheduled_time: string | null;
    due_at: string | null;
    estimated_minutes: number | null;
  }> = [];
  let taskDefaults: {
    default_task_priority: string;
    default_task_estimated_minutes: number | null;
  } | null = null;
  let scheduledTasks: ScheduledTaskSlot[] = [];

  if (supabase) {
    const preferencesQuery = supabase
      .from("user_preferences")
      .select("default_task_priority,default_task_estimated_minutes")
      .maybeSingle();
    let query = supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,scheduled_for,scheduled_time,due_at,estimated_minutes",
      );

    if (selected === "today")
      query = query
        .eq("scheduled_for", today)
        .neq("status", "completed")
        .neq("status", "cancelled");
    if (selected === "overdue")
      query = query
        .lt("scheduled_for", today)
        .neq("status", "completed")
        .neq("status", "cancelled");
    if (selected === "upcoming")
      query = query
        .gt("scheduled_for", today)
        .neq("status", "completed")
        .neq("status", "cancelled");
    if (selected === "inbox") query = query.eq("status", "inbox");
    if (selected === "completed") query = query.eq("status", "completed");
    if (["today", "overdue", "upcoming"].includes(selected)) {
      query = query
        .order("scheduled_for", {
          ascending: selected !== "overdue",
          nullsFirst: false,
        })
        .order("scheduled_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    query = query.limit(100);
    const scheduledTasksQuery = supabase
      .from("tasks")
      .select("id,title,scheduled_for,scheduled_time,estimated_minutes")
      .not("scheduled_for", "is", null)
      .not("scheduled_time", "is", null)
      .neq("status", "completed")
      .neq("status", "cancelled");
    const [preferencesResult, taskResult, scheduledTaskResult] =
      await Promise.all([preferencesQuery, query, scheduledTasksQuery]);
    taskDefaults = preferencesResult.data;
    const { data } = taskResult;
    tasks = data ?? [];
    scheduledTasks = scheduledTaskResult.data ?? [];
  }

  return (
    <div className="mx-auto max-w-[1200px] px-3 py-4 sm:p-6 lg:p-8">
      <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        {manilaDateLabel(new Date())}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Tasks</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Capture quickly. Keep today small enough to finish.
      </p>

      <div className="mt-6 sm:mt-7">
        <QuickTaskForm
          defaultPriority={taskDefaults?.default_task_priority ?? "medium"}
          defaultEstimatedMinutes={
            taskDefaults?.default_task_estimated_minutes ?? null
          }
          scheduledTasks={scheduledTasks}
        />
      </div>

      <nav
        aria-label="Task views"
        className="border-border bg-muted/60 mt-5 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-2xl border p-1 sm:mt-6 [&::-webkit-scrollbar]:hidden"
      >
        {views.map((view) => (
          <Link
            key={view.value}
            href={`/tasks?view=${view.value}`}
            className={`min-h-11 shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              selected === view.value
                ? "border-border bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground border-transparent"
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
          tasks.map((task) => {
            const overdue =
              selected === "overdue" &&
              task.scheduled_for !== null &&
              task.scheduled_for < today;
            const scheduledLabel = task.scheduled_for
              ? `${task.scheduled_for}${
                  task.scheduled_time
                    ? ` at ${formatTaskTime(task.scheduled_time)}`
                    : ""
                }`
              : null;
            const mobileScheduleLabel = task.scheduled_for
              ? `${overdue ? "Overdue · " : ""}${task.scheduled_for}`
              : task.estimated_minutes
                ? `${task.estimated_minutes} min`
                : null;

            return (
              <Card key={task.id}>
                <CardContent className="flex items-start gap-2 p-3 sm:gap-3 sm:p-4">
                  <OfflineMutationForm
                    mutation="task.setStatus"
                    className="hidden sm:block"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={
                        task.status === "completed" ? "inbox" : "completed"
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="submit"
                      className="size-11 sm:size-10"
                      title={
                        task.status === "completed"
                          ? "Reopen task"
                          : "Complete task"
                      }
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
                  </OfflineMutationForm>
                  <div className="min-w-0 flex-1 pt-1.5 sm:pt-1.5">
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <p
                          className={`min-w-0 text-sm font-semibold break-words ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                        >
                          {task.title}
                        </p>
                        <span
                          className={`${getTaskPriorityBadgeClass(task.priority)} hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize sm:inline-flex`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-start gap-0.5 sm:hidden">
                        <OfflineMutationForm mutation="task.setStatus">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              task.status === "completed"
                                ? "inbox"
                                : "completed"
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="submit"
                            className="-mt-2 size-10"
                            title={
                              task.status === "completed"
                                ? "Reopen task"
                                : "Complete task"
                            }
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
                        </OfflineMutationForm>
                        <TaskActionsMenu
                          task={task}
                          scheduledLabel={scheduledLabel}
                          scheduledTasks={scheduledTasks}
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 sm:hidden">
                      <span
                        className={`${getTaskPriorityBadgeClass(task.priority)} shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize`}
                      >
                        {task.priority}
                      </span>
                      {mobileScheduleLabel && (
                        <p
                          className={`ml-auto flex min-w-0 items-center justify-end gap-1 font-mono text-[10px] whitespace-nowrap ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                        >
                          <Clock3 className="size-3 shrink-0" />
                          <span className="truncate">
                            {mobileScheduleLabel}
                          </span>
                        </p>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {task.description}
                      </p>
                    )}
                    {(task.scheduled_for || task.estimated_minutes) && (
                      <p
                        className={`mt-2 hidden items-center gap-1.5 font-mono text-[10px] sm:flex ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                      >
                        <Clock3 className="size-3" />
                        {overdue ? "Overdue · " : ""}
                        {task.scheduled_for ?? "Unscheduled"}
                        {task.scheduled_time
                          ? ` at ${formatTaskTime(task.scheduled_time)}`
                          : ""}
                        {task.estimated_minutes
                          ? ` · ${task.estimated_minutes} min`
                          : ""}
                      </p>
                    )}
                    {task.status !== "completed" &&
                      task.status !== "cancelled" && (
                        <div className="mt-3 hidden sm:block">
                          <TaskFocusMode
                            taskId={task.id}
                            title={task.title}
                            description={task.description}
                            estimatedMinutes={task.estimated_minutes}
                            scheduledLabel={scheduledLabel}
                          />
                        </div>
                      )}
                    <details className="mt-3 hidden sm:block">
                      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px]">
                        Edit task
                      </summary>
                      <TaskEditForm
                        task={task}
                        scheduledTasks={scheduledTasks}
                      />
                    </details>
                  </div>
                  <OfflineMutationForm
                    mutation="task.delete"
                    className="hidden sm:block"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="submit"
                      className="size-11 sm:size-10"
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </Button>
                  </OfflineMutationForm>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
