import {
  CalculationError,
  comparablePeriods,
  contribution,
  difference,
  fullMonth,
  coveredPeriod,
  monthProjection,
  monthlyTrend,
  netFlow,
  paceChange,
  perDay,
  percentChange,
  rank,
  share,
  type RecordsStart,
} from "./calculations";
import type { DerivedFact, EvidenceV2, NumericEvidence } from "./contracts";

/**
 * Derived facts ATLAS computes automatically from selected evidence
 * (AI-06), so the writer can cite a ranking, a change or a contribution
 * instead of doing arithmetic. Only approved operations run, and any
 * combination the calculation checks refuse is skipped.
 */

const numeric = (item: EvidenceV2): item is NumericEvidence =>
  item.kind === "metric" || item.kind === "scenario_output";

function attempt<T>(work: () => T): T | null {
  try {
    return work();
  } catch (error) {
    if (error instanceof CalculationError) return null;
    throw error;
  }
}

/** Shares are derived for this many leading members of a ranked set. */
const TOP_SHARES = 3;

const periodKey = (item: EvidenceV2) =>
  `${item.time.period.from}..${item.time.period.through}`;

/** Money totals that get a pace: recorded income and expenses by period. */
const PACED_SCOPES = new Set(["whole_domain:income", "whole_domain:expense"]);

/** The first recorded transaction, from the data inventory when it was read. */
function transactionsStart(evidence: EvidenceV2[]): RecordsStart | null {
  const item = evidence.find(
    (entry) =>
      entry.kind === "metric" &&
      entry.semantics.metricKey === "inventory_transactions" &&
      entry.value > 0,
  );
  return item ? { day: item.time.period.from, evidenceId: item.id } : null;
}

export function autoDerive(evidence: EvidenceV2[]): DerivedFact[] {
  const facts: DerivedFact[] = [];
  const values = evidence.filter(numeric);
  const start = transactionsStart(evidence);
  // A money period that starts before the first transaction is only partly
  // covered by the records.
  const partlyCovered = (item: EvidenceV2) =>
    PACED_SCOPES.has(item.scope.id) &&
    coveredPeriod(item.time.period, start)?.from !== item.time.period.from;
  // Complete sets (categories in a period) are ranked.
  const sets = new Map<string, EvidenceV2[]>();
  for (const item of values) {
    const cohort = item.scope.cohort;
    if (!cohort) continue;
    const key = `${cohort.setId}|${item.semantics.metricKey}|${periodKey(item)}`;
    sets.set(key, [...(sets.get(key) ?? []), item]);
  }
  for (const [key, members] of sets) {
    const fact = attempt(() => rank(`derived.rank.${key}`, members));
    if (!fact || fact.output.status !== "defined") continue;
    facts.push(fact);
    // The leading members' shares of their total, so a writer never
    // divides: "Groceries is 45.5% of recorded expenses".
    const [first] = members;
    const total = values.find(
      (item) =>
        item.scope.type === "whole_domain" &&
        item.semantics.metricKey === first!.semantics.metricKey &&
        periodKey(item) === periodKey(first!),
    );
    if (!total) continue;
    for (const entry of (fact.ranking ?? []).slice(0, TOP_SHARES)) {
      const member = members.find((item) => item.id === entry.evidenceId)!;
      const part = attempt(() =>
        share(`derived.share.${entry.member}|${key}`, member, total),
      );
      if (part && part.output.status === "defined") facts.push(part);
    }
  }
  // A whole-domain measure over two periods gets its change.
  const totals = new Map<string, EvidenceV2[]>();
  for (const item of values) {
    if (item.scope.type !== "whole_domain") continue;
    const key = `${item.scope.id}|${item.semantics.metricKey}`;
    totals.set(key, [...(totals.get(key) ?? []), item]);
  }
  for (const [key, items] of totals) {
    const sorted = [...items].sort((a, b) =>
      b.time.period.from.localeCompare(a.time.period.from),
    );
    // A month read month by month also gets its trend over whole months.
    if (sorted.filter((item) => fullMonth(item.time.period)).length >= 2) {
      const trend = attempt(() => monthlyTrend(`derived.trend.${key}`, sorted));
      if (trend) facts.push(...trend);
    }
    // The latest like-for-like pair: a month in progress is never set
    // against a whole month, only against the same days of another.
    const pair = sorted.findIndex(
      (item, index) =>
        index + 1 < sorted.length &&
        comparablePeriods(item.time.period, sorted[index + 1]!.time.period),
    );
    if (pair < 0) continue;
    const current = sorted[pair]!;
    const previous = sorted[pair + 1]!;
    // Totals over unequal coverage are compared by pace instead (below).
    if (partlyCovered(current) || partlyCovered(previous)) continue;
    const change = attempt(() =>
      difference(`derived.change.${key}`, current, previous),
    );
    if (change) facts.push(change);
    const percent = attempt(() =>
      percentChange(`derived.percent.${key}`, current, previous),
    );
    if (percent) facts.push(percent);
    // The same measure by category in both periods explains the change arithmetically.
    const setFor = (total: EvidenceV2) =>
      [...sets.entries()].find(([setKey]) =>
        setKey.endsWith(`|${total.semantics.metricKey}|${periodKey(total)}`),
      )?.[1];
    const now = setFor(current);
    const before = setFor(previous);
    if (now && before) {
      const fact = attempt(() =>
        contribution(`derived.contribution.${key}`, {
          totalCurrent: current,
          totalPrevious: previous,
          current: now,
          previous: before,
        }),
      );
      if (fact && fact.output.status === "defined") facts.push(fact);
    }
  }
  // Pace: money per recorded day, so a period the records only partly cover
  // still compares fairly, and the month in progress gets its projection.
  for (const [key, items] of totals) {
    const paced = items
      .filter((item) => PACED_SCOPES.has(item.scope.id))
      .sort((a, b) => b.time.period.from.localeCompare(a.time.period.from));
    const paces = paced.flatMap((item) => {
      const pace = attempt(() =>
        perDay(`derived.pace.${key}|${periodKey(item)}`, item, start),
      );
      return pace ? [{ item, pace }] : [];
    });
    for (const { pace } of paces) facts.push(pace);
    const [latest, earlier] = paces;
    if (latest && earlier)
      facts.push(
        ...(attempt(() =>
          paceChange(`derived.pace_change.${key}`, latest.pace, earlier.pace),
        ) ?? []),
      );
    if (latest) {
      const projection = attempt(() =>
        monthProjection(
          `derived.projection.${key}|${periodKey(latest.item)}`,
          latest.item,
          latest.pace,
        ),
      );
      if (projection) facts.push(projection);
    }
  }
  // Income against expenses in the same period: did income cover spending?
  const wholeTotal = (key: string, period: string) =>
    values.find(
      (item) =>
        item.scope.type === "whole_domain" &&
        item.semantics.metricKey === key &&
        periodKey(item) === period,
    );
  for (const period of new Set(values.map(periodKey))) {
    const income = wholeTotal("income_centavos", period);
    const expense = wholeTotal("expense_centavos", period);
    if (!income || !expense) continue;
    const fact = attempt(() =>
      netFlow(`derived.net.${period}`, income, expense),
    );
    if (fact) facts.push(fact);
  }
  return facts;
}
