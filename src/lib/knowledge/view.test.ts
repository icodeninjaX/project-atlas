import { describe, expect, it } from "vitest";
import {
  filterConcepts,
  intervalLabel,
  libraryGroups,
  manilaDayDistance,
  memorySummary,
  projectedIntervals,
  queueSentence,
  queueStatus,
  recallStats,
  relativeDay,
  reviewChip,
  reviewForecast,
  reviewStreak,
  sortConcepts,
  spacingLadder,
  strengthCounts,
  strengthLevel,
  viewCounts,
  type KnowledgeConcept,
  type KnowledgeReview,
} from "./view";

// 7:00 PM on Friday, October 2, in Manila.
const now = "2026-10-02T11:00:00.000Z";

let sequence = 0;
function concept(overrides: Partial<KnowledgeConcept> = {}): KnowledgeConcept {
  sequence += 1;
  return {
    id: `99100000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    title: `Concept ${sequence}`,
    notes: "Notes",
    category: "Finance",
    tags: [],
    example: null,
    personal_explanation: null,
    confidence: 3,
    review_count: 2,
    interval_days: 3,
    last_reviewed_at: "2026-09-29T02:00:00.000Z",
    next_review_at: "2026-10-05T02:00:00.000Z",
    archived_at: null,
    created_at: "2026-09-20T02:00:00.000Z",
    ...overrides,
  };
}

function review(
  reviewedAt: string,
  outcome: KnowledgeReview["outcome"] = "good",
): KnowledgeReview {
  sequence += 1;
  return {
    id: `99200000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    concept_id: "99100000-0000-4000-8000-000000000001",
    outcome,
    reviewed_at: reviewedAt,
    next_review_at: reviewedAt,
    next_interval_days: 3,
  };
}

describe("Manila dates", () => {
  it("counts calendar days in Manila, not UTC", () => {
    // 11:30 PM Manila on Oct 2 to 12:30 AM Manila on Oct 3.
    expect(
      manilaDayDistance("2026-10-02T15:30:00.000Z", "2026-10-02T16:30:00.000Z"),
    ).toBe(1);
    expect(relativeDay("2026-10-03T01:00:00.000Z", now)).toBe("Tomorrow");
    expect(relativeDay("2026-10-01T01:00:00.000Z", now)).toBe("Yesterday");
    expect(relativeDay("2026-09-29T01:00:00.000Z", now)).toBe("3 days ago");
    expect(relativeDay("2026-10-20T01:00:00.000Z", now)).toBe("Oct 20, 2026");
  });

  it("names intervals the way people say them", () => {
    expect(intervalLabel(0)).toBe("10 min");
    expect(intervalLabel(1)).toBe("1 day");
    expect(intervalLabel(33)).toBe("33 days");
    expect(intervalLabel(73)).toBe("2 months");
    expect(intervalLabel(400)).toBe("1.1 years");
  });
});

describe("strength", () => {
  it("clamps confidence to five levels and counts them", () => {
    expect(strengthLevel(0)).toBe(1);
    expect(strengthLevel(9)).toBe(5);
    expect(
      strengthCounts([
        concept({ confidence: 1 }),
        concept({ confidence: 1 }),
        concept({ confidence: 4 }),
      ]),
    ).toEqual({ 1: 2, 2: 0, 3: 0, 4: 1, 5: 0 });
  });
});

describe("browsing", () => {
  const due = concept({
    title: "Beta",
    next_review_at: "2026-10-02T10:00:00.000Z",
  });
  const weak = concept({
    title: "alpha",
    confidence: 2,
    tags: ["Money"],
    category: "Career",
    created_at: "2026-09-30T00:00:00.000Z",
  });
  const archived = concept({
    title: "Gamma",
    archived_at: "2026-09-30T00:00:00.000Z",
  });
  const all = [due, weak, archived];

  it("counts each view, leaving archived concepts out of the others", () => {
    expect(viewCounts(all, now)).toEqual({
      all: 2,
      due: 1,
      weak: 1,
      archived: 1,
    });
  });

  it("filters by view, category, and a case-insensitive search of tags", () => {
    expect(
      filterConcepts(all, {
        view: "all",
        query: "",
        category: "all",
        nowIso: now,
      }),
    ).toEqual([due, weak]);
    expect(
      filterConcepts(all, {
        view: "due",
        query: "",
        category: "all",
        nowIso: now,
      }),
    ).toEqual([due]);
    expect(
      filterConcepts(all, {
        view: "all",
        query: "MONEY",
        category: "all",
        nowIso: now,
      }),
    ).toEqual([weak]);
    expect(
      filterConcepts(all, {
        view: "all",
        query: "",
        category: "Finance",
        nowIso: now,
      }),
    ).toEqual([due]);
    expect(
      filterConcepts(all, {
        view: "archived",
        query: "",
        category: "all",
        nowIso: now,
      }),
    ).toEqual([archived]);
  });

  it("sorts by next review, newest, or title", () => {
    expect(sortConcepts([weak, due], "next-review")).toEqual([due, weak]);
    expect(sortConcepts([due, weak], "newest")).toEqual([weak, due]);
    expect(sortConcepts([due, weak], "title")).toEqual([weak, due]);
  });

  it("groups by when concepts return, only when sorted by next review", () => {
    const week = concept({ next_review_at: "2026-10-09T01:00:00.000Z" });
    const later = concept({ next_review_at: "2026-10-10T01:00:00.000Z" });
    const groups = libraryGroups([due, week, later], {
      view: "all",
      sort: "next-review",
      nowIso: now,
    });
    expect(groups.map((group) => [group.id, group.concepts.length])).toEqual([
      ["due", 1],
      ["week", 1],
      ["later", 1],
    ]);
    expect(
      libraryGroups([due, week], { view: "all", sort: "title", nowIso: now }),
    ).toMatchObject([{ id: "sorted", label: "A to Z", detail: "2 concepts" }]);
    expect(
      libraryGroups([archived], {
        view: "archived",
        sort: "next-review",
        nowIso: now,
      }),
    ).toMatchObject([{ id: "archived" }]);
    expect(
      libraryGroups([], { view: "all", sort: "next-review", nowIso: now }),
    ).toEqual([]);
  });
});

describe("reviewChip", () => {
  it.each([
    ["2026-09-30T01:00:00.000Z", 2, "2 days overdue", "overdue"],
    ["2026-10-01T01:00:00.000Z", 2, "1 day overdue", "overdue"],
    ["2026-10-02T01:00:00.000Z", 2, "Due now", "today"],
    ["2026-10-02T01:00:00.000Z", 0, "New · due now", "today"],
    ["2026-10-02T11:10:00.000Z", 2, "In 10 min", "today"],
    ["2026-10-02T14:00:00.000Z", 2, "Later today", "today"],
    ["2026-10-03T01:00:00.000Z", 2, "Tomorrow", "soon"],
    ["2026-10-09T01:00:00.000Z", 2, "In 7 days", "soon"],
    ["2026-10-20T01:00:00.000Z", 2, "Oct 20", "later"],
  ] as const)("%s reads as %s", (nextReviewAt, reviewCount, label, tone) => {
    expect(
      reviewChip(
        concept({ next_review_at: nextReviewAt, review_count: reviewCount }),
        now,
      ),
    ).toMatchObject({ label, tone });
  });

  it("has nothing to say about an archived concept", () => {
    expect(reviewChip(concept({ archived_at: now }), now)).toBeNull();
  });
});

describe("memorySummary", () => {
  it("splits the queue into new and overdue, oldest first", () => {
    const overdue = concept({ next_review_at: "2026-09-30T01:00:00.000Z" });
    const fresh = concept({
      review_count: 0,
      confidence: 1,
      next_review_at: "2026-10-02T09:00:00.000Z",
    });
    const tomorrow = concept({ next_review_at: "2026-10-03T01:00:00.000Z" });
    const summary = memorySummary(
      [tomorrow, fresh, overdue, concept({ archived_at: now })],
      now,
    );
    expect(summary).toMatchObject({
      active: 3,
      due: 2,
      fresh: 1,
      overdue: 1,
      weak: 1,
      categories: 1,
    });
    expect(summary.queue).toEqual([overdue, fresh]);
    expect(summary.practice).toEqual([fresh]);
    expect(summary.nextScheduled).toBe(tomorrow);
    expect(queueStatus(summary)).toEqual({
      label: "1 overdue",
      tone: "caution",
    });
    expect(queueSentence(summary, now)).toBe(
      "1 new and 1 returning. Recall each one before you check your notes.",
    );
  });

  it("says when the next review is once everything is done", () => {
    const summary = memorySummary(
      [concept({ next_review_at: "2026-10-03T01:00:00.000Z" })],
      now,
    );
    expect(queueStatus(summary)).toEqual({
      label: "All caught up",
      tone: "positive",
    });
    expect(queueSentence(summary, now)).toBe(
      "Nothing is due. Your next review is tomorrow.",
    );
    expect(
      queueSentence(
        memorySummary(
          [concept({ next_review_at: "2026-10-20T01:00:00.000Z" })],
          now,
        ),
        now,
      ),
    ).toBe("Nothing is due. Your next review is on Oct 20.");
  });

  it("explains an archive-only library", () => {
    const summary = memorySummary([concept({ archived_at: now })], now);
    expect(queueStatus(summary).label).toBe("Nothing to review");
    expect(queueSentence(summary, now)).toMatch(/Every concept is archived/);
  });
});

describe("reviewForecast", () => {
  it("counts due concepts toward today and names the busiest day", () => {
    const forecast = reviewForecast(
      [
        concept({ next_review_at: "2026-09-28T01:00:00.000Z" }),
        concept({ next_review_at: "2026-10-02T14:00:00.000Z" }),
        concept({ next_review_at: "2026-10-04T01:00:00.000Z" }),
        concept({ next_review_at: "2026-10-04T05:00:00.000Z" }),
        concept({ next_review_at: "2026-10-04T08:00:00.000Z" }),
        concept({ next_review_at: "2026-10-30T01:00:00.000Z" }),
        concept({ archived_at: now }),
      ],
      now,
    );
    expect(forecast.days.map((day) => [day.label, day.count])).toEqual([
      ["Today", 2],
      ["Sat", 0],
      ["Sun", 3],
      ["Mon", 0],
      ["Tue", 0],
      ["Wed", 0],
      ["Thu", 0],
    ]);
    expect(forecast.later).toBe(1);
    expect(forecast.busiest?.name).toBe("Sunday, Oct 4");
  });
});

describe("recall stats and streak", () => {
  it("rates recall over the last 30 days and counts this week", () => {
    const stats = recallStats(
      [
        review("2026-10-02T02:00:00.000Z", "good"),
        review("2026-10-01T02:00:00.000Z", "easy"),
        review("2026-09-20T02:00:00.000Z", "again"),
        review("2026-09-20T03:00:00.000Z", "hard"),
        review("2026-08-01T02:00:00.000Z", "again"),
      ],
      now,
    );
    expect(stats).toMatchObject({
      total: 4,
      recalled: 2,
      rate: 0.5,
      thisWeek: 2,
    });
    expect(recallStats([], now).rate).toBeNull();
  });

  it("keeps a streak alive until today ends", () => {
    const yesterdayOnward = [
      review("2026-10-01T02:00:00.000Z"),
      review("2026-09-30T02:00:00.000Z"),
      review("2026-09-28T02:00:00.000Z"),
    ];
    expect(reviewStreak(yesterdayOnward, now)).toEqual({
      days: 2,
      reviewedToday: false,
    });
    expect(
      reviewStreak(
        [review("2026-10-02T02:00:00.000Z"), ...yesterdayOnward],
        now,
      ),
    ).toEqual({ days: 3, reviewedToday: true });
    expect(reviewStreak([review("2026-09-29T02:00:00.000Z")], now).days).toBe(
      0,
    );
  });
});

describe("scheduling previews", () => {
  it("previews each rating's interval with the shared scheduler", () => {
    expect(projectedIntervals({ interval_days: 0 })).toEqual({
      again: 0,
      hard: 1,
      good: 3,
      easy: 7,
    });
    expect(projectedIntervals({ interval_days: 7 })).toEqual({
      again: 0,
      hard: 8,
      good: 15,
      easy: 25,
    });
  });

  it("shows how spacing stretches when every review goes well", () => {
    expect(spacingLadder()).toEqual([3, 7, 15, 33, 73]);
  });
});
