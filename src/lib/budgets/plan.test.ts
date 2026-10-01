import { describe, expect, it } from "vitest";
import {
  buildBudgetPlan,
  dailyAllowance,
  monthPace,
  roundUpToHundredPesos,
  shiftMonth,
} from "./plan";

const categories = [
  { id: "food", name: "Food" },
  { id: "rent", name: "Housing" },
  { id: "bills", name: "Utilities" },
  { id: "fun", name: "Entertainment" },
  { id: "debt", name: "Debt Payment" },
];

describe("buildBudgetPlan", () => {
  const plan = buildBudgetPlan({
    categories,
    planned: { food: 800_000, rent: 1_500_000, bills: 450_000, fun: 150_000 },
    spent: {
      food: 685_000,
      rent: 1_500_000,
      bills: 488_000,
      fun: 62_000,
      debt: 250_000,
      gone: 35_000,
    },
  });

  it("puts overspent categories first, then nearly spent ones", () => {
    expect(
      plan.envelopes.map((envelope) => [
        envelope.category.name,
        envelope.status,
      ]),
    ).toEqual([
      ["Utilities", "over"],
      ["Housing", "near"],
      ["Food", "near"],
      ["Entertainment", "under"],
    ]);
    expect(plan.envelopes[0]).toMatchObject({
      leftCentavos: -38_000,
      spentCentavos: 488_000,
    });
    expect(plan.overCount).toBe(1);
  });

  it("lists spending without a plan, including unlisted categories", () => {
    expect(
      plan.unplanned.map((item) => [item.category.name, item.spentCentavos]),
    ).toEqual([
      ["Debt Payment", 250_000],
      ["Other categories", 35_000],
    ]);
  });

  it("counts every expense against the plan", () => {
    expect(plan.plannedCentavos).toBe(2_900_000);
    expect(plan.spentCentavos).toBe(3_020_000);
    expect(plan.leftCentavos).toBe(-120_000);
  });

  it("treats spending against a zero plan as over", () => {
    const zero = buildBudgetPlan({
      categories,
      planned: { fun: 0, food: 0 },
      spent: { fun: 10_000 },
    });
    expect(zero.envelopes.map((envelope) => envelope.status)).toEqual([
      "over",
      "under",
    ]);
  });
});

describe("monthPace", () => {
  it("counts today as both gone and still to come", () => {
    expect(monthPace("2026-10", "2026-10-18")).toEqual({
      phase: "current",
      daysInMonth: 31,
      daysElapsed: 18,
      daysLeft: 14,
      elapsedRatio: 18 / 31,
    });
  });

  it("knows leap years and finished or upcoming months", () => {
    expect(monthPace("2028-02", "2028-02-01").daysInMonth).toBe(29);
    expect(monthPace("2026-09", "2026-10-01")).toMatchObject({
      phase: "past",
      daysLeft: 0,
      elapsedRatio: 1,
    });
    expect(monthPace("2026-11", "2026-10-31")).toMatchObject({
      phase: "future",
      daysElapsed: 0,
      daysLeft: 30,
    });
  });
});

describe("dailyAllowance", () => {
  it("spreads what is left over the days still to come", () => {
    expect(dailyAllowance(1_400_050, monthPace("2026-10", "2026-10-18"))).toBe(
      100_003,
    );
  });

  it("offers nothing once the plan is used up or the month is not on", () => {
    expect(dailyAllowance(-1, monthPace("2026-10", "2026-10-18"))).toBeNull();
    expect(
      dailyAllowance(10_000, monthPace("2026-09", "2026-10-18")),
    ).toBeNull();
  });
});

describe("month helpers", () => {
  it("shifts across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("rounds up to whole hundreds of pesos", () => {
    expect(roundUpToHundredPesos(824_000)).toBe(830_000);
    expect(roundUpToHundredPesos(1_500_000)).toBe(1_500_000);
    expect(roundUpToHundredPesos(1)).toBe(10_000);
  });
});
