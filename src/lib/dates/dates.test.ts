import { describe, expect, it } from "vitest";
import {
  isCalendarDate,
  calendarDaysBetween,
  formatCalendarDate,
  formatCalendarMonth,
  formatWeekOfTitle,
  compactReviewWeekLabel,
  manilaDateLabel,
  manilaTodayIsoDate,
  mondayWeekStart,
  previousManilaDayWindow,
  reviewWeekLabel,
  resolveCalendarMonth,
} from "./dates";

describe("date helpers", () => {
  it("returns today's calendar date in Asia/Manila", () => {
    expect(manilaTodayIsoDate(new Date("2026-09-30T16:30:00.000Z"))).toBe(
      "2026-10-01",
    );
  });

  it("counts whole calendar days between two dates", () => {
    expect(calendarDaysBetween("2026-10-01", "2026-12-31")).toBe(91);
    expect(calendarDaysBetween("2026-10-01", "2026-10-01")).toBe(0);
    expect(calendarDaysBetween("2026-10-01", "2026-09-20")).toBe(-11);
  });

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

  it("formats calendar dates in one app-wide style", () => {
    expect(formatCalendarDate("2026-09-30")).toBe("Sep 30, 2026");
    expect(formatCalendarDate("2026-05-03")).toBe("May 3, 2026");
    // 11:30 PM UTC on Sep 30 is already Oct 1 in Manila.
    expect(formatCalendarDate("2026-09-30T23:30:00Z")).toBe("Oct 1, 2026");
    expect(formatCalendarDate(new Date("2026-01-01T00:00:00+08:00"))).toBe(
      "Jan 1, 2026",
    );
    expect(formatCalendarDate("not a date")).toBe("not a date");
  });

  it("formats months and stored weekly-review titles", () => {
    expect(formatCalendarMonth("2026-09")).toBe("Sep 2026");
    expect(formatWeekOfTitle("Week of 2026-09-14")).toBe(
      "Week of Sep 14, 2026",
    );
    expect(formatWeekOfTitle("Weekly review")).toBe("Weekly review");
  });
});

describe("isCalendarDate", () => {
  it.each(["2026-02-28", "2028-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each([
    "2026-02-29",
    "2026-02-31",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-1-01",
    "",
    undefined,
    ["2026-01-01"],
  ])("rejects %j", (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });
});
