import { formatTaskTime } from "@/lib/tasks/task-time";

const MANILA_TIMEZONE = "Asia/Manila";

const manilaHour = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIMEZONE,
  hour: "numeric",
  hourCycle: "h23",
});
const manilaWeekdayName = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIMEZONE,
  weekday: "short",
});
const manilaDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIMEZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});
const manilaMonth = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIMEZONE,
  month: "long",
});
const manilaClock = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const manilaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type DayPart = "morning" | "afternoon" | "evening";

/** Morning from 5 AM, afternoon from noon, evening from 6 PM, in Manila. */
export function manilaDayPart(now: Date): DayPart {
  const hour = Number(manilaHour.format(now));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

/** "2026-10-01" in Manila. */
export function manilaIsoDate(now: Date): string {
  return manilaDate.format(now);
}

/** "9:05 AM" in Manila, in the app's task-time style. */
export function formatManilaTime(date: Date): string {
  return formatTaskTime(manilaClock.format(date));
}

/** "Thursday, October 1" in Manila. */
export function manilaDayLabel(now: Date): string {
  return manilaDay.format(now);
}

/** "October" in Manila. */
export function manilaMonthName(now: Date): string {
  return manilaMonth.format(now);
}

/** Today in the Monday-to-Sunday review week, in Manila: 0 is Monday. */
export function manilaWeekdayIndex(now: Date): number {
  return WEEKDAYS.indexOf(
    manilaWeekdayName.format(now) as (typeof WEEKDAYS)[number],
  );
}

/**
 * The month's budget from the dashboard snapshot, which reports what is
 * left (planned minus spent) rather than what was planned.
 */
export function budgetUsage(
  remainingCentavos: number | null,
  spentCentavos: number,
): {
  plannedCentavos: number;
  leftCentavos: number;
  /** Share of the plan spent, uncapped; a ₱0 plan with spending is 1. */
  ratio: number;
  over: boolean;
} | null {
  if (remainingCentavos == null) return null;
  const plannedCentavos = remainingCentavos + spentCentavos;
  const ratio =
    plannedCentavos > 0
      ? spentCentavos / plannedCentavos
      : spentCentavos > 0
        ? 1
        : 0;
  return {
    plannedCentavos,
    leftCentavos: remainingCentavos,
    ratio,
    over: remainingCentavos < 0,
  };
}

/** Money in against money out, each as a share of the larger of the two. */
export function cashFlow(incomeCentavos: number, expenseCentavos: number) {
  const scale = Math.max(incomeCentavos, expenseCentavos);
  return {
    netCentavos: incomeCentavos - expenseCentavos,
    incomeShare: scale > 0 ? incomeCentavos / scale : 0,
    expenseShare: scale > 0 ? expenseCentavos / scale : 0,
    empty: scale === 0,
  };
}

/** "Payday today", "Payday tomorrow", or "Payday in 14 days". */
export function paydayLabel(daysUntil: number | null): string | null {
  if (daysUntil == null) return null;
  if (daysUntil <= 0) return "Payday today";
  if (daysUntil === 1) return "Payday tomorrow";
  return `Payday in ${daysUntil} days`;
}

export type ScheduledStop<T> = {
  item: T;
  startsAt: Date;
  endsAt: Date;
};

export type RouteSchedule<T> = {
  stops: ScheduledStop<T>[];
  totalMinutes: number;
  /** The larger of the route and the day's capacity. */
  spanMinutes: number;
  endsAt: Date;
};

/**
 * Lays the route end to end from `now` using each stop's estimate, against
 * the larger of the day's capacity and the route itself. Null when any stop
 * has no estimate, since the times would be guesses.
 */
export function scheduleRoute<T extends { durationMinutes: number | null }>(
  items: T[],
  now: Date,
  capacityMinutes?: number,
): RouteSchedule<T> | null {
  if (!items.length || items.some((item) => !item.durationMinutes)) {
    return null;
  }
  const totalMinutes = items.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0,
  );
  const spanMinutes = Math.max(totalMinutes, capacityMinutes ?? 0);
  let elapsed = 0;
  const stops = items.map((item) => {
    const minutes = item.durationMinutes ?? 0;
    const stop = {
      item,
      startsAt: new Date(now.getTime() + elapsed * 60_000),
      endsAt: new Date(now.getTime() + (elapsed + minutes) * 60_000),
    };
    elapsed += minutes;
    return stop;
  });
  return {
    stops,
    totalMinutes,
    spanMinutes,
    endsAt: new Date(now.getTime() + totalMinutes * 60_000),
  };
}
