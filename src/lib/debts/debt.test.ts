import { describe, expect, it } from "vitest";
import { orderDebts, projectDebtPayoff, recalculateDebtBalance } from "./debt";

const debts = [
  { id: "a", balanceCentavos: 100_000, interestRatePercent: 5, priority: 2 },
  { id: "b", balanceCentavos: 50_000, interestRatePercent: 12, priority: 3 },
  { id: "c", balanceCentavos: 75_000, interestRatePercent: 8, priority: 1 },
];

describe("debt calculations", () => {
  it("recalculates balance from the original balance and current payments", () => {
    expect(recalculateDebtBalance(100_000, [20_000, 15_000])).toBe(65_000);
  });

  it("prevents payments from creating a negative debt balance", () => {
    expect(() => recalculateDebtBalance(10_000, [10_001])).toThrow(
      "Payment exceeds the remaining debt balance",
    );
  });

  it("orders snowball by smallest remaining balance", () => {
    expect(orderDebts(debts, "snowball").map((debt) => debt.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("orders avalanche by highest interest rate", () => {
    expect(orderDebts(debts, "avalanche").map((debt) => debt.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("orders user strategy by explicit priority", () => {
    expect(orderDebts(debts, "priority").map((debt) => debt.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("projects payoff using monthly compounding and a fixed payment", () => {
    expect(
      projectDebtPayoff({
        balanceCentavos: 100_000,
        annualInterestRatePercent: 12,
        monthlyPaymentCentavos: 10_000,
      }),
    ).toMatchObject({
      months: 11,
      totalInterestCentavos: 5_898,
      paidOff: true,
    });
  });

  it("reports when payment cannot cover monthly interest", () => {
    expect(
      projectDebtPayoff({
        balanceCentavos: 100_000,
        annualInterestRatePercent: 120,
        monthlyPaymentCentavos: 10_000,
      }).paidOff,
    ).toBe(false);
  });
});
