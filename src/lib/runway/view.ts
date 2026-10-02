import type { RunwayAnalysis } from "@/lib/runway/engine";

/**
 * Presentation math for the runway page: the headline figure, the month
 * track, and when the funds would run out. Dates are YYYY-MM-DD in Manila.
 */

export type RunwayTone = "positive" | "caution" | "destructive";

/** The headline split into its figure and unit, e.g. "4.5" and "months". */
export function runwayFigure(months: number | null): {
  value: string;
  unit: string;
} {
  if (months === null || !Number.isFinite(months)) {
    return { value: "—", unit: "" };
  }
  if (months < 0.1) return { value: "<0.1", unit: "months" };
  if (months >= 99) return { value: "99+", unit: "months" };
  return { value: months.toFixed(1), unit: "months" };
}

/** At least six months, and at most two years, of track to draw. */
export const MIN_TRACK_MONTHS = 6;
export const MAX_TRACK_MONTHS = 24;

/** How many months the track shows: past both the runway and the target. */
export function trackMonths(runwayMonths: number, targetMonths: number) {
  const reach = Math.max(Math.ceil(runwayMonths), targetMonths) + 1;
  return Math.min(Math.max(reach, MIN_TRACK_MONTHS), MAX_TRACK_MONTHS);
}

export function runwayStatus(
  runwayMonths: number,
  targetMonths: number,
): { tone: RunwayTone; label: string } {
  if (runwayMonths < 1) return { tone: "destructive", label: "Under a month" };
  if (runwayMonths < targetMonths) {
    return { tone: "caution", label: `Below ${targetMonths}-month target` };
  }
  return { tone: "positive", label: `${targetMonths}-month target met` };
}

function parseIsoDate(isoDate: string) {
  const [year = 1970, month = 1, day = 1] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The date `whole` calendar months on, kept inside shorter months. */
function addWholeMonths(isoDate: string, whole: number): Date {
  const { year, month, day } = parseIsoDate(isoDate);
  const target = new Date(Date.UTC(year, month - 1 + whole, 1));
  const lastDay = daysInMonth(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
  );
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/**
 * The date a number of months after `isoDate`. Whole months follow the
 * calendar; the fraction is a share of the month that follows.
 */
export function addMonths(isoDate: string, months: number): string {
  const whole = Math.floor(months);
  const start = addWholeMonths(isoDate, whole);
  const next = addWholeMonths(isoDate, whole + 1);
  const span = next.getTime() - start.getTime();
  const end = new Date(start.getTime() + Math.round((months - whole) * span));
  return end.toISOString().slice(0, 10);
}

const monthName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
});
const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
});

function asUtcDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

/**
 * When the funds would run out, as a person would say it: "October 14"
 * within the next two months, "mid-February 2027" further out. Null when
 * the runway is too long to name a date.
 */
export function runwayEndLabel(
  todayIso: string,
  runwayMonths: number,
): string | null {
  if (!Number.isFinite(runwayMonths) || runwayMonths >= 99) return null;
  const endIso = addMonths(todayIso, Math.max(runwayMonths, 0));
  const end = parseIsoDate(endIso);
  const name = monthName.format(asUtcDate(endIso));
  const sameYear = end.year === parseIsoDate(todayIso).year;

  if (runwayMonths < 2) {
    return `${name} ${end.day}${sameYear ? "" : `, ${end.year}`}`;
  }
  const part = end.day <= 10 ? "early " : end.day <= 20 ? "mid-" : "late ";
  return `${part}${name} ${end.year}`;
}

/**
 * The label under the track's month `index` (0 is the month from today):
 * the calendar month it mostly covers, with the year on January.
 */
export function trackMonthLabel(todayIso: string, index: number): string {
  const midpoint = addMonths(todayIso, index + 0.5);
  const { year, month } = parseIsoDate(midpoint);
  const name = monthShort.format(asUtcDate(midpoint));
  return month === 1 ? `${name} ’${String(year).slice(-2)}` : name;
}

/** A monthly amount as a day's share of the year. */
export function dailyCentavos(monthlyCentavos: number) {
  return Math.round((monthlyCentavos * 12) / 365);
}

/** "1.5 months", "1 month", "0.4 months": one decimal unless whole. */
export function formatMonthCount(months: number) {
  const rounded = Math.round(months * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? "month" : "months"}`;
}

const monthYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});
const monthYearLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const list = new Intl.ListFormat("en", { type: "conjunction" });

/**
 * Where the monthly need comes from: "Average of Jul, Aug, and Sep 2026",
 * with a year on each month when they span two, or "Planned in the October
 * 2026 budget".
 */
export function baselineDescription(analysis: RunwayAnalysis): string {
  const months = [...analysis.includedMonths].sort();
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return "No baseline yet";
  if (analysis.baselineSource === "budget") {
    return `Planned in the ${monthYearLong.format(asUtcDate(first))} budget`;
  }
  if (analysis.baselineSource !== "historical") return "No baseline yet";
  if (first.slice(0, 4) !== last.slice(0, 4)) {
    return `Average of ${list.format(months.map((month) => monthYear.format(asUtcDate(month))))}`;
  }
  const names = months.map((month) => monthShort.format(asUtcDate(month)));
  return `Average of ${list.format(names)} ${last.slice(0, 4)}`;
}
