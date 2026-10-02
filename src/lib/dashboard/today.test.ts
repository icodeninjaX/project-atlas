import { describe, expect, it } from "vitest";
import {
  budgetUsage,
  cashFlow,
  formatManilaTime,
  manilaDayLabel,
  manilaDayPart,
  manilaIsoDate,
  manilaMonthName,
  manilaWeekdayIndex,
  paydayLabel,
  scheduleRoute,
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

  it("labels the Manila date, month, and time", () => {
    const now = new Date("2026-09-30T23:30:00Z");
    expect(manilaDayLabel(now)).toBe("Thursday, October 1");
    expect(manilaMonthName(now)).toBe("October");
    expect(manilaIsoDate(now)).toBe("2026-10-01");
    expect(formatManilaTime(now)).toBe("7:30 AM");
    expect(formatManilaTime(new Date("2026-10-01T00:05:00+08:00"))).toBe(
      "12:05 AM",
    );
    expect(formatManilaTime(new Date("2026-10-01T13:45:00+08:00"))).toBe(
      "1:45 PM",
    );
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

describe("scheduleRoute", () => {
  const now = new Date("2026-10-14T09:12:00+08:00");
  const stop = (id: string, durationMinutes: number | null) => ({
    id,
    durationMinutes,
  });

  it("lays stops end to end from now against the day's capacity", () => {
    const schedule = scheduleRoute(
      [stop("a", 45), stop("b", 10), stop("c", 20)],
      now,
      180,
    );

    expect(schedule).not.toBeNull();
    expect(schedule!.totalMinutes).toBe(75);
    expect(schedule!.spanMinutes).toBe(180);
    expect(
      schedule!.stops.map(({ startsAt }) => formatManilaTime(startsAt)),
    ).toEqual(["9:12 AM", "9:57 AM", "10:07 AM"]);
    expect(formatManilaTime(schedule!.endsAt)).toBe("10:27 AM");
  });

  it("spans the route itself when it runs past capacity", () => {
    expect(
      scheduleRoute([stop("a", 120), stop("b", 90)], now, 180),
    ).toMatchObject({ totalMinutes: 210, spanMinutes: 210 });
  });

  it("gives no times when any stop lacks an estimate", () => {
    expect(
      scheduleRoute([stop("a", 45), stop("b", null)], now, 180),
    ).toBeNull();
    expect(scheduleRoute([], now, 180)).toBeNull();
  });
});
