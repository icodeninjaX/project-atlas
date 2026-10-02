import { describe, expect, it } from "vitest";
import type { HistoricalMetric } from "@/lib/history/metrics";
import { compareDecisionHistory, type DecisionRevision } from "./decision";
import {
  addCalendarMonths,
  comparisonChange,
  comparisonDays,
  comparisonGate,
  decisionArc,
  decisionReview,
  groupDecisionMonths,
  journalSentence,
  journalStatus,
  noteDayLabel,
  observationTrail,
  reviewPresets,
  revisionTrail,
  summarizeJournal,
  tallyNotes,
  type JournalDecision,
  type PlanSnapshot,
} from "./view";

const today = "2026-10-02";

function decision(
  id: string,
  decisionOn: string,
  reviewOn: string,
  metric: JournalDecision["metric_key"] = null,
): JournalDecision {
  return {
    id,
    title: `Decision ${id}`,
    decision_on: decisionOn,
    review_on: reviewOn,
    metric_key: metric,
  };
}

describe("decisionReview", () => {
  it("waits for the review date and counts down to it", () => {
    expect(
      decisionReview({ review_on: "2026-10-03" }, null, today),
    ).toMatchObject({
      status: "waiting",
      label: "Review tomorrow",
      soon: true,
      daysToReview: 1,
    });
    expect(
      decisionReview({ review_on: "2026-10-12" }, null, today),
    ).toMatchObject({ label: "Review in 10 days", soon: false });
    expect(decisionReview({ review_on: "2026-12-20" }, null, today).label).toBe(
      "Review Dec 20",
    );
    expect(decisionReview({ review_on: "2027-01-04" }, null, today).label).toBe(
      "Review Jan 4, 2027",
    );
  });

  it("is ready from the review date until a note is written on or after it", () => {
    expect(decisionReview({ review_on: today }, null, today)).toMatchObject({
      status: "ready",
      detail: "Review date is today",
    });
    expect(
      decisionReview({ review_on: "2026-10-01" }, "2026-09-30", today),
    ).toMatchObject({ status: "ready", detail: "Review date was yesterday" });
    expect(
      decisionReview({ review_on: "2026-09-25" }, null, today).detail,
    ).toBe("Review date was 7 days ago");
    expect(
      decisionReview({ review_on: "2026-09-25" }, "2026-09-25", today),
    ).toMatchObject({ status: "reviewed", detail: "Last note Sep 25" });
  });
});

describe("summarizeJournal", () => {
  const decisions = [
    decision("a", "2026-09-01", "2026-09-15", "expense_centavos"),
    decision("b", "2026-09-10", "2026-09-24"),
    decision("c", "2026-08-01", "2026-09-01", "task_completions"),
    decision("d", "2026-09-28", "2026-10-05"),
    decision("e", "2026-09-30", "2026-11-30"),
    decision("f", "2026-04-02", "2026-05-02"),
  ];
  const notes = [
    { decision_id: "c", observed_on: "2026-09-02" },
    { decision_id: "c", observed_on: "2026-08-15" },
    { decision_id: "a", observed_on: "2026-09-05" },
    { decision_id: "f", observed_on: "2026-05-03" },
  ];

  it("counts each review state and lists what to return to first", () => {
    const summary = summarizeJournal({
      decisions,
      total: 6,
      notes,
      noteTotal: 4,
      todayIso: today,
    });
    expect(summary.counts).toEqual({ ready: 2, waiting: 2, reviewed: 2 });
    expect(summary.measured).toBe(2);
    expect(summary.notes).toBe(4);
    expect(summary.firstDecidedOn).toBe("2026-04-02");
    // Ready reviews come first, the longest waiting at the top, then the
    // soonest upcoming review.
    expect(summary.upNext.map((item) => item.decision.id)).toEqual([
      "a",
      "b",
      "d",
    ]);
    expect(summary.readyBeyond).toBe(0);
    expect(summary.months).toEqual([
      { month: "2026-05", count: 0 },
      { month: "2026-06", count: 0 },
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 1 },
      { month: "2026-09", count: 4 },
      { month: "2026-10", count: 0 },
    ]);
    expect(journalStatus(summary)).toEqual({
      tone: "caution",
      label: "2 ready to review",
    });
    expect(journalSentence(summary.counts)).toBe(
      "2 ready to review, 2 waiting for their review date, and 2 reviewed.",
    );
  });

  it("says how many ready reviews are left beyond the short list", () => {
    const summary = summarizeJournal({
      decisions,
      total: 6,
      notes: [],
      noteTotal: 0,
      todayIso: today,
      upNextSize: 2,
    });
    expect(summary.counts.ready).toBe(4);
    expect(summary.readyBeyond).toBe(2);
  });

  it("names the next review, or says everything is caught up", () => {
    const waiting = summarizeJournal({
      decisions: [decision("d", "2026-09-28", "2026-10-05")],
      total: 1,
      notes: [],
      noteTotal: 0,
      todayIso: today,
    });
    expect(journalStatus(waiting)).toEqual({
      tone: "neutral",
      label: "Next review in 3 days",
    });
    expect(journalSentence(waiting.counts)).toBe(
      "1 waiting for its review date.",
    );
    const done = summarizeJournal({
      decisions: [decision("c", "2026-08-01", "2026-09-01")],
      total: 1,
      notes: [{ decision_id: "c", observed_on: "2026-09-01" }],
      noteTotal: 1,
      todayIso: today,
    });
    expect(journalStatus(done)).toEqual({
      tone: "positive",
      label: "All caught up",
    });
    expect(journalSentence({ ready: 1, waiting: 0, reviewed: 3 })).toBe(
      "1 ready to review and 3 reviewed.",
    );
  });

  it("never reports fewer decisions or notes than it counted", () => {
    const summary = summarizeJournal({
      decisions,
      total: 0,
      notes,
      noteTotal: 0,
      todayIso: today,
    });
    expect(summary.total).toBe(6);
    expect(summary.notes).toBe(4);
  });
});

describe("tallyNotes", () => {
  it("counts notes and keeps the latest date for each decision", () => {
    expect(
      tallyNotes([
        { decision_id: "a", observed_on: "2026-09-02" },
        { decision_id: "a", observed_on: "2026-09-12" },
        { decision_id: "b", observed_on: "2026-09-01" },
      ]),
    ).toEqual(
      new Map([
        ["a", { count: 2, latestOn: "2026-09-12" }],
        ["b", { count: 1, latestOn: "2026-09-01" }],
      ]),
    );
  });
});

describe("groupDecisionMonths", () => {
  it("groups consecutive decisions by the month decided", () => {
    const groups = groupDecisionMonths([
      decision("a", "2026-10-01", "2026-11-01"),
      decision("b", "2026-09-20", "2026-10-20"),
      decision("c", "2026-09-02", "2026-10-02"),
      decision("d", "2025-09-02", "2025-10-02"),
    ]);
    expect(
      groups.map((group) => [
        group.month,
        group.decisions.map((item) => item.id),
      ]),
    ).toEqual([
      ["2026-10", ["a"]],
      ["2026-09", ["b", "c"]],
      ["2025-09", ["d"]],
    ]);
  });
});

describe("decisionArc", () => {
  it("measures days from the decision toward the review", () => {
    expect(decisionArc("2026-09-20", "2026-10-20", today)).toEqual({
      total: 30,
      elapsed: 12,
      share: 0.4,
      remaining: 18,
    });
    expect(decisionArc("2026-09-01", "2026-09-15", today)).toMatchObject({
      share: 1,
      remaining: -17,
    });
  });
});

describe("comparisonGate", () => {
  it("explains why the comparison is not shown yet", () => {
    expect(
      comparisonGate(
        {
          decision_on: "2026-09-01",
          review_on: "2026-09-15",
          metric_key: null,
        },
        today,
      ),
    ).toEqual({ kind: "no_measure" });
    // The review date is ahead; the window closed long before it.
    expect(
      comparisonGate(
        {
          decision_on: "2026-09-01",
          review_on: "2026-10-10",
          metric_key: "expense_centavos",
        },
        today,
      ),
    ).toEqual({ kind: "before_review", opensOn: "2026-10-10" });
    // A one-week review: the 14 days after the decision end later.
    expect(
      comparisonGate(
        {
          decision_on: "2026-09-25",
          review_on: "2026-10-02",
          metric_key: "expense_centavos",
        },
        today,
      ),
    ).toEqual({ kind: "window_open", opensOn: "2026-10-10" });
    expect(
      comparisonGate(
        {
          decision_on: "2026-09-01",
          review_on: "2026-09-15",
          metric_key: "expense_centavos",
        },
        today,
      ),
    ).toEqual({ kind: "ready" });
    expect(
      comparisonGate(
        {
          decision_on: "2025-09-01",
          review_on: "2025-10-01",
          metric_key: "expense_centavos",
        },
        today,
      ),
    ).toEqual({ kind: "too_old" });
    // A review so far out that the windows will be past the year by then.
    expect(
      comparisonGate(
        {
          decision_on: "2026-09-01",
          review_on: "2028-01-01",
          metric_key: "expense_centavos",
        },
        today,
      ),
    ).toEqual({ kind: "before_review", opensOn: null });
  });
});

describe("comparisonDays and comparisonChange", () => {
  it("returns each window's days in order and the change between them", () => {
    const rows: HistoricalMetric[] = [];
    for (let day = 18; day <= 46; day += 1) {
      const date = new Date(Date.UTC(2026, 7, day, 12))
        .toISOString()
        .slice(0, 10);
      rows.push({
        metric: "task_completions",
        period: { from: date, through: date },
        value: date < "2026-09-01" ? 1 : 3,
        sourceCount: 1,
        coverage: "recorded",
        firstRecordedOn: "2026-01-01",
      });
    }
    // Out of order, as nothing promises the rows arrive sorted.
    const shuffled = [...rows].reverse();
    const comparison = compareDecisionHistory(
      {
        decision_on: "2026-09-01",
        review_on: "2026-09-15",
        metric_key: "task_completions",
      },
      today,
      shuffled,
    );
    expect(comparison).not.toBeNull();
    const days = comparisonDays(comparison!, shuffled);
    expect(days.before).toHaveLength(14);
    expect(days.after).toHaveLength(14);
    expect(days.before[0]).toEqual({ on: "2026-08-18", value: 1 });
    expect(days.after.at(-1)).toEqual({ on: "2026-09-15", value: 3 });
    expect(comparisonChange(comparison!.before, comparison!.after)).toEqual({
      delta: 28,
      direction: "higher",
      percent: 200,
    });
    expect(comparisonChange(100, 75)).toEqual({
      delta: -25,
      direction: "lower",
      percent: 25,
    });
    expect(comparisonChange(0, 0)).toEqual({
      delta: 0,
      direction: "same",
      percent: null,
    });
  });
});

describe("revisionTrail", () => {
  const current: PlanSnapshot = {
    title: "Apply weekly",
    decision_on: "2026-09-01",
    intent: "Apply selectively",
    expected_outcome: "Get interviews",
    rationale: null,
    assumptions: "The job market may change",
    review_on: "2026-10-01",
    goal_id: "goal-1",
    action_task_id: null,
    metric_key: null,
  };
  const revision = (
    id: string,
    changes: Partial<DecisionRevision>,
  ): DecisionRevision => ({
    id,
    previous_title: current.title,
    previous_decision_on: current.decision_on,
    previous_intent: current.intent,
    previous_expected_outcome: current.expected_outcome,
    previous_rationale: current.rationale,
    previous_assumptions: current.assumptions,
    previous_review_on: current.review_on,
    previous_goal_id: current.goal_id,
    previous_action_task_id: current.action_task_id,
    previous_metric_key: current.metric_key,
    changed_at: "2026-09-20T07:00:00Z",
    ...changes,
  });

  it("compares each earlier plan with the one that replaced it", () => {
    const trail = revisionTrail(current, [
      // Newest edit: the action and assumptions changed.
      revision("r2", {
        previous_intent: "Apply each week",
        previous_assumptions: "",
      }),
      // Older edit: only the title changed (r2's earlier plan still had
      // "Apply each week").
      revision("r1", {
        previous_title: "Apply more",
        previous_intent: "Apply each week",
        previous_assumptions: null,
      }),
    ]);
    expect(trail[0]!.changes).toEqual([
      {
        field: "intent",
        before: "Apply each week",
        after: "Apply selectively",
      },
      {
        field: "assumptions",
        before: null,
        after: "The job market may change",
      },
    ]);
    expect(trail[0]!.unchanged).toHaveLength(8);
    expect(trail[1]!.changes).toEqual([
      { field: "title", before: "Apply more", after: "Apply weekly" },
    ]);
  });
});

describe("form and note helpers", () => {
  it("offers review dates two weeks, one month, and three months out", () => {
    expect(reviewPresets("2026-01-31")).toEqual([
      { label: "In 2 weeks", on: "2026-02-14" },
      { label: "In 1 month", on: "2026-02-28" },
      { label: "In 3 months", on: "2026-04-30" },
    ]);
    expect(addCalendarMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("labels a note by its day after the decision", () => {
    expect(noteDayLabel("2026-09-01", "2026-09-01")).toBe("Decision day");
    expect(noteDayLabel("2026-09-01", "2026-09-17")).toBe("Day 16");
  });

  it("places the review date among the notes", () => {
    const notes = [
      { id: "3", observed_on: "2026-09-20" },
      { id: "2", observed_on: "2026-09-15" },
      { id: "1", observed_on: "2026-09-05" },
    ];
    const kinds = (entries: ReturnType<typeof observationTrail>) =>
      entries.map((entry) =>
        entry.kind === "review"
          ? `review${entry.upcoming ? " ahead" : ""}`
          : (entry.note as (typeof notes)[number]).id,
      );
    expect(kinds(observationTrail(notes, "2026-09-15", today))).toEqual([
      "3",
      "2",
      "review",
      "1",
    ]);
    expect(kinds(observationTrail(notes, "2026-09-25", today))).toEqual([
      "review",
      "3",
      "2",
      "1",
    ]);
    expect(kinds(observationTrail(notes, "2026-09-01", today))).toEqual([
      "3",
      "2",
      "1",
      "review",
    ]);
    expect(kinds(observationTrail(notes, "2026-10-09", today))).toEqual([
      "review ahead",
      "3",
      "2",
      "1",
    ]);
    expect(observationTrail([], "2026-09-15", today)).toEqual([]);
  });
});
