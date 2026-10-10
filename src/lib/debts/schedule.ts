import { calendarDaysBetween } from "@/lib/dates/dates";

/**
 * A debt's monthly due date. The next due date is stored; the day of the
 * month it repeats on is kept beside it so a short month (Feb 28) does not
 * drag a debt due on the 31st forward for good.
 */

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function parts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return { year, monthIndex: month - 1, day };
}

function iso(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** The due date a month after `dueDate`, on `dueDay` where the month has it. */
export function followingDueDate(dueDate: string, dueDay: number | null) {
  const { year, monthIndex, day } = parts(dueDate);
  const target = new Date(Date.UTC(year, monthIndex + 1, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  const wanted = dueDay ?? day;
  return iso(
    targetYear,
    targetMonth,
    Math.min(wanted, daysInMonth(targetYear, targetMonth)),
  );
}

/**
 * The day of the month a debt repeats on, read from its next due date. A
 * date on the last day of a short month keeps a later day already saved,
 * so Feb 28 for a debt due on the 31st stays the 31st.
 */
export function dueDayFor(nextDueDate: string, savedDueDay: number | null) {
  const { year, monthIndex, day } = parts(nextDueDate);
  const lastDay = daysInMonth(year, monthIndex);
  if (savedDueDay !== null && day === lastDay && savedDueDay > day) {
    return savedDueDay;
  }
  return day;
}

/**
 * Whether a payment made today most likely settles the bill due on
 * `nextDueDate`: it is overdue, or due within about two weeks. A payment
 * further ahead is more often an extra one, so it is left to the person.
 */
export const SETTLES_WITHIN_DAYS = 15;

export function settlesDueByDefault(
  nextDueDate: string | null,
  paymentDate: string,
) {
  if (!nextDueDate) return false;
  const days = calendarDaysBetween(paymentDate, nextDueDate);
  return !Number.isNaN(days) && days <= SETTLES_WITHIN_DAYS;
}
