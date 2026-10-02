import { describe, expect, it } from "vitest";
import {
  addDays,
  archiveSentence,
  archiveSummary,
  formatAverage,
  isoWeekNumber,
  lastWeekCompass,
  promptsWritten,
  reviewHeadline,
  reviewStreak,
  reviewSummary,
  streakLabel,
  thisWeekStatus,
  weekDayIndex,
  weekDays,
  type ReviewArchiveItem,
} from "./view";

const weekStart = "2026-09-28"; // Monday

function review(
  start: string,
  overrides: Partial<ReviewArchiveItem> = {},
): ReviewArchiveItem {
  return {
    id: `review-${start}`,
    weekStart: start,
    wins: null,
    challenges: null,
    lessons: null,
    timeWasters: null,
    moneyReflection: null,
    careerReflection: null,
    nextWeekFocus: null,
    energyScore: null,
    stressScore: null,
    overallScore: null,
    completedAt: `${addDays(start, 6)}T12:00:00Z`,
    reflectedAt: `${addDays(start, 6)}T12:00:00Z`,
    ...overrides,
  };
}

describe("review week", () => {
  it("places today in the Manila week", () => {
    // 7:00 PM Friday in Manila.
    expect(weekDayIndex(weekStart, "2026-10-02T11:00:00Z")).toBe(4);
    // 11:30 PM Sunday UTC is already Monday in Manila; clamp to Sunday.
    expect(weekDayIndex(weekStart, "2026-10-04T16:30:00Z")).toBe(6);
    // Monday, 12:30 AM in Manila is still Sunday in UTC.
    expect(weekDayIndex(weekStart, "2026-09-27T16:30:00Z")).toBe(0);
  });

  it("numbers the week the ISO way", () => {
    expect(isoWeekNumber(weekStart)).toBe(40);
    expect(isoWeekNumber("2026-12-28")).toBe(53);
    expect(isoWeekNumber("2027-01-04")).toBe(1);
  });

  it("lays out the seven days around today", () => {
    const days = weekDays(weekStart, 4);
    expect(days.map((day) => day.day)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(days.map((day) => day.short)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(days[3]).toMatchObject({ state: "past", name: "Thursday" });
    expect(days[4]).toMatchObject({ state: "today", iso: "2026-10-02" });
    expect(days[6]).toMatchObject({ state: "future" });
  });

  it("counts written prompts, ignoring whitespace", () => {
    expect(promptsWritten({})).toBe(0);
    expect(
      promptsWritten({
        wins: "A good demo",
        lessons: "   ",
        nextWeekFocus: "Rest",
      }),
    ).toBe(2);
  });

  it("says where this week's review stands", () => {
    expect(
      thisWeekStatus({
        dayIndex: 4,
        submitted: true,
        hasDraft: true,
        written: 7,
      }),
    ).toMatchObject({ tone: "positive", label: "Submitted" });
    expect(
      thisWeekStatus({
        dayIndex: 4,
        submitted: false,
        hasDraft: true,
        written: 3,
      }),
    ).toEqual({
      tone: "primary",
      label: "Draft saved",
      sentence:
        "A draft is waiting, with 3 of 7 prompts written. The week closes on Sunday, in 2 days.",
    });
    expect(
      thisWeekStatus({
        dayIndex: 6,
        submitted: false,
        hasDraft: false,
        written: 0,
      }),
    ).toMatchObject({
      label: "Ready to reflect",
      sentence: expect.stringContaining("The week closes today."),
    });
    expect(
      thisWeekStatus({
        dayIndex: 1,
        submitted: false,
        hasDraft: false,
        written: 0,
      }),
    ).toMatchObject({
      tone: "neutral",
      label: "Not started",
      sentence: expect.stringContaining("in 5 days"),
    });
    expect(
      thisWeekStatus({
        dayIndex: 5,
        submitted: false,
        hasDraft: false,
        written: 0,
      }).sentence,
    ).toContain("in 1 day.");
  });
});

describe("review streak", () => {
  const history = [
    review("2026-09-21"),
    review("2026-09-14"),
    review("2026-09-07"),
    review("2026-08-24"),
  ];

  it("counts back from last week while this week is open", () => {
    expect(reviewStreak(history, weekStart, false)).toEqual({
      weeks: 3,
      orMore: false,
    });
    expect(streakLabel({ weeks: 3, orMore: false })).toBe("3-week streak");
  });

  it("includes this week once it is submitted", () => {
    expect(
      reviewStreak([review(weekStart), ...history], weekStart, false).weeks,
    ).toBe(4);
  });

  it("does not count drafts", () => {
    expect(
      reviewStreak(
        [review("2026-09-21", { completedAt: null }), ...history.slice(1)],
        weekStart,
        false,
      ).weeks,
    ).toBe(0);
  });

  it("flags a streak that may run past what was loaded", () => {
    const run = [review("2026-09-21"), review("2026-09-14")];
    expect(reviewStreak(run, weekStart, true)).toEqual({
      weeks: 2,
      orMore: true,
    });
    expect(streakLabel({ weeks: 2, orMore: true })).toBe("2+-week streak");
    expect(reviewStreak(run, weekStart, false).orMore).toBe(false);
  });

  it("has no label below two weeks", () => {
    expect(streakLabel({ weeks: 1, orMore: false })).toBeNull();
    expect(streakLabel({ weeks: 0, orMore: false })).toBeNull();
  });
});

describe("compass", () => {
  it("carries last week's chosen focus into this week", () => {
    expect(
      lastWeekCompass(
        [review("2026-09-21", { nextWeekFocus: " Protect mornings " })],
        weekStart,
      ),
    ).toEqual({
      reviewId: "review-2026-09-21",
      weekStart: "2026-09-21",
      text: "Protect mornings",
    });
  });

  it("ignores an older week's focus and an empty one", () => {
    expect(
      lastWeekCompass(
        [review("2026-09-14", { nextWeekFocus: "Old focus" })],
        weekStart,
      ),
    ).toBeNull();
    expect(
      lastWeekCompass(
        [review("2026-09-21", { nextWeekFocus: "  " })],
        weekStart,
      ),
    ).toBeNull();
  });
});

describe("archive summary", () => {
  const reviews = [
    review("2026-09-21", { energyScore: 8, stressScore: 4, overallScore: 8 }),
    review("2026-09-14", {
      energyScore: 6,
      stressScore: 6,
      overallScore: null,
    }),
    review("2026-09-07", {
      energyScore: 8,
      stressScore: 8,
      overallScore: 5,
      completedAt: null,
    }),
  ];

  it("averages scored weeks and finds the peak and the latest change", () => {
    const summary = archiveSummary(reviews);
    expect(summary.weeks).toBe(3);
    expect(summary.submitted).toBe(2);
    expect(formatAverage(summary.averages.overall)).toBe("6.5");
    expect(formatAverage(summary.averages.energy)).toBe("7.3");
    expect(formatAverage(summary.averages.stress)).toBe("6.0");
    // A tie goes to the most recent week.
    expect(summary.peakEnergy).toEqual({ score: 8, weekStart: "2026-09-21" });
    expect(summary.overallChange).toEqual({
      latest: 8,
      previous: 5,
      weekStart: "2026-09-21",
    });
    expect(archiveSentence(summary)).toBe(
      "Weeks have felt 6.5 out of 10 on average, and energy peaked at 8 in the week of Sep 21–27.",
    );
  });

  it("reads well without scores", () => {
    const summary = archiveSummary([review("2026-09-21")]);
    expect(formatAverage(summary.averages.overall)).toBe("—");
    expect(summary.peakEnergy).toBeNull();
    expect(summary.overallChange).toBeNull();
    expect(archiveSentence(summary)).toBe(
      "Scores are optional. Your written reflections carry the meaning.",
    );
  });

  it("leads with the chosen focus and never repeats it below", () => {
    const item = review("2026-09-21", {
      wins: "Shipped it",
      nextWeekFocus: "Rest",
    });
    expect(reviewHeadline(item)).toBe("Rest");
    expect(reviewSummary(item)).toBe("Shipped it");

    const winsOnly = review("2026-09-21", { wins: "Shipped it" });
    expect(reviewHeadline(winsOnly)).toBe("Shipped it");
    expect(reviewSummary(winsOnly)).toBe(
      "This reflection keeps the week in view.",
    );
  });
});
