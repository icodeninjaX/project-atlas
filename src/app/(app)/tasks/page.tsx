import { Clock3, Inbox } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { TaskCreatePanel } from "@/components/tasks/task-create-panel";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { TaskStatusForm } from "@/components/tasks/task-status-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
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

const emptyViews: Record<
  string,
  {
    title: string;
    description: string;
    action: { label: string; href: string };
  }
> = {
  today: {
    title: "Nothing is due today.",
    description:
      "Capture a task now, or keep the day open for what matters most.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  overdue: {
    title: "Nothing is overdue.",
    description: "You are clear to focus on today’s work.",
    action: { label: "Open Today", href: "/tasks?view=today" },
  },
  upcoming: {
    title: "Nothing is planned ahead.",
    description:
      "Add a task with a date when you are ready to protect the time.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  inbox: {
    title: "Your inbox is clear.",
    description:
      "Capture loose thoughts here before they compete with today’s plan.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  completed: {
    title: "No completed tasks yet.",
    description: "Finish a task and ATLAS will keep the record here.",
    action: { label: "Open Today", href: "/tasks?view=today" },
  },
};

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
  searchParams: Promise<{ view?: string; create?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const selected = params.view ?? "today";
  const emptyView = emptyViews[selected] ?? emptyViews.today!;
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
    energy_required: string;
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
        "id,title,description,status,priority,scheduled_for,scheduled_time,due_at,estimated_minutes,energy_required",
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
    if (params.highlight) {
      const { data: highlightedTask } = await supabase
        .from("tasks")
        .select(
          "id,title,description,status,priority,scheduled_for,scheduled_time,due_at,estimated_minutes,energy_required",
        )
        .eq("id", params.highlight)
        .maybeSingle();
      if (
        highlightedTask &&
        !tasks.some((task) => task.id === highlightedTask.id)
      ) {
        tasks = [highlightedTask, ...tasks];
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-3 py-4 sm:p-6 lg:p-8">
      <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        {manilaDateLabel(new Date())}
      </p>
      <TaskCreatePanel
        heading={
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Tasks
          </h1>
        }
        description={
          <p className="text-muted-foreground mt-2 text-sm">
            Capture quickly. Keep today small enough to finish.
          </p>
        }
        defaultPriority={taskDefaults?.default_task_priority ?? "medium"}
        defaultEstimatedMinutes={
          taskDefaults?.default_task_estimated_minutes ?? null
        }
        scheduledTasks={scheduledTasks}
        initiallyOpen={params.create === "true"}
      />

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
          <EmptyState
            icon={Inbox}
            title={emptyView.title}
            description={emptyView.description}
            action={
              <Button asChild size="sm">
                <Link href={emptyView.action.href as Route}>
                  {emptyView.action.label}
                </Link>
              </Button>
            }
          />
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
              ? `${overdue ? "Overdue · " : ""}${task.scheduled_for}${
                  task.scheduled_time
                    ? ` at ${formatTaskTime(task.scheduled_time)}`
                    : ""
                }`
              : task.estimated_minutes
                ? `${task.estimated_minutes} min`
                : null;

            return (
              <Card
                key={task.id}
                id={`task-${task.id}`}
                className={
                  task.id === params.highlight
                    ? "ring-primary/60 bg-primary/5 ring-2"
                    : undefined
                }
              >
                <CardContent className="flex items-start gap-3 p-3.5 sm:p-4">
                  <TaskStatusForm
                    taskId={task.id}
                    title={task.title}
                    completed={task.status === "completed"}
                    buttonClassName="size-10"
                  />
                  <div className="min-w-0 flex-1 pt-1">
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
                        <span className="border-border text-muted-foreground hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize sm:inline-flex">
                          {task.energy_required} energy
                        </span>
                      </div>
                      <TaskActionsMenu
                        task={task}
                        scheduledLabel={scheduledLabel}
                        scheduledTasks={scheduledTasks}
                      />
                    </div>
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={`${getTaskPriorityBadgeClass(task.priority)} rounded-full border px-2 py-0.5 text-[10px] capitalize`}
                      >
                        {task.priority}
                      </span>
                      {mobileScheduleLabel && (
                        <p
                          className={`flex min-w-0 items-center gap-1 font-mono text-[10px] ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
