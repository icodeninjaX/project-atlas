import {
  AlarmClock,
  CalendarDays,
  CircleCheck,
  Inbox,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { TaskCreatePanel } from "@/components/tasks/task-create-panel";
import { TaskCreateTrigger } from "@/components/tasks/task-create-trigger";
import { TaskList } from "@/components/tasks/task-list";
import { TaskOverview } from "@/components/tasks/task-overview";
import { TaskViewNav } from "@/components/tasks/task-view-nav";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { manilaDateLabel } from "@/lib/dates/dates";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledTaskSlot } from "@/lib/tasks/task-time";
import {
  groupTasksForView,
  manilaClock,
  manilaIsoDate,
  parseTaskView,
  summarizeTodayPlan,
  type TaskGroup,
  type TaskListItem,
  type TaskView,
  type TodayPlanSummary,
} from "@/lib/tasks/task-view";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Tasks" };

const TASK_COLUMNS =
  "id,title,description,status,priority,scheduled_for,scheduled_time,due_at,estimated_minutes,energy_required,completed_at";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

const emptyViews: Record<
  TaskView,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    action: { label: string; href: string };
  }
> = {
  today: {
    icon: Sun,
    title: "Nothing is due today.",
    description:
      "Capture a task now, or keep the day open for what matters most.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  overdue: {
    icon: AlarmClock,
    title: "Nothing is overdue.",
    description: "You are clear to focus on today’s work.",
    action: { label: "Open Today", href: "/tasks?view=today" },
  },
  upcoming: {
    icon: CalendarDays,
    title: "Nothing is planned ahead.",
    description:
      "Add a task with a date when you are ready to protect the time.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  inbox: {
    icon: Inbox,
    title: "Your inbox is clear.",
    description:
      "Capture loose thoughts here before they compete with today’s plan.",
    action: { label: "Add task", href: "/tasks?create=true" },
  },
  completed: {
    icon: CircleCheck,
    title: "No completed tasks yet.",
    description: "Finish a task and ATLAS will keep the record here.",
    action: { label: "Open Today", href: "/tasks?view=today" },
  },
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; create?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const selected = parseTaskView(params.view);
  const emptyView = emptyViews[selected];
  const highlightId =
    params.highlight && UUID_PATTERN.test(params.highlight)
      ? params.highlight
      : undefined;
  const supabase = await createClient();
  const now = new Date();
  const today = manilaIsoDate(now) ?? now.toISOString().slice(0, 10);
  let tasks: TaskListItem[] = [];
  let selectedTask: TaskListItem | null = null;
  let taskDefaults: {
    default_task_priority: string;
    default_task_estimated_minutes: number | null;
  } | null = null;
  let scheduledTasks: ScheduledTaskSlot[] = [];
  let todayPlan: TodayPlanSummary = summarizeTodayPlan([], "00:00");
  let counts: Partial<Record<TaskView, number>> = {};

  if (supabase) {
    const preferencesQuery = supabase
      .from("user_preferences")
      .select("default_task_priority,default_task_estimated_minutes")
      .maybeSingle();
    let query = supabase.from("tasks").select(TASK_COLUMNS);

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
    } else if (selected === "completed") {
      // Most recently finished first, so the list reads as a log.
      query = query
        .order("completed_at", { ascending: false, nullsFirst: false })
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
    // Today's plan includes what is already finished, so progress can show.
    const todayPlanQuery = supabase
      .from("tasks")
      .select("status,scheduled_time,estimated_minutes")
      .eq("scheduled_for", today)
      .neq("status", "cancelled");
    const openCount = () =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed")
        .neq("status", "cancelled");
    const [
      preferencesResult,
      taskResult,
      scheduledTaskResult,
      todayPlanResult,
      overdueResult,
      upcomingResult,
      inboxResult,
    ] = await Promise.all([
      preferencesQuery,
      query,
      scheduledTasksQuery,
      todayPlanQuery,
      openCount().lt("scheduled_for", today),
      openCount().gt("scheduled_for", today),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "inbox"),
    ]);
    taskDefaults = preferencesResult.data;
    tasks = taskResult.data ?? [];
    scheduledTasks = scheduledTaskResult.data ?? [];
    todayPlan = summarizeTodayPlan(
      todayPlanResult.data ?? [],
      manilaClock(now) ?? "00:00",
    );
    counts = {
      today: todayPlan.remaining,
      overdue: overdueResult.count ?? 0,
      upcoming: upcomingResult.count ?? 0,
      inbox: inboxResult.count ?? 0,
    };
    if (highlightId && !tasks.some((task) => task.id === highlightId)) {
      const { data: highlightedTask } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .eq("id", highlightId)
        .maybeSingle();
      selectedTask = highlightedTask;
    }
  }

  // A task opened from a link that this view would not list leads the page
  // in its own section, so it is never lost among the others.
  const groups: TaskGroup<TaskListItem>[] = [
    ...(selectedTask
      ? [
          {
            id: "selected",
            label: "Selected task",
            detail: null,
            dayInHeading: false,
            tasks: [selectedTask],
          },
        ]
      : []),
    ...groupTasksForView(selected, tasks, today),
  ];

  return (
    <PageShell>
      <TaskCreatePanel
        eyebrow="Task list"
        meta={manilaDateLabel(now)}
        title="Tasks"
        description="Capture quickly. Keep today small enough to finish."
        defaultPriority={taskDefaults?.default_task_priority ?? "medium"}
        defaultEstimatedMinutes={
          taskDefaults?.default_task_estimated_minutes ?? null
        }
        scheduledTasks={scheduledTasks}
        today={today}
        initiallyOpen={params.create === "true"}
      />

      <TaskOverview summary={todayPlan} overdueCount={counts.overdue ?? 0} />

      <TaskViewNav selected={selected} counts={counts} />

      <div className="max-sm:pb-16">
        {groups.length === 0 ? (
          <div className="mt-5 sm:mt-6">
            <EmptyState
              icon={emptyView.icon}
              title={emptyView.title}
              description={emptyView.description}
              action={
                emptyView.action.label === "Add task" ? (
                  <TaskCreateTrigger />
                ) : (
                  <Button asChild size="sm">
                    <Link
                      href={emptyView.action.href as `/tasks?view=${string}`}
                    >
                      {emptyView.action.label}
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <TaskList
            groups={groups}
            today={today}
            highlightId={highlightId}
            scheduledTasks={scheduledTasks}
          />
        )}
      </div>
    </PageShell>
  );
}
