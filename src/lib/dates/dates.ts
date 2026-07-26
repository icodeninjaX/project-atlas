import { format, startOfWeek } from "date-fns";

const MANILA_TIMEZONE = "Asia/Manila";

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

export function mondayWeekStart(value: string | Date): string {
  return format(
    startOfWeek(toManilaDate(value), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}
