import { z } from "zod";

export const HISTORICAL_METRICS_VERSION = "1" as const;
export const metricDefinitions = {
  income_centavos: {
    label: "Recorded income",
    unit: "centavos",
    href: "/money/transactions",
    source: "Surviving income transactions by transaction date",
  },
  expense_centavos: {
    label: "Recorded expenses",
    unit: "centavos",
    href: "/money/transactions",
    source:
      "Surviving expense transactions by transaction date; transfers excluded",
  },
  debt_payments_centavos: {
    label: "Recorded debt payments",
    unit: "centavos",
    href: "/debts",
    source:
      "Surviving debt payments by payment date; not historical debt balances",
  },
  task_completions: {
    label: "Task completions",
    unit: "count",
    href: "/tasks",
    source:
      "Surviving completed tasks by completion timestamp in Asia/Manila; reopened tasks are excluded",
  },
  knowledge_reviews: {
    label: "Knowledge reviews",
    unit: "count",
    href: "/knowledge",
    source: "Surviving knowledge reviews by review timestamp in Asia/Manila",
  },
  review_overall_score: {
    label: "Weekly review score",
    unit: "score",
    href: "/reviews",
    source:
      "Mean overall score from completed weekly reviews by week start; missing weeks have no score",
  },
} as const;

export type MetricKey = keyof typeof metricDefinitions;
export type MetricGrain = "day" | "week" | "month";

export function historicalBucketCount(
  from: string,
  through: string,
  grain: MetricGrain,
) {
  const first = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${through}T00:00:00Z`);
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(last.getTime()) ||
    first > last
  )
    return Infinity;
  if (grain === "month")
    return (
      (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
      last.getUTCMonth() -
      first.getUTCMonth() +
      1
    );
  if (grain === "week") {
    const monday = (date: Date) => {
      const value = new Date(date);
      value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
      return value.getTime();
    };
    return (monday(last) - monday(first)) / (7 * 86_400_000) + 1;
  }
  return (last.getTime() - first.getTime()) / 86_400_000 + 1;
}

const isoDate = z.iso.date();
const metricKey = z.enum(
  Object.keys(metricDefinitions) as [MetricKey, ...MetricKey[]],
);
const rowSchema = z
  .object({
    metric_key: metricKey,
    period_start: isoDate,
    period_end: isoDate,
    value: z.union([z.number(), z.string(), z.null()]),
    source_count: z.union([z.number(), z.string()]),
    coverage: z.enum(["recorded", "partial", "insufficient"]),
    first_recorded_on: isoDate.nullable(),
  })
  .strict();

export type HistoricalMetric = {
  metric: MetricKey;
  period: { from: string; through: string };
  value: number | null;
  sourceCount: number;
  coverage: "recorded" | "partial" | "insufficient";
  firstRecordedOn: string | null;
};

/** Validate the RPC boundary before rendering or passing any value to Analyst. */
function expectedPeriods(from: string, through: string, grain: MetricGrain) {
  const start = new Date(`${isoDate.parse(from)}T00:00:00Z`);
  const end = new Date(`${isoDate.parse(through)}T00:00:00Z`);
  if (grain === "week")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (grain === "month") start.setUTCDate(1);
  const periods = new Map<string, string>();
  while (start <= end) {
    const beginning = start.toISOString().slice(0, 10);
    const ending = new Date(start);
    if (grain === "day") ending.setUTCDate(ending.getUTCDate() + 1);
    else if (grain === "week") ending.setUTCDate(ending.getUTCDate() + 7);
    else ending.setUTCMonth(ending.getUTCMonth() + 1);
    const next = ending.toISOString().slice(0, 10);
    ending.setUTCDate(ending.getUTCDate() - 1);
    periods.set(beginning, ending.toISOString().slice(0, 10));
    start.setUTCFullYear(
      Number(next.slice(0, 4)),
      Number(next.slice(5, 7)) - 1,
      Number(next.slice(8, 10)),
    );
  }
  return periods;
}

export function parseHistoricalMetrics(
  raw: unknown,
  expected?: { from: string; through: string; grain: MetricGrain },
): HistoricalMetric[] {
  const rows = z.array(rowSchema).max(540).parse(raw);
  const periods = expected
    ? expectedPeriods(expected.from, expected.through, expected.grain)
    : null;
  if (
    periods &&
    rows.length !== periods.size * Object.keys(metricDefinitions).length
  )
    throw new Error("Incomplete historical metric series");
  const seen = new Set<string>();
  return rows.map((row) => {
    const key = `${row.metric_key}:${row.period_start}`;
    if (
      seen.has(key) ||
      row.period_start > row.period_end ||
      (periods && periods.get(row.period_start) !== row.period_end)
    )
      throw new Error("Invalid historical metric periods");
    seen.add(key);
    const sourceCount = Number(row.source_count);
    const value = row.value === null ? null : Number(row.value);
    if (
      !Number.isSafeInteger(sourceCount) ||
      sourceCount < 0 ||
      (value !== null &&
        (!Number.isFinite(value) ||
          value < 0 ||
          (metricDefinitions[row.metric_key].unit === "score" &&
            (value < 1 || value > 10)) ||
          (metricDefinitions[row.metric_key].unit !== "score" &&
            !Number.isSafeInteger(value)))) ||
      (row.coverage === "insufficient" && value !== null) ||
      (row.coverage !== "insufficient" && value === null) ||
      (row.first_recorded_on === null && row.coverage !== "insufficient")
    )
      throw new Error("Invalid historical metric value");
    return {
      metric: row.metric_key,
      period: { from: row.period_start, through: row.period_end },
      value,
      sourceCount,
      coverage: row.coverage,
      firstRecordedOn: row.first_recorded_on,
    };
  });
}

export function historicalWindow(
  today: string,
  grain: MetricGrain,
  months: 1 | 3 | 6 | 12,
) {
  const parsed = isoDate.parse(today);
  const date = new Date(`${parsed}T00:00:00Z`);
  if (grain === "day") {
    date.setUTCDate(date.getUTCDate() - 29);
  } else if (grain === "week") {
    date.setUTCDate(date.getUTCDate() - Math.min(months * 30 - 1, 365));
  } else {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - months + 1);
  }
  return { from: date.toISOString().slice(0, 10), through: today };
}
