import { format, startOfWeek } from "date-fns";

const MANILA_TIMEZONE = "Asia/Manila";

const shortDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const longDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function manilaIsoDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function toManilaDate(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}

const calendarDateUtc = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const calendarDateManila = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * The app-wide display format for a calendar date: "Sep 30, 2026".
 * Date-only `YYYY-MM-DD` values are shown as stored; timestamps are shown
 * on their Asia/Manila calendar day. Unparseable input is returned as is.
 */
export function formatCalendarDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return calendarDateUtc.format(new Date(`${value}T00:00:00Z`));
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime())
    ? String(value)
    : calendarDateManila.format(date);
}

/** Today's calendar date in Asia/Manila as `YYYY-MM-DD`. */
export function manilaTodayIsoDate(now: Date = new Date()): string {
  return manilaIsoDate(now);
}

/**
 * Whole calendar days from `from` to `to` (both `YYYY-MM-DD`); negative when
 * `to` is earlier than `from`.
 */
export function calendarDaysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

const monthYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

/** "2026-09" → "Sep 2026". */
export function formatCalendarMonth(month: string): string {
  return /^\d{4}-\d{2}$/.test(month)
    ? monthYear.format(new Date(`${month}-01T00:00:00Z`))
    : month;
}

/**
 * Stored weekly-review titles read "Week of 2026-09-14"; show the date in the
 * app-wide style. Other titles pass through unchanged.
 */
export function formatWeekOfTitle(title: string): string {
  const match = /^Week of (\d{4}-\d{2}-\d{2})$/.exec(title);
  return match ? `Week of ${formatCalendarDate(match[1]!)}` : title;
}

export function manilaDateLabel(value: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function weekDates(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

function datePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return parts.find((part) => part.type === type)?.value;
}

export function compactReviewWeekLabel(weekStart: string): string {
  const { start, end } = weekDates(weekStart);
  const startParts = shortDate.formatToParts(start);
  const endParts = shortDate.formatToParts(end);
  const startMonth = datePart(startParts, "month");
  const startDay = datePart(startParts, "day");
  const endMonth = datePart(endParts, "month");
  const endDay = datePart(endParts, "day");

  return startMonth === endMonth
    ? `${startMonth} ${startDay}–${endDay}`
    : `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

export function reviewWeekLabel(weekStart: string): string {
  const { start, end } = weekDates(weekStart);
  const startParts = longDate.formatToParts(start);
  const endParts = longDate.formatToParts(end);
  const startMonth = datePart(startParts, "month");
  const startDay = datePart(startParts, "day");
  const endMonth = datePart(endParts, "month");
  const endDay = datePart(endParts, "day");
  const year = datePart(endParts, "year");

  return startMonth === endMonth
    ? `${startMonth} ${startDay}–${endDay}, ${year}`
    : `${startMonth} ${startDay}–${endMonth} ${endDay}, ${year}`;
}

export function previousManilaDayWindow(value: string | Date): {
  date: string;
  start: string;
  end: string;
} {
  const today = manilaIsoDate(value);
  const todayStart = new Date(`${today}T00:00:00+08:00`);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  return {
    date: manilaIsoDate(yesterdayStart),
    start: yesterdayStart.toISOString(),
    end: todayStart.toISOString(),
  };
}

export function mondayWeekStart(value: string | Date): string {
  return format(
    startOfWeek(toManilaDate(value), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}

export function resolveCalendarMonth(
  requested: unknown,
  fallback: string,
): string {
  return typeof requested === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requested)
    ? requested
    : fallback;
}
