import {
  CalendarCheck,
  ClipboardCheck,
  GitCompareArrows,
  Goal,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  DecisionRecordsCard,
  type DecisionRecords,
} from "@/components/decisions/decision-records";
import { DecisionEditButton } from "@/components/decisions/decision-sheet";
import {
  DecisionHeroShell,
  ReviewChip,
  decisionCardClass,
  eyebrowClass,
  tileClass,
} from "@/components/decisions/decision-visuals";
import styles from "@/components/decisions/decisions.module.css";
import {
  DeleteDecisionButton,
  ObservationEditor,
  ObservationItem,
} from "@/components/decisions/observation-editor";
import { calendarDaysBetween, formatCalendarDate } from "@/lib/dates/dates";
import {
  decisionMetricLabel,
  type Decision,
  type DecisionObservation,
  type DecisionRevision,
} from "@/lib/decisions/decision";
import {
  decisionArc,
  decisionReview,
  noteDayLabel,
  observationTrail,
  planFieldLabels,
  revisionTrail,
  shortDecisionDate,
  type DecisionReview,
  type PlanField,
} from "@/lib/decisions/view";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

const revisedAt = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  dateStyle: "medium",
  timeStyle: "short",
});

function days(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

function sourceFor(
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

/** From the day of the decision to its review date, with today marked. */
function ReviewArc({
  decision,
  todayIso,
}: {
  decision: Decision;
  todayIso: string;
}) {
  const arc = decisionArc(decision.decision_on, decision.review_on, todayIso);
  const reached = arc.remaining <= 0;
  return (
    <div className="mt-7">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={eyebrowClass}>Decided</p>
          <p className="mt-0.5 font-mono text-sm font-semibold">
            {shortDecisionDate(decision.decision_on, todayIso)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className={eyebrowClass}>Review</p>
          <p className="mt-0.5 font-mono text-sm font-semibold">
            {shortDecisionDate(decision.review_on, todayIso)}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-2.5">
        <span
          className={cn(
            "ring-border/60 absolute inset-0 rounded-full ring-1",
            styles.ahead,
          )}
        />
        <span
          style={{ width: `${arc.share * 100}%` }}
          className={cn(
            "bg-primary absolute inset-y-0 left-0 rounded-full",
            styles.reach,
          )}
        />
        {reached ? null : (
          <span
            style={{ left: `${arc.share * 100}%` }}
            className="bg-card ring-primary absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          />
        )}
        <span
          className={cn(
            "ring-card absolute top-1/2 right-0 grid size-5 translate-x-1/4 -translate-y-1/2 place-items-center rounded-full ring-2",
            reached ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          <CalendarCheck className="size-3" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6">
        <span className="font-semibold">
          {arc.elapsed === 0
            ? "Decided today"
            : reached
              ? `${days(arc.elapsed)} since deciding`
              : `Day ${arc.elapsed} of ${arc.total}`}
        </span>
        <span className="text-muted-foreground">
          {" · "}
          {arc.remaining > 0
            ? `${days(arc.remaining)} to the review`
            : arc.remaining === 0
              ? "the review date is today"
              : `the review date was ${days(-arc.remaining)} ago`}
        </span>
      </p>
    </div>
  );
}

function HeroFact({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="min-w-0 sm:px-5 sm:first:pl-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 text-base leading-tight font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">
        {value}
      </dd>
      <dd className="text-muted-foreground mt-1 text-xs leading-4">{note}</dd>
    </div>
  );
}

function DetailHero({
  decision,
  review,
  observations,
  revisions,
  edit,
  todayIso,
}: {
  decision: Decision;
  review: DecisionReview;
  observations: DecisionObservation[];
  revisions: DecisionRevision[];
  edit: ReactNode;
  todayIso: string;
}) {
  const latest = observations[0]?.observed_on ?? null;
  return (
    <DecisionHeroShell labelledBy="decision-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Decision review
            </span>
            <ReviewChip review={review} />
          </p>
          <h1
            id="decision-heading"
            className="mt-3 text-2xl leading-tight font-semibold tracking-[-0.025em] text-balance break-words sm:text-[1.75rem]"
          >
            {decision.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Decided {formatCalendarDate(decision.decision_on)} · Review planned{" "}
            {formatCalendarDate(decision.review_on)}
          </p>
        </div>
        {edit}
      </div>

      <ReviewArc decision={decision} todayIso={todayIso} />

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-3 sm:gap-x-0 sm:divide-x">
        <HeroFact
          label="Observations"
          value={
            <span className="font-mono">
              {observations.length === 100 ? "100+" : observations.length}
            </span>
          }
          note={
            latest
              ? `Last on ${shortDecisionDate(latest, todayIso)}`
              : "None written yet"
          }
        />
        <HeroFact
          label="Recorded measure"
          value={
            decision.metric_key
              ? decisionMetricLabel(decision.metric_key)
              : "None"
          }
          note={decision.metric_key ? "14 days before and after" : "Notes only"}
        />
        <HeroFact
          label="Plan edits"
          value={<span className="font-mono">{revisions.length}</span>}
          note={
            revisions.length
              ? "Earlier wording kept below"
              : "As first recorded"
          }
        />
      </dl>
    </DecisionHeroShell>
  );
}

function PlanBlock({
  label,
  children,
  emphasis,
}: {
  label: string;
  children: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn(tileClass, "relative p-4")}>
      <p className={eyebrowClass}>{label}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-6 break-words whitespace-pre-wrap",
          emphasis && "text-[0.9375rem] font-medium",
        )}
      >
        {children}
      </p>
    </div>
  );
}

/** "What you planned": the plan in the user's words, and what it links to. */
function PlanCard({
  decision,
  goal,
  actionTask,
}: {
  decision: Decision;
  goal: { id: string; title: string } | null;
  actionTask: GraphEntitySummary | null;
}) {
  const linkClass =
    "bg-background/60 ring-border/80 hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-xl px-3.5 text-xs ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9";
  return (
    <section
      aria-labelledby="decision-summary"
      className={cn(decisionCardClass, "mt-4 sm:mt-5")}
    >
      <h2
        id="decision-summary"
        className="text-base font-semibold tracking-[-0.01em]"
      >
        What you planned
      </h2>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 @[34rem]:grid-cols-2">
        <PlanBlock label="Action">{decision.intent}</PlanBlock>
        <PlanBlock label="Expected outcome" emphasis>
          {decision.expected_outcome}
        </PlanBlock>
        {decision.rationale ? (
          <PlanBlock label="Reason">{decision.rationale}</PlanBlock>
        ) : null}
        {decision.assumptions ? (
          <PlanBlock label="Assumptions">{decision.assumptions}</PlanBlock>
        ) : null}
      </div>
      {!decision.rationale && !decision.assumptions ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          No reason or assumptions written. Adding them in Edit decision lets
          you check them against what happened.
        </p>
      ) : null}

      {goal || actionTask ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {goal ? (
            <Link
              href={`/goals?highlight=${goal.id}` as never}
              className={linkClass}
            >
              <Goal
                aria-hidden="true"
                className="text-muted-foreground size-3.5 shrink-0"
              />
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">Related goal:</span>{" "}
                <span className="font-semibold">{goal.title}</span>
              </span>
            </Link>
          ) : null}
          {actionTask ? (
            <Link href={actionTask.href as never} className={linkClass}>
              <ClipboardCheck
                aria-hidden="true"
                className="text-muted-foreground size-3.5 shrink-0"
              />
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">Action task:</span>{" "}
                <span className="font-semibold">{actionTask.title}</span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** The review date as a stop on the notes' rail. */
function ReviewStop({
  on,
  upcoming,
  last,
  todayIso,
}: {
  on: string;
  upcoming: boolean;
  last: boolean;
  todayIso: string;
}) {
  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 pb-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-4">
      {last ? null : (
        <span
          aria-hidden="true"
          className="bg-border absolute top-8 bottom-0 left-[calc(1rem-0.5px)] w-px sm:top-9 sm:left-[calc(1.125rem-0.5px)]"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "bg-muted/70 ring-border grid size-8 place-items-center rounded-full ring-1 sm:size-9",
          upcoming
            ? "text-muted-foreground"
            : "text-amber-700 dark:text-amber-300",
        )}
      >
        <CalendarCheck className="size-4" />
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="font-semibold">Review date</span>
        <span className="text-muted-foreground font-mono">
          {formatCalendarDate(on)}
          {upcoming ? ` · in ${days(calendarDaysBetween(todayIso, on))}` : null}
        </span>
      </p>
    </li>
  );
}

function Observations({
  decision,
  observations,
  relatedRecords,
  todayIso,
}: {
  decision: Decision;
  observations: DecisionObservation[];
  relatedRecords: Record<string, GraphEntitySummary>;
  todayIso: string;
}) {
  const trail = observationTrail(observations, decision.review_on, todayIso);
  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="observations">
      <div className="px-1">
        <h2 id="observations" className="text-base font-semibold">
          Your observations
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Write what you noticed. These notes are your account, not an automatic
          success rating.
        </p>
      </div>

      <div className={cn(decisionCardClass, "mt-4")}>
        <h3 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          Add an observation
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs leading-5">
          Dated on or after the decision. Cite a record if one shows it.
        </p>
        <figure className="mt-4 border-l-2 pl-3.5">
          <figcaption className={eyebrowClass}>You expected</figcaption>
          <blockquote className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
            {decision.expected_outcome}
          </blockquote>
        </figure>
        <div className="mt-5">
          <ObservationEditor
            decisionId={decision.id}
            decisionOn={decision.decision_on}
            today={todayIso}
          />
        </div>
      </div>

      {trail.length ? (
        <ol aria-label="Observations, newest first" className="mt-6">
          {trail.map((entry, index) => {
            const last = index === trail.length - 1;
            return entry.kind === "review" ? (
              <ReviewStop
                key="review"
                on={entry.on}
                upcoming={entry.upcoming}
                last={last}
                todayIso={todayIso}
              />
            ) : (
              <ObservationItem
                key={entry.note.id}
                decisionId={decision.id}
                decisionOn={decision.decision_on}
                today={todayIso}
                observation={entry.note}
                source={sourceFor(entry.note, relatedRecords)}
                dayLabel={noteDayLabel(
                  decision.decision_on,
                  entry.note.observed_on,
                )}
                afterReview={entry.afterReview}
                last={last}
              />
            );
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground mt-4 px-1 text-xs leading-5">
          No observations yet. Each one you add appears here with how long after
          the decision it came.
        </p>
      )}
      {observations.length === 100 && (
        <p className="text-muted-foreground mt-1 px-1 text-xs">
          Showing the 100 most recent observations.
        </p>
      )}
    </section>
  );
}

/** "Earlier plans": what each edit changed, before and after. */
function PlanHistory({
  decision,
  revisions,
  goals,
  actionTask,
}: {
  decision: Decision;
  revisions: DecisionRevision[];
  goals: { id: string; title: string }[];
  actionTask: GraphEntitySummary | null;
}) {
  const goalTitles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const show = (field: PlanField, value: string | null): ReactNode => {
    if (value === null)
      return <span className="text-muted-foreground">None</span>;
    switch (field) {
      case "decision_on":
      case "review_on":
        return formatCalendarDate(value);
      case "metric_key":
        return decisionMetricLabel(
          value as NonNullable<Decision["metric_key"]>,
        );
      case "goal_id":
        return goalTitles.get(value) ?? "A goal no longer listed";
      case "action_task_id":
        return value === actionTask?.id ? actionTask.title : "Another task";
      default:
        return value;
    }
  };
  const trail = revisionTrail(decision, revisions);
  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="plan-history">
      <div className="px-1">
        <h2 id="plan-history" className="text-base font-semibold">
          Earlier plans
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Edits stay visible so later results are not read as if the plan never
          changed.
        </p>
      </div>
      <ol
        className={cn(
          decisionCardClass,
          "mt-4 divide-y p-0 min-[360px]:p-0 sm:p-0",
        )}
      >
        {trail.map(({ revision, changes, unchanged }) => (
          <li key={revision.id} className="min-w-0 p-4 min-[360px]:p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <GitCompareArrows
                  aria-hidden="true"
                  className="text-muted-foreground size-4 shrink-0"
                />
                Revised {revisedAt.format(new Date(revision.changed_at))}
              </p>
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {changes.length === 1
                  ? "1 change"
                  : `${changes.length} changes`}
              </span>
            </div>
            {changes.length ? (
              <dl className="mt-4 space-y-4">
                {changes.map((change) => (
                  <div key={change.field} className="min-w-0">
                    <dt className={eyebrowClass}>
                      {planFieldLabels[change.field]}
                    </dt>
                    <dd className="mt-2 grid gap-2 @[30rem]:grid-cols-2">
                      <div className={cn(tileClass, "p-3")}>
                        <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                          Before
                        </p>
                        <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
                          {show(change.field, change.before)}
                        </p>
                      </div>
                      <div className={cn(tileClass, "p-3")}>
                        <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                          After
                        </p>
                        <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
                          {show(change.field, change.after)}
                        </p>
                      </div>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {unchanged.length ? (
              <p className="text-muted-foreground mt-4 text-xs leading-5">
                Unchanged:{" "}
                {unchanged.map((field) => planFieldLabels[field]).join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The decision page body, from data the page has already loaded. */
export function DecisionDetail({
  decision,
  observations,
  revisions,
  goal,
  goals,
  actionTask,
  relatedRecords,
  records,
  todayIso,
}: {
  decision: Decision;
  /** Newest first. */
  observations: DecisionObservation[];
  /** Newest first. */
  revisions: DecisionRevision[];
  goal: { id: string; title: string } | null;
  /** Goals the plan can link to, for the editor and the plan history. */
  goals: { id: string; title: string }[];
  actionTask: GraphEntitySummary | null;
  relatedRecords: Record<string, GraphEntitySummary>;
  records: DecisionRecords;
  /** Today in Manila, `YYYY-MM-DD`. */
  todayIso: string;
}) {
  const review = decisionReview(
    decision,
    observations[0]?.observed_on ?? null,
    todayIso,
  );
  return (
    <PageShell>
      <BackLink href="/decisions">All decisions</BackLink>

      <DetailHero
        decision={decision}
        review={review}
        observations={observations}
        revisions={revisions}
        todayIso={todayIso}
        edit={
          <DecisionEditButton
            decision={decision}
            goals={goals}
            today={todayIso}
            actionTask={actionTask}
          />
        }
      />
      <PlanCard decision={decision} goal={goal} actionTask={actionTask} />
      <DecisionRecordsCard
        decision={decision}
        records={records}
        revised={revisions.length > 0}
        todayIso={todayIso}
      />
      <Observations
        decision={decision}
        observations={observations}
        relatedRecords={relatedRecords}
        todayIso={todayIso}
      />
      {revisions.length > 0 ? (
        <PlanHistory
          decision={decision}
          revisions={revisions}
          goals={goals}
          actionTask={actionTask}
        />
      ) : null}

      <section
        aria-labelledby="delete-decision"
        className="border-border mt-12 flex flex-wrap items-center justify-between gap-4 border-t px-1 pt-6"
      >
        <div className="min-w-0">
          <h2 id="delete-decision" className="text-sm font-semibold">
            Delete this decision
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            Removes the decision and its observations. This cannot be undone.
          </p>
        </div>
        <DeleteDecisionButton decisionId={decision.id} />
      </section>
    </PageShell>
  );
}
