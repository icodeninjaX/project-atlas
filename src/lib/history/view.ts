import { formatCentavos } from "@/lib/money/money";
import {
  metricDefinitions,
  type HistoricalMetric,
  type MetricGrain,
  type MetricKey,
} from "./metrics";
import { formatPeriodLabel } from "./period-label";

/** View math for the Recorded history page. Dates are `YYYY-MM-DD`. */

export type HistoryLookback = 1 | 3 | 6 | 12;
export type HistoryCoverage = HistoricalMetric["coverage"];
export type HistoryTone = "positive" | "neutral" | "caution";

export const metricKeys = Object.keys(metricDefinitions) as MetricKey[];
export const historyLookbacks = [1, 3, 6, 12] as const;
export const historyGrains = ["day", "week", "month"] as const;

const DEFAULT_GRAIN: MetricGrain = "month";
const DEFAULT_MONTHS: HistoryLookback = 6;

/** Grain and lookback from the address. Days always look back 30 days. */
export function parseHistoryView(query: { grain?: string; months?: string }): {
  grain: MetricGrain;
  months: HistoryLookback;
} {
  const grain = historyGrains.find((item) => item === query.grain);
  const months = historyLookbacks.find((item) => String(item) === query.months);
  const resolved = grain ?? DEFAULT_GRAIN;
  return {
    grain: resolved,
    months: resolved === "day" ? 1 : (months ?? DEFAULT_MONTHS),
  };
}

/** The page's address for a grain and lookback; the default is bare. */
export function historyHref({
  grain,
  months,
}: {
  grain: MetricGrain;
  months: HistoryLookback;
}) {
  const lookback = grain === "day" ? 1 : months;
  if (grain === DEFAULT_GRAIN && lookback === DEFAULT_MONTHS) return "/history";
  return `/history?grain=${grain}&months=${lookback}`;
}

export type HistoryPoint = {
  /** The calendar bucket. */
  from: string;
  through: string;
  /** The dates actually counted inside it. */
  countedFrom: string;
  countedThrough: string;
  /** Counted dates differ from the calendar bucket. */
  clipped: boolean;
  value: number | null;
  sourceCount: number;
  coverage: HistoryCoverage;
  /** The bucket that holds the last day in view, still running. */
  current: boolean;
};

export type HistoryWindow = { from: string; through: string };

/** One metric's buckets, oldest first, with the dates each one counts. */
export function historyPoints(
  rows: HistoricalMetric[],
  metric: MetricKey,
  window: HistoryWindow,
): HistoryPoint[] {
  return rows
    .filter((row) => row.metric === metric)
    .sort((a, b) => a.period.from.localeCompare(b.period.from))
    .map((row) => {
      const countedFrom = [
        window.from,
        row.period.from,
        row.firstRecordedOn ?? row.period.from,
      ]
        .sort()
        .at(-1)!;
      const countedThrough =
        row.period.through < window.through
          ? row.period.through
          : window.through;
      return {
        from: row.period.from,
        through: row.period.through,
        countedFrom,
        countedThrough,
        clipped:
          row.coverage !== "insufficient" &&
          (countedFrom !== row.period.from ||
            countedThrough !== row.period.through),
        value: row.value,
        sourceCount: row.sourceCount,
        coverage: row.coverage,
        current:
          row.period.from <= window.through &&
          row.period.through >= window.through,
      };
    });
}

export type HistorySeries = {
  metric: MetricKey;
  points: HistoryPoint[];
  /** The earliest surviving source for this metric, anywhere in time. */
  firstRecordedOn: string | null;
  /**
   * The window's total, or for the review score the mean of every score in
   * it. Null when no bucket in view has a value.
   */
  headline: number | null;
  /** Source records counted in the window. */
  sources: number;
  /** Buckets with a value. */
  valued: number;
  /** Mean of fully recorded buckets; null with fewer than two. */
  typical: number | null;
  typicalCount: number;
  /** The highest bucket above zero. */
  peak: HistoryPoint | null;
  /** Top of the chart scale: ten for scores, else the largest value. */
  scaleMax: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizeSeries(
  rows: HistoricalMetric[],
  metric: MetricKey,
  window: HistoryWindow,
): HistorySeries {
  const points = historyPoints(rows, metric, window);
  const score = metricDefinitions[metric].unit === "score";
  const valued = points.filter(
    (point): point is HistoryPoint & { value: number } => point.value !== null,
  );
  const sources = points.reduce((sum, point) => sum + point.sourceCount, 0);

  let headline: number | null = null;
  if (valued.length) {
    if (score) {
      // Each bucket is a mean over its scores, so weight by how many.
      const weight = valued.reduce((sum, point) => sum + point.sourceCount, 0);
      headline = weight
        ? round2(
            valued.reduce(
              (sum, point) => sum + point.value * point.sourceCount,
              0,
            ) / weight,
          )
        : null;
    } else {
      headline = valued.reduce((sum, point) => sum + point.value, 0);
    }
  }

  const complete = valued.filter((point) => point.coverage === "recorded");
  const typical =
    complete.length >= 2
      ? complete.reduce((sum, point) => sum + point.value, 0) / complete.length
      : null;

  let peak: HistoryPoint | null = null;
  for (const point of valued)
    if (point.value > 0 && (!peak || point.value >= peak.value!)) peak = point;

  const largest = Math.max(0, ...valued.map((point) => point.value));
  return {
    metric,
    points,
    firstRecordedOn:
      rows.find((row) => row.metric === metric && row.firstRecordedOn)
        ?.firstRecordedOn ?? null,
    headline,
    sources,
    valued: valued.length,
    typical: typical === null ? null : score ? round2(typical) : typical,
    typicalCount: complete.length,
    peak,
    scaleMax: score ? 10 : largest || 1,
  };
}

export type HistoryOverview = {
  /** Source records behind every value in view. */
  records: number;
  /** Series with a value somewhere in view. */
  withHistory: number;
  /** Series with any surviving source at all. */
  everRecorded: number;
  money: {
    income: number | null;
    expenses: number | null;
    debtPayments: number | null;
    incomeSources: number;
    expenseSources: number;
    debtSources: number;
    /** Income less expenses, when both have history in view. */
    net: number | null;
  };
  status: { tone: HistoryTone; label: string };
};

export function summarizeHistory(series: HistorySeries[]): HistoryOverview {
  const find = (metric: MetricKey) =>
    series.find((item) => item.metric === metric);
  const income = find("income_centavos");
  const expenses = find("expense_centavos");
  const debt = find("debt_payments_centavos");
  const withHistory = series.filter((item) => item.valued > 0).length;
  const everRecorded = series.filter((item) => item.firstRecordedOn).length;
  const total = series.length;

  const status: HistoryOverview["status"] =
    everRecorded === 0
      ? { tone: "neutral", label: "Nothing recorded yet" }
      : withHistory === 0
        ? { tone: "caution", label: "No history in this window" }
        : withHistory === total
          ? { tone: "positive", label: "Every series has history" }
          : {
              tone: "neutral",
              label: `${withHistory} of ${total} series have history`,
            };

  const incomeValue = income?.headline ?? null;
  const expenseValue = expenses?.headline ?? null;
  return {
    records: series.reduce((sum, item) => sum + item.sources, 0),
    withHistory,
    everRecorded,
    money: {
      income: incomeValue,
      expenses: expenseValue,
      debtPayments: debt?.headline ?? null,
      incomeSources: income?.sources ?? 0,
      expenseSources: expenses?.sources ?? 0,
      debtSources: debt?.sources ?? 0,
      net:
        incomeValue !== null && expenseValue !== null
          ? incomeValue - expenseValue
          : null,
    },
    status,
  };
}

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

/** The bucket as a calendar label: "Sep 2026", "Sep 21–27", "Sep 3". */
export function pointLabel(point: HistoryPoint, contextYear: number) {
  return formatPeriodLabel(point.from, point.through, { contextYear });
}

/** The dates a clipped bucket counts: "Sep 3–24". */
export function countedLabel(point: HistoryPoint, contextYear: number) {
  return formatPeriodLabel(point.countedFrom, point.countedThrough, {
    contextYear,
  });
}

/** A short axis label: "May", "Dec 2025", "Sep 21", or "Today". */
export function axisLabel(
  point: HistoryPoint,
  grain: MetricGrain,
  contextYear: number,
  today: string,
) {
  const [year, month, day] = point.from.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const name = monthNames[month - 1];
  if (grain === "month") return year === contextYear ? name : `${name} ${year}`;
  if (grain === "day" && point.from === today) return "Today";
  return year === contextYear ? `${name} ${day}` : `${name} ${day}, ${year}`;
}

const grainWords: Record<MetricGrain, [one: string, many: string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
};

/** "6 months", "1 week". */
export function countGrain(count: number, grain: MetricGrain) {
  return `${count} ${grainWords[grain][count === 1 ? 0 : 1]}`;
}

export function grainWord(grain: MetricGrain) {
  return grainWords[grain][0];
}

/** A value in its unit: "₱85,000.00", "63", "6.50 / 10". */
export function formatMetricValue(metric: MetricKey, value: number) {
  const unit = metricDefinitions[metric].unit;
  if (unit === "centavos") return formatCentavos(Math.round(value));
  if (unit === "score") return `${value.toFixed(2)} / 10`;
  return Math.round(value).toLocaleString("en-PH");
}

export function coverageLabel(metric: MetricKey, coverage: HistoryCoverage) {
  if (coverage === "recorded") return "Recorded";
  if (coverage === "partial") return "Partial";
  return metricDefinitions[metric].unit === "score" ? "No score" : "No history";
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString("en-PH")} ${count === 1 ? one : many}`;
}
