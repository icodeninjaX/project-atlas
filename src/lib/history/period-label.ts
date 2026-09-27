const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Compact label for an inclusive `YYYY-MM-DD` date range, e.g.
 * "Sep 26, 2026", "Sep 2026", "Sep 21–27, 2026", "Sep 28 – Oct 4, 2026",
 * or "Dec 29, 2025 – Jan 4, 2026". Pass `contextYear` to drop the year from
 * day and range labels that fall entirely within that year ("Sep 21–27");
 * whole-month labels keep it ("Sep 2026").
 */
export function formatPeriodLabel(
  from: string,
  through: string,
  { contextYear }: { contextYear?: number } = {},
) {
  const start = parts(from);
  const end = parts(through);
  const startMonth = monthNames[start.month - 1];
  const endMonth = monthNames[end.month - 1];

  const sameYear = start.year === end.year;
  const year = sameYear && start.year === contextYear ? "" : `, ${start.year}`;

  if (from === through) return `${startMonth} ${start.day}${year}`;

  const sameMonth = sameYear && start.month === end.month;
  if (
    sameMonth &&
    start.day === 1 &&
    end.day === lastDayOfMonth(end.year, end.month)
  ) {
    return `${startMonth} ${start.year}`;
  }
  if (sameMonth) {
    return `${startMonth} ${start.day}–${end.day}${year}`;
  }
  if (sameYear) {
    return `${startMonth} ${start.day} – ${endMonth} ${end.day}${year}`;
  }
  return `${startMonth} ${start.day}, ${start.year} – ${endMonth} ${end.day}, ${end.year}`;
}
