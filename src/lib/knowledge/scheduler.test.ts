import { describe, expect, it } from "vitest";
import { isReviewDue, nextReviewSchedule } from "./scheduler";

const reviewedAt = new Date("2026-09-06T04:00:00.000Z");

describe("knowledge review scheduler", () => {
  it("resets Again to a ten-minute relearning step", () => {
    const result = nextReviewSchedule("again", 30, reviewedAt);
    expect(result.intervalDays).toBe(0);
    expect(result.nextReviewAt.toISOString()).toBe("2026-09-06T04:10:00.000Z");
  });

  it.each([
    ["hard", 1, "2026-09-07T04:00:00.000Z"],
    ["good", 3, "2026-09-09T04:00:00.000Z"],
    ["easy", 7, "2026-09-13T04:00:00.000Z"],
  ] as const)("uses the initial %s minimum", (outcome, days, expected) => {
    const result = nextReviewSchedule(outcome, 0, reviewedAt);
    expect(result.intervalDays).toBe(days);
    expect(result.nextReviewAt.toISOString()).toBe(expected);
  });

  it("grows repeated successful reviews deterministically", () => {
    expect(nextReviewSchedule("good", 7, reviewedAt).intervalDays).toBe(15);
    expect(nextReviewSchedule("easy", 7, reviewedAt).intervalDays).toBe(25);
  });

  it("treats exact and overdue timestamps as due", () => {
    expect(isReviewDue(reviewedAt.toISOString(), reviewedAt)).toBe(true);
    expect(isReviewDue("2026-09-05T04:00:00.000Z", reviewedAt)).toBe(true);
    expect(isReviewDue("2026-09-07T04:00:00.000Z", reviewedAt)).toBe(false);
  });
});
