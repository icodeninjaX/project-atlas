import {
  metricDefinitions,
  type HistoricalMetric,
  type MetricKey,
} from "./metrics";

export const ASSOCIATION_VERSION = "1" as const;
export const ASSOCIATION_MONTHS = 11;
export const ASSOCIATION_TESTS = 15; // Every unordered pair of the six supported metrics.
const PERMUTATIONS = 20_000;
const MIN_ACTIVE_MONTHS = 6;
const MIN_SOURCE_RECORDS = 12;
const MIN_ABS_CORRELATION = 0.75;
const MIN_LEAVE_ONE_OUT = 0.55;
const MAX_ADJUSTED_P = 0.01;

export function associationWindow(today: string) {
  const current = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const through = new Date(current);
  through.setUTCDate(0);
  current.setUTCMonth(current.getUTCMonth() - ASSOCIATION_MONTHS);
  return {
    from: current.toISOString().slice(0, 10),
    through: through.toISOString().slice(0, 10),
  };
}

export type AssociationResult =
  | {
      status: "found";
      metrics: [MetricKey, MetricKey];
      from: string;
      through: string;
      months: 11;
      changes: 10;
      correlation: number;
      adjustedP: number;
      direction: "together" | "opposite";
    }
  | {
      status: "withheld";
      metrics: [MetricKey, MetricKey];
      reason:
        | "incomplete_history"
        | "too_few_records"
        | "no_variation"
        | "weak_or_uncertain";
    };

function correlation(x: number[], y: number[]): number | null {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let xy = 0;
  let xx = 0;
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    xy += dx * dy;
    xx += dx * dx;
    yy += dy * dy;
  }
  if (xx === 0 || yy === 0) return null;
  return Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy)));
}

function monthAfter(month: string) {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function permutationP(x: number[], y: number[], observed: number) {
  // Fixed seed makes independent reproductions and tests agree. The plus-one
  // estimator prevents a simulated p-value of zero.
  let seed = 0x6d2b79f5;
  for (const value of [...x, ...y]) {
    seed =
      (Math.imul(seed ^ Math.round(value * 1000), 1664525) + 1013904223) >>> 0;
  }
  let extreme = 0;
  for (let trial = 0; trial < PERMUTATIONS; trial++) {
    const shuffled = [...y];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed + 0x9e3779b9) >>> 0;
      let mixed = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad);
      mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
      mixed = (mixed ^ (mixed >>> 15)) >>> 0;
      const j = Math.floor((mixed / 0x100000000) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    if (Math.abs(correlation(x, shuffled) ?? 0) >= Math.abs(observed) - 1e-12)
      extreme++;
  }
  return (extreme + 1) / (PERMUTATIONS + 1);
}

/** Eleven full months fit the existing RPC's 365-day lookback at any date. */
export function discoverAssociation(
  rows: HistoricalMetric[],
  metrics: [MetricKey, MetricKey],
): AssociationResult {
  const withheld = (
    reason: Extract<AssociationResult, { status: "withheld" }>["reason"],
  ): AssociationResult => ({
    status: "withheld",
    metrics,
    reason,
  });
  if (metrics[0] === metrics[1]) return withheld("incomplete_history");
  const series = metrics.map((metric) =>
    rows
      .filter((row) => row.metric === metric)
      .sort((a, b) => a.period.from.localeCompare(b.period.from)),
  );
  if (series.some((items) => items.length !== ASSOCIATION_MONTHS))
    return withheld("incomplete_history");
  for (let i = 0; i < ASSOCIATION_MONTHS; i++) {
    const a = series[0]![i]!;
    const b = series[1]![i]!;
    if (
      a.period.from !== b.period.from ||
      a.period.through !== b.period.through ||
      (i > 0 && a.period.from !== monthAfter(series[0]![i - 1]!.period.from)) ||
      [a, b].some(
        (row) =>
          row.coverage !== "recorded" ||
          row.value === null ||
          row.firstRecordedOn === null ||
          row.firstRecordedOn > row.period.from,
      )
    )
      return withheld("incomplete_history");
  }
  if (
    series.some(
      (items) =>
        items.reduce((sum, row) => sum + row.sourceCount, 0) <
          MIN_SOURCE_RECORDS ||
        items.filter((row) => row.sourceCount > 0).length < MIN_ACTIVE_MONTHS,
    )
  )
    return withheld("too_few_records");
  const changes = series.map((items) =>
    items.slice(1).map((row, i) => row.value! - items[i]!.value!),
  );
  const x = changes[0]!;
  const y = changes[1]!;
  const r = correlation(x, y);
  if (r === null) return withheld("no_variation");
  if (Math.abs(r) < MIN_ABS_CORRELATION) return withheld("weak_or_uncertain");
  for (let i = 0; i < x.length; i++) {
    const oneOut = correlation(
      x.filter((_, j) => j !== i),
      y.filter((_, j) => j !== i),
    );
    if (
      oneOut === null ||
      Math.sign(oneOut) !== Math.sign(r) ||
      Math.abs(oneOut) < MIN_LEAVE_ONE_OUT
    )
      return withheld("weak_or_uncertain");
  }
  // Bonferroni covers all 15 supported pairs even when only one is requested.
  const adjustedP = Math.min(1, permutationP(x, y, r) * ASSOCIATION_TESTS);
  if (adjustedP > MAX_ADJUSTED_P) return withheld("weak_or_uncertain");
  return {
    status: "found",
    metrics,
    from: series[0]![0]!.period.from,
    through: series[0]!.at(-1)!.period.through,
    months: 11,
    changes: 10,
    correlation: Math.round(r * 1000) / 1000,
    adjustedP: Math.round(adjustedP * 10000) / 10000,
    direction: r > 0 ? "together" : "opposite",
  };
}

export function discoverAllAssociations(rows: HistoricalMetric[]) {
  const keys = Object.keys(metricDefinitions) as MetricKey[];
  const results: AssociationResult[] = [];
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++)
      results.push(discoverAssociation(rows, [keys[i]!, keys[j]!]));
  return results;
}
