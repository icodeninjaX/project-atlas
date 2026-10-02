import type { AssociationResult } from "./associations";
import type { HistoricalMetric, MetricKey } from "./metrics";
import { metricKeys } from "./view";

/** View math for the Patterns page. */

export type Finding = Extract<AssociationResult, { status: "found" }>;
export type WithheldReason = Extract<
  AssociationResult,
  { status: "withheld" }
>["reason"];

/** Withheld reasons in the order the checks run. */
export const withheldReasons: Record<
  WithheldReason,
  { label: string; description: string }
> = {
  incomplete_history: {
    label: "Not enough history",
    description:
      "A series lacks eleven fully recorded months, or a month has no value.",
  },
  too_few_records: {
    label: "Too few records",
    description:
      "A series has under twelve records, or activity in fewer than six months.",
  },
  no_variation: {
    label: "No movement",
    description: "A series did not change from month to month.",
  },
  weak_or_uncertain: {
    label: "Weak or uncertain",
    description:
      "The changes did not line up strongly and reliably enough to report.",
  },
};

export const withheldOrder = Object.keys(withheldReasons) as WithheldReason[];

export type ScanSummary = {
  total: number;
  findings: Finding[];
  /** Withheld pairs by reason. */
  withheld: Record<WithheldReason, number>;
};

export function summarizeScan(results: AssociationResult[]): ScanSummary {
  const withheld = Object.fromEntries(
    withheldOrder.map((reason) => [reason, 0]),
  ) as Record<WithheldReason, number>;
  const findings: Finding[] = [];
  for (const result of results) {
    if (result.status === "found") findings.push(result);
    else withheld[result.reason] += 1;
  }
  return { total: results.length, findings, withheld };
}

function pairKey(a: MetricKey, b: MetricKey) {
  return metricKeys.indexOf(a) < metricKeys.indexOf(b)
    ? `${a}.${b}`
    : `${b}.${a}`;
}

/**
 * The lower triangle of every pair: one row per metric after the first,
 * one cell per metric before it.
 */
export function pairMatrix(results: AssociationResult[]) {
  const byPair = new Map(
    results.map((result) => [pairKey(...result.metrics), result]),
  );
  return metricKeys.slice(1).map((row, index) => ({
    metric: row,
    cells: metricKeys.slice(0, index + 1).map((column) => ({
      column,
      result: byPair.get(pairKey(column, row)) ?? null,
    })),
  }));
}

export type PairMonth = {
  month: string;
  through: string;
  first: { value: number | null; sourceCount: number };
  second: { value: number | null; sourceCount: number };
};

/** Each month's values for a finding's two metrics, oldest first. */
export function pairMonths(
  rows: HistoricalMetric[],
  [first, second]: [MetricKey, MetricKey],
): PairMonth[] {
  const lookup = (metric: MetricKey, month: string) => {
    const row = rows.find(
      (item) => item.metric === metric && item.period.from === month,
    );
    return { value: row?.value ?? null, sourceCount: row?.sourceCount ?? 0 };
  };
  return rows
    .filter((row) => row.metric === first)
    .sort((a, b) => a.period.from.localeCompare(b.period.from))
    .map((row) => ({
      month: row.period.from,
      through: row.period.through,
      first: lookup(first, row.period.from),
      second: lookup(second, row.period.from),
    }));
}

/** "−0.989" with a true minus sign. */
export function formatSigned(value: number, digits: number) {
  const fixed = Math.abs(value).toFixed(digits);
  return value < 0 ? `−${fixed}` : fixed;
}
