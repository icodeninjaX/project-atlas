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
