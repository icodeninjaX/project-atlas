import { describe, expect, it } from "vitest";
import { dueDayFor, followingDueDate, settlesDueByDefault } from "./schedule";

describe("followingDueDate", () => {
  it("moves the due date a month on", () => {
    expect(followingDueDate("2026-10-15", 15)).toBe("2026-11-15");
    expect(followingDueDate("2026-12-05", 5)).toBe("2027-01-05");
  });

  it("lands on the last day of a short month, then returns to the due day", () => {
    expect(followingDueDate("2027-01-31", 31)).toBe("2027-02-28");
    expect(followingDueDate("2027-02-28", 31)).toBe("2027-03-31");
    expect(followingDueDate("2028-01-30", 30)).toBe("2028-02-29");
  });

  it("uses the date's own day when no due day is saved", () => {
    expect(followingDueDate("2026-10-20", null)).toBe("2026-11-20");
  });
});

describe("dueDayFor", () => {
  it("reads the day of the month from the date", () => {
    expect(dueDayFor("2026-10-15", null)).toBe(15);
    expect(dueDayFor("2026-10-15", 31)).toBe(15);
  });

  it("keeps a later saved day when the date is a short month's last day", () => {
    expect(dueDayFor("2027-02-28", 31)).toBe(31);
    expect(dueDayFor("2026-09-30", 31)).toBe(31);
    expect(dueDayFor("2026-09-30", null)).toBe(30);
  });
});

describe("settlesDueByDefault", () => {
  it("counts payments made late or within two weeks of the due date", () => {
    expect(settlesDueByDefault("2026-10-01", "2026-10-10")).toBe(true);
    expect(settlesDueByDefault("2026-10-10", "2026-10-10")).toBe(true);
    expect(settlesDueByDefault("2026-10-25", "2026-10-10")).toBe(true);
  });

  it("leaves payments well ahead of the due date as extra", () => {
    expect(settlesDueByDefault("2026-10-26", "2026-10-10")).toBe(false);
    expect(settlesDueByDefault(null, "2026-10-10")).toBe(false);
  });
});
