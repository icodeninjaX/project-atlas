import { describe, expect, it } from "vitest";
import {
  budgetUsage,
  cashFlow,
  manilaDayLabel,
  manilaDayPart,
  manilaMonthName,
  manilaWeekdayIndex,
  paydayLabel,
} from "./today";

describe("Manila day helpers", () => {
  it("greets by the hour in Manila, not the server", () => {
    expect(manilaDayPart(new Date("2026-10-01T04:59:00+08:00"))).toBe(
      "evening",
    );
    expect(manilaDayPart(new Date("2026-10-01T05:00:00+08:00"))).toBe(
      "morning",
    );
    expect(manilaDayPart(new Date("2026-10-01T11:59:00+08:00"))).toBe(
      "morning",
    );
    expect(manilaDayPart(new Date("2026-10-01T12:00:00+08:00"))).toBe(
      "afternoon",
    );
    expect(manilaDayPart(new Date("2026-10-01T18:00:00+08:00"))).toBe(
      "evening",
    );
    // 23:30 UTC on Sep 30 is 7:30 AM on Oct 1 in Manila.
    expect(manilaDayPart(new Date("2026-09-30T23:30:00Z"))).toBe("morning");
  });

  it("labels the Manila date and month", () => {
    const now = new Date("2026-09-30T23:30:00Z");
    expect(manilaDayLabel(now)).toBe("Thursday, October 1");
    expect(manilaMonthName(now)).toBe("October");
  });

  it("counts the review week from Monday", () => {
    expect(manilaWeekdayIndex(new Date("2026-09-28T09:00:00+08:00"))).toBe(0);
    expect(manilaWeekdayIndex(new Date("2026-10-01T09:00:00+08:00"))).toBe(3);
    expect(manilaWeekdayIndex(new Date("2026-10-04T23:59:00+08:00"))).toBe(6);
  });
});

describe("budgetUsage", () => {
  it("is null without a budget", () => {
    expect(budgetUsage(null, 10_000)).toBeNull();
  });

  it("rebuilds the plan from what is left plus what was spent", () => {
    expect(budgetUsage(25_000, 75_000)).toEqual({
      plannedCentavos: 100_000,
      leftCentavos: 25_000,
      ratio: 0.75,
      over: false,
    });
  });

  it("marks spending past the plan as over", () => {
    expect(budgetUsage(-20_000, 120_000)).toMatchObject({
      plannedCentavos: 100_000,
      ratio: 1.2,
      over: true,
    });
  });

  it("treats a ₱0 plan as full once anything is spent", () => {
    expect(budgetUsage(0, 0)).toMatchObject({ ratio: 0, over: false });
    expect(budgetUsage(-5_000, 5_000)).toMatchObject({
      plannedCentavos: 0,
      ratio: 1,
      over: true,
    });
  });
});

describe("cashFlow", () => {
  it("scales money in and out against the larger of the two", () => {
    expect(cashFlow(200_000, 50_000)).toEqual({
      netCentavos: 150_000,
      incomeShare: 1,
      expenseShare: 0.25,
      empty: false,
    });
    expect(cashFlow(0, 50_000)).toMatchObject({
      netCentavos: -50_000,
      incomeShare: 0,
      expenseShare: 1,
    });
  });

  it("is empty when nothing moved", () => {
    expect(cashFlow(0, 0)).toEqual({
      netCentavos: 0,
      incomeShare: 0,
      expenseShare: 0,
      empty: true,
    });
  });
});

describe("paydayLabel", () => {
  it("counts down to payday", () => {
    expect(paydayLabel(null)).toBeNull();
    expect(paydayLabel(0)).toBe("Payday today");
    expect(paydayLabel(1)).toBe("Payday tomorrow");
    expect(paydayLabel(14)).toBe("Payday in 14 days");
  });
});
