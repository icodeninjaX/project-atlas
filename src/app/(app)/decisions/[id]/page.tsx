import { notFound } from "next/navigation";
import { DecisionDetail } from "@/components/decisions/decision-detail";
import type { DecisionRecords } from "@/components/decisions/decision-records";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  compareDecisionHistory,
  decisionComparisonWindow,
  type Decision,
} from "@/lib/decisions/decision";
import {
  loadDecision,
  loadDecisionGoals,
  loadDecisionMetricSources,
} from "@/lib/decisions/server";
import { comparisonDays, comparisonGate } from "@/lib/decisions/view";
import { loadHistoricalMetrics } from "@/lib/history/server";

export const metadata = { title: "Review decision" };

/**
 * The before-and-after comparison, once its windows are complete and every
 * day in them is recorded; otherwise why not.
 */
async function loadRecords(
  decision: Decision,
  today: string,
): Promise<DecisionRecords> {
  const gate = comparisonGate(decision, today);
  if (gate.kind !== "ready") return gate;
  const window = decisionComparisonWindow(decision.decision_on, today)!;
  let rows;
  try {
    rows = await loadHistoricalMetrics({
      from: window.beforeFrom,
      through: window.afterThrough,
      grain: "day",
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (!rows) return { kind: "unavailable" };
  const comparison = compareDecisionHistory(decision, today, rows);
  if (!comparison) return { kind: "inconclusive" };
  try {
    const [before, after] = await Promise.all([
      loadDecisionMetricSources({
        metric: comparison.metric,
        from: comparison.beforeFrom,
        through: comparison.beforeThrough,
      }),
      loadDecisionMetricSources({
        metric: comparison.metric,
        from: comparison.afterFrom,
        through: comparison.afterThrough,
      }),
    ]);
    // The totals must trace to the records listed beneath them.
    if (
      (!before.hasMore && before.items.length !== comparison.beforeCount) ||
      (!after.hasMore && after.items.length !== comparison.afterCount)
    )
      return { kind: "unavailable" };
    return {
      kind: "comparison",
      comparison,
      days: comparisonDays(comparison, rows),
      sources: { before, after },
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const entry = await loadDecision(id);
  if (!entry) notFound();
  const today = manilaToday(new Date());
  const goals = await loadDecisionGoals();
  if (entry.goal && !goals.some((goal) => goal.id === entry.goal?.id))
    goals.push(entry.goal);
  const { decision, observations, revisions, goal, relatedRecords } = entry;
  const actionTask = decision.action_task_id
    ? (relatedRecords[`task:${decision.action_task_id}`] ?? null)
    : null;
  return (
    <DecisionDetail
      decision={decision}
      observations={observations}
      revisions={revisions}
      goal={goal}
      goals={goals}
      actionTask={actionTask}
      relatedRecords={relatedRecords}
      records={await loadRecords(decision, today)}
      todayIso={today}
    />
  );
}
