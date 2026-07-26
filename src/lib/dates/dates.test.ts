import { describe, expect, it } from "vitest";
import { manilaDateLabel, mondayWeekStart } from "./dates";

describe("date helpers", () => {
  it("formats UTC timestamps as dates in Asia/Manila", () => {
    expect(manilaDateLabel("2026-07-25T17:00:00.000Z")).toBe(
      "Sunday, July 26, 2026",
    );
  });

  it("returns Monday as the start of a Philippine-local week", () => {
    expect(mondayWeekStart("2026-07-26T04:00:00.000Z")).toBe("2026-07-20");
  });
});
