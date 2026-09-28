import {
  CalculationError,
  contribution,
  difference,
  percentChange,
  rank,
  share,
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

export function autoDerive(evidence: EvidenceV2[]): DerivedFact[] {
  const facts: DerivedFact[] = [];
  const values = evidence.filter(numeric);
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
    if (sorted.length < 2) continue;
    const [current, previous] = sorted as [EvidenceV2, EvidenceV2];
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
  return facts;
}
