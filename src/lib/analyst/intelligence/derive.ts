import {
  CalculationError,
  comparablePeriods,
  contribution,
  difference,
  fullMonth,
  coveredPeriod,
  goalPace,
  goalSavings,
  memberMonthProjection,
  monthProjection,
  monthSetTrend,
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

/**
 * The whole-domain scope a set's members add up to: a set `<name>_by_<group>`
 * belongs to the total `whole_domain:<name>`, so a set is never divided by,
 * or reconciled with, the total of a differently filtered read.
 */
const setTotalScope = (member: EvidenceV2) =>
  `whole_domain:${member.scope.cohort!.setId.split("_by_")[0]}`;

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

export function autoDerive(
  evidence: EvidenceV2[],
  /** Today in Manila; a projection is made only for the month in progress. */
  options: { today?: string } = {},
): DerivedFact[] {
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
    // A query grouped by month is a series: its whole months get a trend,
    // and the month in progress an estimate at its pace, never a ranking
    // that sets a partial month against whole ones.
    if (members[0]!.scope.cohort!.setId.endsWith("_by_month")) {
      facts.push(
        ...(attempt(() =>
          monthSetTrend(`derived.trend.${key}`, members, start),
        ) ?? []),
      );
      for (const member of members) {
        const projection =
          options.today &&
          attempt(() =>
            memberMonthProjection(
              `derived.projection.${key}|${member.scope.cohort!.member}`,
              member,
              options.today!,
              start,
            ),
          );
        if (projection) facts.push(projection);
      }
      continue;
    }
    const fact = attempt(() => rank(`derived.rank.${key}`, members));
    if (!fact || fact.output.status !== "defined") continue;
    facts.push(fact);
    // The leading members' shares of their total, so a writer never
    // divides: "Groceries is 45.5% of recorded expenses".
    const [first] = members;
    // Only additive measures divide into shares; an average does not.
    if (!["sum", "count"].includes(first!.semantics.aggregation)) continue;
    const total = values.find(
      (item) =>
        item.scope.type === "whole_domain" &&
        item.scope.id === setTotalScope(first!) &&
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
      [...sets.entries()].find(
        ([setKey, members]) =>
          setKey.endsWith(
            `|${total.semantics.metricKey}|${periodKey(total)}`,
          ) &&
          setTotalScope(members[0]!) === total.scope.id &&
          !members[0]!.scope.cohort!.setId.endsWith("_by_month"),
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
    if (
      latest &&
      options.today &&
      latest.item.time.period.through.slice(0, 7) === options.today.slice(0, 7)
    ) {
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
  // A goal's pace: each kind of work (milestones, linked tasks) read for one
  // goal gets its remaining count, weekly pace, days needed and margin.
  const byKey = (scope: string, key: string) =>
    values.find(
      (item) => item.scope.id === scope && item.semantics.metricKey === key,
    );
  for (const total of values) {
    const kind = /^goal_(milestones|tasks)_total$/.exec(
      total.semantics.metricKey,
    )?.[1];
    if (!kind) continue;
    const scope = total.scope.id;
    const done = byKey(scope, `goal_${kind}_done`);
    const recent = byKey(scope, `goal_${kind}_done_recent`);
    if (!done || !recent) continue;
    facts.push(
      ...(attempt(() =>
        goalPace(`derived.goal_pace.${scope}|${kind}`, {
          total,
          done,
          recent,
          daysToTarget: byKey(scope, "goal_days_to_target") ?? null,
        }),
      ) ?? []),
    );
  }
  // A goal's money target against what is saved and the recent surplus.
  const surplus = values.find(
    (item) => item.semantics.metricKey === "goal_recent_surplus_centavos",
  );
  for (const target of values) {
    if (target.semantics.metricKey !== "goal_target_centavos") continue;
    const scope = target.scope.id;
    const saved = byKey(scope, "goal_saved_centavos");
    if (!saved) continue;
    facts.push(
      ...(attempt(() =>
        goalSavings(`derived.goal_savings.${scope}`, {
          target,
          saved,
          surplus: surplus ?? null,
          daysToTarget: byKey(scope, "goal_days_to_target") ?? null,
        }),
      ) ?? []),
    );
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
