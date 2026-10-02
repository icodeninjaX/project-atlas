import { describe, expect, it } from "vitest";
import { projectDebtPayoff } from "./debt";
import {
  dueStatus,
  formatPayoffDuration,
  monthlyInterestCentavos,
  payoffMonthLabel,
  repaidShare,
  simulatePayoff,
  type PlanDebt,
} from "./plan";

const debt = (overrides: Partial<PlanDebt> & { id: string }): PlanDebt => ({
  balanceCentavos: 100_000,
  interestRatePercent: 0,
  minimumPaymentCentavos: 10_000,
  priority: 1,
  active: true,
  ...overrides,
});

describe("simulatePayoff", () => {
  it("matches the single-debt projection for one debt", () => {
    const plan = simulatePayoff([debt({ id: "a", interestRatePercent: 12 })], {
      strategy: "avalanche",
    });
    const single = projectDebtPayoff({
      balanceCentavos: 100_000,
      annualInterestRatePercent: 12,
      monthlyPaymentCentavos: 10_000,
    });

    expect(plan.status).toBe("paid_off");
    expect(plan.months).toBe(single.months);
    expect(plan.totalInterestCentavos).toBe(single.totalInterestCentavos);
    expect(plan.balances[0]).toBe(100_000);
    expect(plan.balances.at(-1)).toBe(0);
  });

  it("rolls a cleared debt's payment on to the next one", () => {
    const debts = [
      debt({ id: "small", balanceCentavos: 20_000 }),
      debt({ id: "large", balanceCentavos: 100_000 }),
    ];
    const plan = simulatePayoff(debts, { strategy: "snowball" });
    const alone = simulatePayoff(debts, {
      strategy: "snowball",
      rollover: false,
    });

    // ₱200 a month: small clears in month 2, then large gets all ₱200.
    expect(plan.debts.map((item) => item.id)).toEqual(["small", "large"]);
    expect(plan.debts[0]).toMatchObject({ payoffMonth: 2, focusMonth: 1 });
    expect(plan.debts[1]).toMatchObject({ payoffMonth: 6, focusMonth: 3 });
    expect(plan.months).toBe(6);
    expect(alone.months).toBe(10);
    expect(plan.monthlyBudgetCentavos).toBe(20_000);
  });

  it("sends the extra to the focus debt first", () => {
    const plan = simulatePayoff(
      [
        debt({ id: "cheap", interestRatePercent: 5 }),
        debt({ id: "costly", interestRatePercent: 30 }),
      ],
      { strategy: "avalanche", extraCentavos: 10_000 },
    );

    expect(plan.debts[0]).toMatchObject({ id: "costly", focusMonth: 1 });
    expect(plan.debts[0]!.payoffMonth).toBeLessThan(
      plan.debts[1]!.payoffMonth!,
    );
    expect(plan.monthlyBudgetCentavos).toBe(30_000);
  });

  it("pays less interest with avalanche than snowball", () => {
    const debts = [
      debt({ id: "a", balanceCentavos: 50_000, interestRatePercent: 6 }),
      debt({ id: "b", balanceCentavos: 300_000, interestRatePercent: 36 }),
    ];
    const avalanche = simulatePayoff(debts, {
      strategy: "avalanche",
      extraCentavos: 5_000,
    });
    const snowball = simulatePayoff(debts, {
      strategy: "snowball",
      extraCentavos: 5_000,
    });

    expect(avalanche.totalInterestCentavos).toBeLessThan(
      snowball.totalInterestCentavos,
    );
  });

  it("gives paused debts only the money the plan frees up", () => {
    const plan = simulatePayoff(
      [
        debt({ id: "active", balanceCentavos: 20_000, priority: 1 }),
        debt({
          id: "paused",
          balanceCentavos: 20_000,
          priority: 2,
          active: false,
        }),
      ],
      { strategy: "priority" },
    );

    expect(plan.monthlyBudgetCentavos).toBe(10_000);
    expect(plan.debts[1]).toMatchObject({ payoffMonth: 4, focusMonth: 3 });
  });

  it("stalls when payments never outpace interest", () => {
    const plan = simulatePayoff(
      [
        debt({
          id: "a",
          interestRatePercent: 240,
          minimumPaymentCentavos: 1_000,
        }),
      ],
      { strategy: "avalanche" },
    );

    expect(plan.status).toBe("stalled");
    expect(plan.months).toBeNull();
    expect(plan.debts[0]!.payoffMonth).toBeNull();
    expect(Number.isSafeInteger(plan.totalInterestCentavos)).toBe(true);
  });

  it("stalls when nothing is paid at all", () => {
    const plan = simulatePayoff(
      [debt({ id: "a", minimumPaymentCentavos: 0 })],
      { strategy: "avalanche" },
    );

    expect(plan).toMatchObject({ status: "stalled", months: null });
  });

  it("is clear when nothing is owed", () => {
    expect(
      simulatePayoff([debt({ id: "a", balanceCentavos: 0 })], {
        strategy: "snowball",
      }),
    ).toMatchObject({ status: "clear", months: 0, totalInterestCentavos: 0 });
    expect(simulatePayoff([], { strategy: "snowball" }).status).toBe("clear");
  });
});

describe("debt plan helpers", () => {
  it("adds up this month's interest at today's rates", () => {
    expect(
      monthlyInterestCentavos([
        { balanceCentavos: 120_000, interestRatePercent: 12 },
        { balanceCentavos: 50_000, interestRatePercent: 0 },
      ]),
    ).toBe(1_200);
  });

  it("measures the share repaid within 0 and 1", () => {
    expect(repaidShare(100_000, 25_000)).toBe(0.75);
    expect(repaidShare(100_000, 120_000)).toBe(0);
    expect(repaidShare(0, 0)).toBe(0);
  });

  it("names the payoff month and duration", () => {
    expect(payoffMonthLabel("2026-10-02", 8)).toBe("Jun 2027");
    expect(payoffMonthLabel("2026-10-02", 8, "long")).toBe("June 2027");
    expect(formatPayoffDuration(1)).toBe("1 month");
    expect(formatPayoffDuration(8)).toBe("8 months");
    expect(formatPayoffDuration(12)).toBe("1 year");
    expect(formatPayoffDuration(29)).toBe("2 years, 5 months");
  });

  it("describes when a payment is due", () => {
    const today = "2026-10-02";
    expect(dueStatus(null, today)).toBeNull();
    expect(dueStatus("2026-09-29", today)).toMatchObject({
      tone: "destructive",
      label: "Overdue by 3 days",
    });
    expect(dueStatus("2026-10-01", today)?.label).toBe("Overdue by 1 day");
    expect(dueStatus("2026-10-02", today)?.label).toBe("Due today");
    expect(dueStatus("2026-10-03", today)?.label).toBe("Due tomorrow");
    expect(dueStatus("2026-10-07", today)).toMatchObject({
      tone: "caution",
      label: "Due Oct 7 · in 5 days",
      relative: "In 5 days",
    });
    expect(dueStatus("2026-10-20", today)).toMatchObject({
      tone: "neutral",
      label: "Due Oct 20",
      relative: "In 18 days",
    });
  });
});
