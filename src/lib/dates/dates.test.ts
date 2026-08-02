import { describe, expect, it } from "vitest";
import {
  manilaDateLabel,
  mondayWeekStart,
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
