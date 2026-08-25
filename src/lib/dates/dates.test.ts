import { describe, expect, it } from "vitest";
import {
  compactReviewWeekLabel,
  manilaDateLabel,
  mondayWeekStart,
  previousManilaDayWindow,
  reviewWeekLabel,
  resolveCalendarMonth,
} from "./dates";

describe("date helpers", () => {
  it("formats UTC timestamps as dates in Asia/Manila", () => {
    expect(manilaDateLabel("2026-07-25T17:00:00.000Z")).toBe(
      "Sunday, July 26, 2026",
    );
  });

  it("returns Monday as the start of a Philippine-local week", () => {
    expect(mondayWeekStart("2026-07-26T04:00:00.000Z")).toBe("2026-07-20");
  });

  it("formats review weeks without making the user decode an ISO date", () => {
    expect(reviewWeekLabel("2026-08-24")).toBe("August 24–30, 2026");
    expect(compactReviewWeekLabel("2026-08-31")).toBe("Aug 31–Sep 6");
  });

  it("returns yesterday's UTC boundaries in the Manila timezone", () => {
    expect(previousManilaDayWindow("2026-08-25T16:30:00.000Z")).toEqual({
      date: "2026-08-25",
      start: "2026-08-24T16:00:00.000Z",
      end: "2026-08-25T16:00:00.000Z",
    });
  });

  it.each(["", "2026-00", "2026-13", "2026-1", "not-a-month"])(
    "falls back when the requested calendar month is %s",
    (requested) => {
      expect(resolveCalendarMonth(requested, "2026-08")).toBe("2026-08");
    },
  );

  it("keeps a valid requested calendar month", () => {
    expect(resolveCalendarMonth("2027-01", "2026-08")).toBe("2027-01");
  });
});
