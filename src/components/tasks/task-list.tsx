import {
  AlarmClock,
  CalendarDays,
  CircleCheck,
  Clock3,
  Flag,
  Hourglass,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { TaskStatusForm } from "@/components/tasks/task-status-form";
import { formatCalendarDate } from "@/lib/dates/dates";
import { getTaskPriorityTone } from "@/lib/tasks/priority";
import { formatTaskTime, type ScheduledTaskSlot } from "@/lib/tasks/task-time";
import {
  daysOverdue,
  formatTaskMinutes,
  manilaTimeLabel,
  type TaskGroup,
  type TaskListItem,
} from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type MetaTone = "muted" | "primary" | "attention" | "positive";

const metaToneClasses: Record<MetaTone, string> = {
  muted: "text-muted-foreground",
  primary: "text-primary font-semibold",
  attention: "text-destructive font-semibold",
  positive: "text-positive font-semibold",
};

function MetaItem({
  icon: Icon,
  tone = "muted",
  className,
  children,
}: {
  icon: LucideIcon;
  tone?: MetaTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5",
        metaToneClasses[tone],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * When the task happens, worded for where it is shown: a section that is
 * already a day only needs the time, other sections need the date too.
 */
function ScheduleMeta({
  task,
  today,
  dayInHeading,
}: {
  task: TaskListItem;
  today: string;
  dayInHeading: boolean;
}) {
  if (task.status === "completed") {
    const doneAt = task.completed_at
      ? manilaTimeLabel(task.completed_at)
      : null;
    return doneAt ? (
      <MetaItem icon={CircleCheck} tone="positive">
        Done {doneAt}
      </MetaItem>
    ) : null;
  }
  if (!task.scheduled_for) return null;

  const time = task.scheduled_time ? formatTaskTime(task.scheduled_time) : null;
  const late = daysOverdue(task.scheduled_for, today);
  if (late > 0) {
    return (
      <MetaItem icon={AlarmClock} tone="attention">
        {late === 1 ? "1 day overdue" : `${late} days overdue`}
        {time ? ` · ${time}` : ""}
      </MetaItem>
    );
  }
  if (dayInHeading) {
    return time ? (
      <MetaItem icon={Clock3} tone="primary">
        {time}
      </MetaItem>
    ) : null;
  }
  return (
    <MetaItem
      icon={CalendarDays}
      tone={task.scheduled_for === today ? "primary" : "muted"}
    >
      {task.scheduled_for === today
        ? "Today"
        : formatCalendarDate(task.scheduled_for)}
      {time ? ` at ${time}` : ""}
    </MetaItem>
  );
}

function TaskRow({
  task,
  today,
  dayInHeading,
  highlighted,
  scheduledTasks,
}: {
  task: TaskListItem;
  today: string;
  dayInHeading: boolean;
  highlighted: boolean;
  scheduledTasks: ScheduledTaskSlot[];
}) {
  const completed = task.status === "completed";
  const tone = getTaskPriorityTone(task.priority);
  const scheduledLabel = task.scheduled_for
    ? `${formatCalendarDate(task.scheduled_for)}${
        task.scheduled_time ? ` at ${formatTaskTime(task.scheduled_time)}` : ""
      }`
    : null;

  return (
    <li
      id={`task-${task.id}`}
      className={cn(
        "relative scroll-mt-24 first:rounded-t-2xl last:rounded-b-2xl",
        highlighted && "bg-primary/[0.07]",
      )}
    >
      {highlighted ? (
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-2.5 left-0 w-1 rounded-r-full"
        />
      ) : null}
      <div className="flex items-start gap-1 px-1.5 py-1.5 sm:gap-1.5 sm:px-2.5 sm:py-2">
        <TaskStatusForm
          taskId={task.id}
          title={task.title}
          completed={completed}
          priority={task.priority}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 pt-2.5 pb-2.5 sm:pt-2">
          <p
            className={cn(
              "text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words",
              completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.description ? (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[0.8125rem] leading-5 break-words">
              {task.description}
            </p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
            <ScheduleMeta
              task={task}
              today={today}
              dayInHeading={dayInHeading}
            />
            {task.estimated_minutes ? (
              <MetaItem icon={Hourglass}>
                {formatTaskMinutes(task.estimated_minutes)}
              </MetaItem>
            ) : null}
            <MetaItem icon={Flag} className={tone.text}>
              {sentenceCase(task.priority)}
            </MetaItem>
            {/* Medium is the default, so only a departure from it is noted. */}
            {task.energy_required !== "medium" ? (
              <MetaItem icon={Zap}>
                {sentenceCase(task.energy_required)} energy
              </MetaItem>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 pt-0.5 sm:pt-0">
          <TaskActionsMenu
            task={task}
            scheduledLabel={scheduledLabel}
            scheduledTasks={scheduledTasks}
          />
        </div>
      </div>
    </li>
  );
}

function groupSummary(tasks: readonly TaskListItem[]) {
  const count = tasks.length === 1 ? "1 task" : `${tasks.length} tasks`;
  const minutes = tasks.reduce(
    (sum, task) =>
      task.status === "completed" ? sum : sum + (task.estimated_minutes ?? 0),
    0,
  );
  return minutes > 0 ? `${count} · ${formatTaskMinutes(minutes)}` : count;
}

/**
 * A view's tasks in titled sections. Sections headed by a day show only
 * each task's time; the others spell out the date.
 */
export function TaskList({
  groups,
  today,
  highlightId,
  scheduledTasks,
}: {
  groups: TaskGroup<TaskListItem>[];
  today: string;
  highlightId?: string;
  scheduledTasks: ScheduledTaskSlot[];
}) {
  return (
    <div className="mt-5 space-y-6 sm:mt-6">
      {groups.map((group) => {
        const headingId = `task-group-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={headingId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
              <h2 id={headingId} className="text-sm font-semibold">
                {group.label}
                {group.detail ? (
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    {group.detail}
                  </span>
                ) : null}
              </h2>
              <p className="text-muted-foreground font-mono text-xs">
                {groupSummary(group.tasks)}
              </p>
            </div>
            <ul className="border-border bg-card divide-border mt-2 divide-y rounded-2xl border shadow-[0_1px_2px_rgb(7_10_15/0.04),0_16px_40px_-28px_rgb(7_10_15/0.35)]">
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  dayInHeading={group.dayInHeading}
                  highlighted={task.id === highlightId}
                  scheduledTasks={scheduledTasks}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
