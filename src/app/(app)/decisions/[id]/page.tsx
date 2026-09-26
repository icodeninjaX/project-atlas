import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionForm } from "@/components/decisions/decision-form";
import {
  DeleteDecisionButton,
  ObservationEditor,
} from "@/components/decisions/observation-editor";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { PageHeading } from "@/components/shared/page-heading";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  compareDecisionHistory,
  decisionAlternativeQuestion,
  decisionComparisonWindow,
  decisionMetricLabel,
  type DecisionObservation,
} from "@/lib/decisions/decision";
import {
  loadDecision,
  loadDecisionGoals,
  loadDecisionMetricSources,
  type DecisionMetricSource,
} from "@/lib/decisions/server";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import {
  HISTORICAL_METRICS_VERSION,
  metricDefinitions,
} from "@/lib/history/metrics";
import { loadHistoricalMetrics } from "@/lib/history/server";
import { formatCentavos } from "@/lib/money/money";

export const metadata = { title: "Review decision" };

function sourceForObservation(
  observation: DecisionObservation,
  related: Record<string, GraphEntitySummary>,
) {
  const key = observation.source_task_id
    ? `task:${observation.source_task_id}`
    : observation.source_transaction_id
      ? `transaction:${observation.source_transaction_id}`
      : observation.source_application_id
        ? `job_application:${observation.source_application_id}`
        : null;
  return key ? (related[key] ?? null) : null;
}

function MetricSources({
  label,
  items,
  hasMore,
}: {
  label: string;
  items: DecisionMetricSource[];
  hasMore: boolean;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{label} source records</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          No source records in this window.
        </p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={`${item.type}:${item.id}`}
              className="border-border rounded-lg border p-2"
            >
              <Link
                href={item.href as never}
                className="text-primary inline-flex min-h-10 items-center text-xs font-semibold break-words underline underline-offset-2"
              >
                {item.occurredOn} · {item.title}
              </Link>
              {item.amountCentavos !== null && (
                <p className="text-muted-foreground text-xs">
                  <SensitiveValue>
                    {formatCentavos(item.amountCentavos)}
                  </SensitiveValue>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <p className="text-muted-foreground mt-2 text-xs">
          Showing the first 50 records in this window.
        </p>
      )}
    </div>
  );
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
  const window =
    decision.metric_key && decision.review_on <= today
      ? decisionComparisonWindow(decision.decision_on, today)
      : null;
  let comparison = null;
  let comparisonUnavailable = false;
  let sourceWindows: {
    before: { items: DecisionMetricSource[]; hasMore: boolean };
    after: { items: DecisionMetricSource[]; hasMore: boolean };
  } | null = null;
  if (window) {
    try {
      const rows = await loadHistoricalMetrics({
        from: window.beforeFrom,
        through: window.afterThrough,
        grain: "day",
      });
      if (rows) comparison = compareDecisionHistory(decision, today, rows);
      else comparisonUnavailable = true;
    } catch {
      comparisonUnavailable = true;
    }
  }
  if (comparison) {
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
      if (
        (!before.hasMore && before.items.length !== comparison.beforeCount) ||
        (!after.hasMore && after.items.length !== comparison.afterCount)
      ) {
        comparisonUnavailable = true;
        comparison = null;
      } else sourceWindows = { before, after };
    } catch {
      comparisonUnavailable = true;
      comparison = null;
    }
  }
  const display = (value: number) =>
    decision.metric_key &&
    metricDefinitions[decision.metric_key].unit === "centavos"
      ? formatCentavos(value)
      : value.toLocaleString("en-PH");
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/decisions"
        className="text-primary inline-flex min-h-11 items-center text-sm underline underline-offset-2"
      >
        ← All decisions
      </Link>
      <PageHeading
        eyebrow="Decision review"
        title={decision.title}
        description={`Decided ${decision.decision_on} · Review planned ${decision.review_on}`}
      />
      <section
        className="border-border bg-card mt-6 rounded-2xl border p-4 sm:p-5"
        aria-labelledby="decision-summary"
      >
        <h2 id="decision-summary" className="font-semibold">
          What you planned
        </h2>
        <p className="text-muted-foreground mt-3 text-xs uppercase">Action</p>
        <p className="mt-1 text-sm break-words whitespace-pre-wrap">
          {decision.intent}
        </p>
        <p className="text-muted-foreground mt-3 text-xs uppercase">
          Expected outcome
        </p>
        <p className="mt-1 text-sm break-words whitespace-pre-wrap">
          {decision.expected_outcome}
        </p>
        {decision.rationale && (
          <>
            <p className="text-muted-foreground mt-3 text-xs uppercase">
              Reason
            </p>
            <p className="mt-1 text-sm break-words whitespace-pre-wrap">
              {decision.rationale}
            </p>
          </>
        )}
        {decision.assumptions && (
          <>
            <p className="text-muted-foreground mt-3 text-xs uppercase">
              Assumptions
            </p>
            <p className="mt-1 text-sm break-words whitespace-pre-wrap">
              {decision.assumptions}
            </p>
          </>
        )}
        {goal && (
          <Link
            href={`/goals?highlight=${goal.id}` as never}
            className="text-primary mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-2"
          >
            Related goal: {goal.title}
          </Link>
        )}
        {actionTask && (
          <Link
            href={actionTask.href as never}
            className="text-primary ml-0 inline-flex min-h-11 items-center text-sm underline underline-offset-2 sm:ml-4"
          >
            Action task: {actionTask.title}
          </Link>
        )}
      </section>
      <section
        className="border-border bg-card mt-5 rounded-2xl border p-4 sm:p-5"
        aria-labelledby="observed-change"
      >
        <h2 id="observed-change" className="font-semibold">
          What the records show
        </h2>
        {!decision.metric_key ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No recorded measure selected. Your notes can still document what
            followed.
          </p>
        ) : comparison ? (
          <div className="mt-3">
            <p className="text-sm">
              {decisionMetricLabel(comparison.metric)} in two equal 14-day
              windows:
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="border-border rounded-xl border p-3">
                <p className="text-muted-foreground text-xs">
                  Before · {comparison.beforeFrom} to {comparison.beforeThrough}
                </p>
                <p className="mt-1 font-semibold">
                  <SensitiveValue>{display(comparison.before)}</SensitiveValue>
                </p>
                <p className="text-muted-foreground text-xs">
                  {comparison.beforeCount} source records
                </p>
              </div>
              <div className="border-border rounded-xl border p-3">
                <p className="text-muted-foreground text-xs">
                  After · {comparison.afterFrom} to {comparison.afterThrough}
                </p>
                <p className="mt-1 font-semibold">
                  <SensitiveValue>{display(comparison.after)}</SensitiveValue>
                </p>
                <p className="text-muted-foreground text-xs">
                  {comparison.afterCount} source records
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              These are surviving records, calculated with history method{" "}
              {HISTORICAL_METRICS_VERSION}. A change after a decision does not
              establish that the decision caused it. Missing real-world entries
              may change the picture.
            </p>
            <div className="border-border mt-3 rounded-xl border p-3">
              <h3 className="text-sm font-semibold">
                Other explanations to check
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {decisionAlternativeQuestion(comparison.metric)} Compare your
                original assumptions and dated notes with the source records.
              </p>
            </div>
            {revisions.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                This plan has been revised. The comparison uses its current
                decision date and measure; earlier wording is preserved below.
              </p>
            )}
            {sourceWindows && (
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricSources label="Before" {...sourceWindows.before} />
                <MetricSources label="After" {...sourceWindows.after} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            {comparisonUnavailable
              ? "Recorded history could not be loaded. Try again later."
              : decision.review_on > today
                ? "Review date has not arrived. ATLAS will wait for follow-up records."
                : "Inconclusive: a full before and after window or supported baseline is not available. No outcome is inferred."}
          </p>
        )}
      </section>
      <section className="mt-7" aria-labelledby="observations">
        <h2 id="observations" className="mb-3 text-lg font-semibold">
          Your observations
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          Write what you noticed. These notes are your account, not an automatic
          success rating.
        </p>
        <div className="border-border bg-card rounded-2xl border p-4 sm:p-5">
          <ObservationEditor
            decisionId={id}
            decisionOn={decision.decision_on}
            today={today}
          />
        </div>
        <ul className="mt-3 grid gap-3">
          {observations.map((observation) => (
            <li
              key={observation.id}
              id={`observation-${observation.id}`}
              className="border-border bg-card rounded-2xl border p-4 sm:p-5"
            >
              <p className="text-muted-foreground mb-2 text-xs">
                Observed {observation.observed_on}
              </p>
              <ObservationEditor
                decisionId={id}
                decisionOn={decision.decision_on}
                today={today}
                observation={observation}
                source={sourceForObservation(observation, relatedRecords)}
              />
              {sourceForObservation(observation, relatedRecords) && (
                <Link
                  href={
                    sourceForObservation(observation, relatedRecords)!
                      .href as never
                  }
                  className="text-primary mt-2 inline-flex min-h-10 items-center text-xs underline underline-offset-2"
                >
                  Open supporting record
                </Link>
              )}
            </li>
          ))}
        </ul>
        {observations.length === 100 && (
          <p className="text-muted-foreground mt-3 text-xs">
            Showing the 100 most recent observations.
          </p>
        )}
      </section>
      {revisions.length > 0 && (
        <section className="mt-8" aria-labelledby="plan-history">
          <h2 id="plan-history" className="mb-3 text-lg font-semibold">
            Earlier plans
          </h2>
          <p className="text-muted-foreground mb-3 text-xs">
            Edits stay visible so later results are not read as if the plan
            never changed.
          </p>
          <ol className="grid gap-3">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="border-border bg-card rounded-2xl border p-4"
              >
                <p className="text-muted-foreground text-xs">
                  Revised{" "}
                  {new Intl.DateTimeFormat("en-PH", {
                    timeZone: "Asia/Manila",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(revision.changed_at))}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {revision.previous_title} · {revision.previous_decision_on}
                </p>
                <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                  {revision.previous_intent}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Expected: {revision.previous_expected_outcome}
                </p>
                {revision.previous_rationale && (
                  <p className="text-muted-foreground mt-2 text-xs break-words whitespace-pre-wrap">
                    Reason: {revision.previous_rationale}
                  </p>
                )}
                {revision.previous_assumptions && (
                  <p className="text-muted-foreground mt-2 text-xs break-words whitespace-pre-wrap">
                    Assumptions: {revision.previous_assumptions}
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  Review planned {revision.previous_review_on} · Measure:{" "}
                  {revision.previous_metric_key
                    ? decisionMetricLabel(revision.previous_metric_key)
                    : "none"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="mt-8" aria-labelledby="edit-decision">
        <h2 id="edit-decision" className="mb-3 text-lg font-semibold">
          Edit decision
        </h2>
        <DecisionForm
          decision={decision}
          goals={goals}
          today={today}
          actionTask={actionTask}
        />
        <div className="mt-5">
          <DeleteDecisionButton decisionId={id} />
        </div>
      </section>
    </div>
  );
}
