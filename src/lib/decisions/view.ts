import { calendarDaysBetween, formatCalendarDate } from "@/lib/dates/dates";
import type { HistoricalMetric } from "@/lib/history/metrics";
import {
  decisionComparisonWindow,
  type Decision,
  type DecisionComparison,
  type DecisionRevision,
} from "./decision";

/*
 * View math for the decision journal. Everything here is a pure function of
 * what the user recorded and today's Manila date; nothing infers an outcome.
 */

export function shiftDays(iso: string, days: number) {
  const value = new Date(`${iso}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The same day `months` later, or the month's last day when it is shorter. */
export function addCalendarMonths(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0, 12));
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  target.setUTCDate(Math.min(day, lastDay.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

const shortDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** "Oct 12", or "Oct 12, 2025" outside this year. */
export function shortDecisionDate(iso: string, todayIso: string) {
  return iso.slice(0, 4) === todayIso.slice(0, 4)
    ? shortDay.format(new Date(`${iso}T12:00:00Z`))
    : formatCalendarDate(iso);
}

export type ReviewStatus = "ready" | "waiting" | "reviewed";

export const reviewStatuses = ["ready", "waiting", "reviewed"] as const;

export type DecisionReview = {
  status: ReviewStatus;
  /** Days from today to the review date; zero or less once it arrives. */
  daysToReview: number;
  /** A few words for a chip: "Ready to review", "Review in 5 days", "Reviewed". */
  label: string;
  /** The date behind the label, in a short sentence. */
  detail: string;
  /** Waiting, with the review date a week away or less. */
  soon: boolean;
};

/**
 * Where a decision is in its review loop. It waits until its review date,
 * is ready from then on, and counts as reviewed once the user has written a
 * note dated on or after the review date. A note is the user's account, not
 * a rating, so "reviewed" says only that they returned to it.
 */
export function decisionReview(
  decision: Pick<Decision, "review_on">,
  latestNoteOn: string | null,
  todayIso: string,
): DecisionReview {
  const days = calendarDaysBetween(todayIso, decision.review_on);
  if (days > 0)
    return {
      status: "waiting",
      daysToReview: days,
      label:
        days === 1
          ? "Review tomorrow"
          : days <= 14
            ? `Review in ${days} days`
            : `Review ${shortDecisionDate(decision.review_on, todayIso)}`,
      detail: `Review date ${formatCalendarDate(decision.review_on)}`,
      soon: days <= 7,
    };
  if (latestNoteOn && latestNoteOn >= decision.review_on)
    return {
      status: "reviewed",
      daysToReview: days,
      label: "Reviewed",
      detail: `Last note ${shortDecisionDate(latestNoteOn, todayIso)}`,
      soon: false,
    };
  return {
    status: "ready",
    daysToReview: days,
    label: "Ready to review",
    detail:
      days === 0
        ? "Review date is today"
        : days === -1
          ? "Review date was yesterday"
          : `Review date was ${-days} days ago`,
    soon: false,
  };
}

export type NoteStamp = { decision_id: string; observed_on: string };
export type NoteTally = { count: number; latestOn: string | null };

/** How many notes each decision has, and the date of its latest. */
export function tallyNotes(notes: readonly NoteStamp[]) {
  const tally = new Map<string, NoteTally>();
  for (const note of notes) {
    const entry = tally.get(note.decision_id) ?? { count: 0, latestOn: null };
    entry.count += 1;
    if (!entry.latestOn || note.observed_on > entry.latestOn)
      entry.latestOn = note.observed_on;
    tally.set(note.decision_id, entry);
  }
  return tally;
}

export type JournalDecision = Pick<
  Decision,
  "id" | "title" | "decision_on" | "review_on" | "metric_key"
>;

export type JournalSummary = {
  /** Every decision recorded. */
  total: number;
  /** The decisions the figures below count (the most recent, up to a cap). */
  counted: number;
  counts: Record<ReviewStatus, number>;
  /** Decisions with a recorded measure. */
  measured: number;
  notes: number;
  firstDecidedOn: string | null;
  /** What to return to first: ready reviews, oldest first, then the soonest. */
  upNext: { decision: JournalDecision; review: DecisionReview }[];
  /** Ready reviews beyond those in `upNext`. */
  readyBeyond: number;
  /** Decisions recorded in each of the last six months, oldest first. */
  months: { month: string; count: number }[];
};

export function summarizeJournal({
  decisions,
  total,
  notes,
  noteTotal,
  todayIso,
  upNextSize = 3,
}: {
  decisions: readonly JournalDecision[];
  total: number;
  notes: readonly NoteStamp[];
  noteTotal: number;
  todayIso: string;
  upNextSize?: number;
}): JournalSummary {
  const tally = tallyNotes(notes);
  const reviewed = decisions.map((decision) => ({
    decision,
    review: decisionReview(
      decision,
      tally.get(decision.id)?.latestOn ?? null,
      todayIso,
    ),
  }));
  const counts: Record<ReviewStatus, number> = {
    ready: 0,
    waiting: 0,
    reviewed: 0,
  };
  for (const item of reviewed) counts[item.review.status] += 1;
  const byReviewDate = (
    a: (typeof reviewed)[number],
    b: (typeof reviewed)[number],
  ) =>
    a.decision.review_on.localeCompare(b.decision.review_on) ||
    a.decision.title.localeCompare(b.decision.title);
  const ready = reviewed
    .filter((item) => item.review.status === "ready")
    .sort(byReviewDate);
  const waiting = reviewed
    .filter((item) => item.review.status === "waiting")
    .sort(byReviewDate);
  const upNext = [...ready, ...waiting].slice(0, upNextSize);
  const thisMonth = todayIso.slice(0, 7);
  const months = Array.from({ length: 6 }, (_, index) => {
    const month = addCalendarMonths(`${thisMonth}-01`, index - 5).slice(0, 7);
    return {
      month,
      count: decisions.filter((decision) =>
        decision.decision_on.startsWith(month),
      ).length,
    };
  });
  return {
    total: Math.max(total, decisions.length),
    counted: decisions.length,
    counts,
    measured: decisions.filter((decision) => decision.metric_key).length,
    notes: Math.max(noteTotal, notes.length),
    firstDecidedOn: decisions.reduce<string | null>(
      (first, decision) =>
        !first || decision.decision_on < first ? decision.decision_on : first,
      null,
    ),
    upNext,
    readyBeyond: Math.max(
      0,
      ready.length -
        upNext.filter((item) => item.review.status === "ready").length,
    ),
    months,
  };
}

export type JournalTone = "caution" | "neutral" | "positive";

/** The hero's status pill. */
export function journalStatus(summary: JournalSummary): {
  tone: JournalTone;
  label: string;
} {
  const ready = summary.counts.ready;
  if (ready > 0)
    return {
      tone: "caution",
      label: `${ready} ready to review`,
    };
  const next = summary.upNext.find((item) => item.review.status === "waiting");
  if (next)
    return {
      tone: "neutral",
      label: `Next ${next.review.label.charAt(0).toLowerCase()}${next.review.label.slice(1)}`,
    };
  return { tone: "positive", label: "All caught up" };
}

/** "2 ready to review, 4 waiting for their review date, and 6 reviewed." */
export function journalSentence(counts: Record<ReviewStatus, number>) {
  const parts = [
    counts.ready ? `${counts.ready} ready to review` : null,
    counts.waiting
      ? `${counts.waiting} waiting for ${counts.waiting === 1 ? "its" : "their"} review date`
      : null,
    counts.reviewed ? `${counts.reviewed} reviewed` : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0]}.`;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}.`;
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
}

export type DecisionMonth<T> = { month: string; decisions: T[] };

/** Consecutive decisions grouped by the month they were decided. */
export function groupDecisionMonths<T extends { decision_on: string }>(
  decisions: readonly T[],
): DecisionMonth<T>[] {
  const months: DecisionMonth<T>[] = [];
  for (const decision of decisions) {
    const month = decision.decision_on.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.decisions.push(decision);
    else months.push({ month, decisions: [decision] });
  }
  return months;
}

/** How far a decision has come from the day it was made to its review. */
export function decisionArc(
  decisionOn: string,
  reviewOn: string,
  todayIso: string,
) {
  const total = Math.max(1, calendarDaysBetween(decisionOn, reviewOn));
  const elapsed = Math.max(0, calendarDaysBetween(decisionOn, todayIso));
  return {
    total,
    elapsed,
    share: Math.min(1, elapsed / total),
    /** Days left until the review; negative once it has passed. */
    remaining: total - elapsed,
  };
}

/**
 * Why the before-and-after comparison is or is not shown, mirroring
 * `decisionComparisonWindow`: it needs a measure, the review date, all 14
 * days after the decision, and a before window inside the past year.
 */
export type ComparisonGate =
  | { kind: "no_measure" }
  | { kind: "before_review"; opensOn: string | null }
  | { kind: "window_open"; opensOn: string }
  | { kind: "too_old" }
  | { kind: "ready" };

export function comparisonGate(
  decision: Pick<Decision, "decision_on" | "review_on" | "metric_key">,
  todayIso: string,
): ComparisonGate {
  if (!decision.metric_key) return { kind: "no_measure" };
  const windowCloses = shiftDays(decision.decision_on, 15);
  const opensOn =
    decision.review_on > windowCloses ? decision.review_on : windowCloses;
  if (decision.review_on > todayIso)
    return {
      kind: "before_review",
      opensOn: decisionComparisonWindow(decision.decision_on, opensOn)
        ? opensOn
        : null,
    };
  if (decisionComparisonWindow(decision.decision_on, todayIso))
    return { kind: "ready" };
  if (windowCloses > todayIso) return { kind: "window_open", opensOn };
  return { kind: "too_old" };
}

export type ComparisonDay = { on: string; value: number };

/** Each day's value in the two windows, in date order. */
export function comparisonDays(
  comparison: DecisionComparison,
  rows: readonly HistoricalMetric[],
) {
  const pick = (from: string, through: string): ComparisonDay[] =>
    rows
      .filter(
        (row) =>
          row.metric === comparison.metric &&
          row.period.from >= from &&
          row.period.from <= through,
      )
      .sort((a, b) => a.period.from.localeCompare(b.period.from))
      .map((row) => ({ on: row.period.from, value: row.value ?? 0 }));
  return {
    before: pick(comparison.beforeFrom, comparison.beforeThrough),
    after: pick(comparison.afterFrom, comparison.afterThrough),
  };
}

/** The after window against the before window, without judging it. */
export function comparisonChange(before: number, after: number) {
  const delta = after - before;
  return {
    delta,
    direction:
      delta > 0
        ? ("higher" as const)
        : delta < 0
          ? ("lower" as const)
          : ("same" as const),
    /** Whole percent of the before window; null when it was zero. */
    percent: before > 0 ? Math.round((Math.abs(delta) / before) * 100) : null,
  };
}

export const planFields = [
  "title",
  "decision_on",
  "intent",
  "expected_outcome",
  "rationale",
  "assumptions",
  "review_on",
  "goal_id",
  "action_task_id",
  "metric_key",
] as const;

export type PlanField = (typeof planFields)[number];
export type PlanSnapshot = Pick<Decision, PlanField>;

export const planFieldLabels: Record<PlanField, string> = {
  title: "Decision",
  decision_on: "Date decided",
  intent: "Action",
  expected_outcome: "Expected outcome",
  rationale: "Reason",
  assumptions: "Assumptions",
  review_on: "Review date",
  goal_id: "Related goal",
  action_task_id: "Action task",
  metric_key: "Recorded measure",
};

function snapshot(revision: DecisionRevision): PlanSnapshot {
  return {
    title: revision.previous_title,
    decision_on: revision.previous_decision_on,
    intent: revision.previous_intent,
    expected_outcome: revision.previous_expected_outcome,
    rationale: revision.previous_rationale,
    assumptions: revision.previous_assumptions,
    review_on: revision.previous_review_on,
    goal_id: revision.previous_goal_id,
    action_task_id: revision.previous_action_task_id,
    metric_key: revision.previous_metric_key,
  };
}

export type PlanChange = {
  field: PlanField;
  before: string | null;
  after: string | null;
};

export type RevisionStep = {
  revision: DecisionRevision;
  changes: PlanChange[];
  unchanged: PlanField[];
};

/**
 * What each edit changed. Revisions arrive newest first and hold the plan as
 * it was before that edit; what it became is the next newer revision's
 * earlier plan, or the current plan for the newest.
 */
export function revisionTrail(
  current: PlanSnapshot,
  revisions: readonly DecisionRevision[],
): RevisionStep[] {
  return revisions.map((revision, index) => {
    const before = snapshot(revision);
    const after = index === 0 ? current : snapshot(revisions[index - 1]!);
    const changes: PlanChange[] = [];
    const unchanged: PlanField[] = [];
    for (const field of planFields) {
      const was = before[field] || null;
      const now = after[field] || null;
      if (was === now) unchanged.push(field);
      else changes.push({ field, before: was, after: now });
    }
    return { revision, changes, unchanged };
  });
}

/** One-tap review dates from the decision date. */
export function reviewPresets(decisionOn: string) {
  return [
    { label: "In 2 weeks", on: shiftDays(decisionOn, 14) },
    { label: "In 1 month", on: addCalendarMonths(decisionOn, 1) },
    { label: "In 3 months", on: addCalendarMonths(decisionOn, 3) },
  ];
}

/** "Decision day", "Day 1", "Day 16": how long after deciding a note came. */
export function noteDayLabel(decisionOn: string, observedOn: string) {
  const days = calendarDaysBetween(decisionOn, observedOn);
  return days <= 0 ? "Decision day" : `Day ${days}`;
}

export type ObservationEntry<T> =
  | { kind: "note"; note: T; afterReview: boolean }
  | { kind: "review"; on: string; upcoming: boolean };

/**
 * Notes (newest first) with the review date placed among them: above every
 * note while it is still ahead, otherwise between the notes written since
 * and those written before it.
 */
export function observationTrail<T extends { observed_on: string }>(
  notes: readonly T[],
  reviewOn: string,
  todayIso: string,
): ObservationEntry<T>[] {
  if (notes.length === 0) return [];
  const marker = {
    kind: "review" as const,
    on: reviewOn,
    upcoming: reviewOn > todayIso,
  };
  const entries: ObservationEntry<T>[] = notes.map((note) => ({
    kind: "note",
    note,
    afterReview: note.observed_on >= reviewOn,
  }));
  if (marker.upcoming) return [marker, ...entries];
  const firstBefore = entries.findIndex(
    (entry) => entry.kind === "note" && !entry.afterReview,
  );
  if (firstBefore === -1) return [...entries, marker];
  return [
    ...entries.slice(0, firstBefore),
    marker,
    ...entries.slice(firstBefore),
  ];
}
