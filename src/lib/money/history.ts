const weekdayDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const weekdayDateYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function utcDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** Moves a `YYYY-MM-DD` calendar date by whole days. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const date = utcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * A day heading for money history: "Today", "Yesterday", or "Mon, Sep 29"
 * (with the year once it differs from today's).
 */
export function relativeDayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Today";
  if (isoDate === shiftIsoDate(today, -1)) return "Yesterday";
  const date = utcDate(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return isoDate.slice(0, 4) === today.slice(0, 4)
    ? weekdayDate.format(date)
    : weekdayDateYear.format(date);
}

/** "Sep 29" — the compact date beside a relative day heading. */
export function formatShortDate(isoDate: string): string {
  const date = utcDate(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : shortDate.format(date);
}

/** Groups items that are already sorted newest-first into day buckets. */
export function groupByDate<T>(
  items: readonly T[],
  dateOf: (item: T) => string,
): Array<{ date: string; items: T[] }> {
  const groups: Array<{ date: string; items: T[] }> = [];
  for (const item of items) {
    const date = dateOf(item);
    const last = groups.at(-1);
    if (last?.date === date) last.items.push(item);
    else groups.push({ date, items: [item] });
  }
  return groups;
}

/**
 * Splits a formatted peso amount into its whole part and centavos so the
 * centavos can be set quieter: "₱183,626.35" → ["₱183,626", ".35"].
 */
export function splitFormattedMoney(value: string): {
  whole: string;
  fraction: string;
} {
  const index = value.lastIndexOf(".");
  if (index === -1) return { whole: value, fraction: "" };
  return { whole: value.slice(0, index), fraction: value.slice(index) };
}

/**
 * Reads a peso amount as the user types it, or null while it is not yet a
 * valid positive amount. Mirrors the server's parsing rules.
 */
export function parsePesoInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [pesos = "0", decimals = ""] = normalized.split(".");
  const centavos = Number(pesos) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/**
 * Keeps a typed amount to digits, separators, and at most two decimals, so
 * the field never holds something the server will reject.
 */
export function sanitizePesoInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole.slice(0, 13);
  return `${whole.slice(0, 13)}.${rest.join("").replaceAll(",", "").slice(0, 2)}`;
}

/** Formats a valid typed amount as "1,234.50" once the field loses focus. */
export function formatPesoInput(value: string): string {
  const centavos = parsePesoInput(value);
  if (centavos === null) return value;
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
