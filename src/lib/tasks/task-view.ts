import {
  formatShortDate,
  relativeDayLabel,
  shiftIsoDate,
} from "@/lib/money/history";
import { formatTaskTime, taskTimeInputValue } from "@/lib/tasks/task-time";

const MANILA_TIMEZONE = "Asia/Manila";

export const TASK_VIEWS = [
  "today",
  "overdue",
  "upcoming",
  "inbox",
  "completed",
] as const;

export type TaskView = (typeof TASK_VIEWS)[number];

/** Unknown or missing `?view=` values open Today. */
export function parseTaskView(value: string | undefined): TaskView {
  return TASK_VIEWS.find((view) => view === value) ?? "today";
}

export type TaskListItem = {
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
  completed_at: string | null;
};

export type TaskGroup<T> = {
  id: string;
  label: string;
  /** A quieter note beside the label, such as the date beside "Tomorrow". */
  detail: string | null;
  /** The label names the day, so rows only need to show the time. */
  dayInHeading: boolean;
  tasks: T[];
};

const manilaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const manilaClockParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function validDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The Asia/Manila calendar day of a timestamp, as `YYYY-MM-DD`. */
export function manilaIsoDate(value: string | Date): string | null {
  const date = validDate(value);
  return date ? manilaDate.format(date) : null;
}

/** The Asia/Manila wall-clock time of a timestamp, as `HH:MM`. */
export function manilaClock(value: string | Date): string | null {
  const date = validDate(value);
  if (!date) return null;
  const parts = manilaClockParts.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return hour && minute ? `${hour}:${minute}` : null;
}

/** "3:42 PM" for a timestamp, read on the Asia/Manila clock. */
export function manilaTimeLabel(value: string | Date): string | null {
  const clock = manilaClock(value);
  return clock ? formatTaskTime(clock) : null;
}

/** A day heading for tasks: Today, Yesterday, Tomorrow, or "Mon, Sep 29". */
export function taskDayLabel(isoDate: string, today: string): string {
  if (isoDate === shiftIsoDate(today, 1)) return "Tomorrow";
  return relativeDayLabel(isoDate, today);
}

/** Whole calendar days from `isoDate` to `today`; 0 when it is not past. */
export function daysOverdue(isoDate: string, today: string): number {
  const from = Date.parse(`${isoDate}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** "25 min", "1 h", "1 h 30 min"; `compact` gives "1h 30m" for tight tiles. */
export function formatTaskMinutes(
  minutes: number,
  { compact = false }: { compact?: boolean } = {},
): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const h = compact ? "h" : " h";
  const m = compact ? "m" : " min";
  if (hours === 0) return `${rest}${m}`;
  return rest === 0 ? `${hours}${h}` : `${hours}${h} ${rest}${m}`;
}

function relativeDetail(label: string, isoDate: string) {
  return label === "Today" || label === "Yesterday" || label === "Tomorrow"
    ? formatShortDate(isoDate)
    : null;
}

/** Groups tasks that are already sorted for their view into day buckets. */
function groupByDay<T>(
  tasks: readonly T[],
  dayOf: (task: T) => string | null,
  today: string,
): TaskGroup<T>[] {
  const groups: TaskGroup<T>[] = [];
  for (const task of tasks) {
    const day = dayOf(task);
    const id = day ?? "no-date";
    const last = groups.at(-1);
    if (last?.id === id) {
      last.tasks.push(task);
      continue;
    }
    const label = day ? taskDayLabel(day, today) : "No date";
    groups.push({
      id,
      label,
      detail: day ? relativeDetail(label, day) : null,
      dayInHeading: day !== null,
      tasks: [task],
    });
  }
  return groups;
}

/**
 * Splits a view's tasks into the sections the list shows: Today by
 * scheduled and anytime, Overdue and Upcoming by their day, Completed by the
 * day each was finished, and the Inbox as one list.
 */
export function groupTasksForView<
  T extends Pick<
    TaskListItem,
    "scheduled_for" | "scheduled_time" | "completed_at"
  >,
>(view: TaskView, tasks: readonly T[], today: string): TaskGroup<T>[] {
  if (tasks.length === 0) return [];

  switch (view) {
    case "today": {
      const scheduled = tasks.filter((task) => task.scheduled_time);
      const anytime = tasks.filter((task) => !task.scheduled_time);
      const groups: TaskGroup<T>[] = [
        {
          id: "scheduled",
          label: "Scheduled",
          detail: null,
          dayInHeading: true,
          tasks: scheduled,
        },
        {
          id: "anytime",
          label: "Anytime",
          detail: null,
          dayInHeading: true,
          tasks: anytime,
        },
      ];
      return groups.filter((group) => group.tasks.length > 0);
    }
    case "overdue":
    case "upcoming":
      return groupByDay(tasks, (task) => task.scheduled_for, today);
    case "completed":
      return groupByDay(
        tasks,
        (task) => (task.completed_at ? manilaIsoDate(task.completed_at) : null),
        today,
      );
    case "inbox":
      return [
        {
          id: "inbox",
          label: "Not yet planned",
          detail: "newest first",
          dayInHeading: false,
          tasks: [...tasks],
        },
      ];
  }
}

export type TodayPlanSummary = {
  /** Tasks scheduled for today, finished or not. */
  total: number;
  done: number;
  remaining: number;
  /** Estimated minutes across the unfinished tasks that have an estimate. */
  minutesLeft: number;
  /** The earliest unfinished exact time still ahead today, as `HH:MM`. */
  nextTime: string | null;
};

/** Today's plan at a glance, read against the current Manila clock. */
export function summarizeTodayPlan(
  tasks: ReadonlyArray<
    Pick<TaskListItem, "status" | "scheduled_time" | "estimated_minutes">
  >,
  now: string,
): TodayPlanSummary {
  const plan = tasks.filter((task) => task.status !== "cancelled");
  const open = plan.filter((task) => task.status !== "completed");
  const nextTime =
    open
      .map((task) => taskTimeInputValue(task.scheduled_time))
      .filter((time) => time !== "" && time >= now)
      .sort()[0] ?? null;

  return {
    total: plan.length,
    done: plan.length - open.length,
    remaining: open.length,
    minutesLeft: open.reduce(
      (sum, task) => sum + (task.estimated_minutes ?? 0),
      0,
    ),
    nextTime,
  };
}
