import { describe, expect, it } from "vitest";
import {
  applyRunwayChoices,
  calculateRunway,
  calculateScenario,
  essentialBreakdown,
  formatRunwayMonths,
  monthlyCategoryAmounts,
  pickRunwayBudget,
  type RunwayBudget,
  type RunwaySource,
} from "./engine";

const source = (overrides: Partial<RunwaySource> = {}): RunwaySource => ({
  accounts: [
    {
      id: "cash",
      name: "Cash",
      accountType: "cash",
      currentBalanceCentavos: 900_000,
      includeInRunway: true,
      isArchived: false,
    },
  ],
  categories: [
    { id: "food", name: "Food", isEssential: true, isSystem: true },
    {
      id: "debt-payment",
      name: "Debt Payment",
      isEssential: true,
      isSystem: true,
    },
  ],
  monthlyTotals: [
    {
      monthStart: "2026-06-01",
      categoryId: "food",
      transactionType: "expense",
      amountCentavos: 100_000,
    },
    {
      monthStart: "2026-06-01",
      categoryId: "income",
      transactionType: "income",
      amountCentavos: 200_000,
    },
    {
      monthStart: "2026-07-01",
      categoryId: "food",
      transactionType: "expense",
      amountCentavos: 200_000,
    },
    {
      monthStart: "2026-07-01",
      categoryId: "income",
      transactionType: "income",
      amountCentavos: 300_000,
    },
    {
      monthStart: "2026-08-01",
      categoryId: "food",
      transactionType: "expense",
      amountCentavos: 300_000,
    },
    {
      monthStart: "2026-09-01",
      categoryId: "food",
      transactionType: "expense",
      amountCentavos: 999_999,
    },
  ],
  budget: null,
  debts: [
    {
      id: "debt",
      creditorName: "Card",
      currentBalanceCentavos: 100_000,
      interestRatePercent: 12,
      minimumPaymentCentavos: 10_000,
      status: "active",
    },
  ],
  profileMonthlyNetIncomeCentavos: 250_000,
  targetMonths: 3,
  ...overrides,
});

const september = new Date("2026-09-15T12:00:00+08:00");

describe("runway engine", () => {
  it("averages usable completed months and excludes current partial data", () => {
    const result = calculateRunway(source(), september);

    expect(result).toMatchObject({
      status: "ready",
      baselineSource: "historical",
      includedMonths: ["2026-08-01", "2026-07-01", "2026-06-01"],
      monthlyEssentialCentavos: 200_000,
      monthlyDebtMinimumsCentavos: 10_000,
      monthlyNeedCentavos: 210_000,
      monthlyIncomeCentavos: 166_667,
      targetReserveCentavos: 630_000,
      targetGapCentavos: -270_000,
    });
  });

  it("uses two usable completed months without treating missing data as zero", () => {
    const result = calculateRunway(
      source({ monthlyTotals: source().monthlyTotals.slice(0, 4) }),
      september,
    );

    expect(result.monthlyEssentialCentavos).toBe(150_000);
    expect(result.includedMonths).toEqual(["2026-07-01", "2026-06-01"]);
  });

  it("falls back to the latest essential budget when history is insufficient", () => {
    const result = calculateRunway(
      source({
        monthlyTotals: [],
        budget: {
          monthStart: "2026-09-01",
          expectedIncomeCentavos: 350_000,
          items: [
            { categoryId: "food", plannedCentavos: 180_000 },
            { categoryId: "other", plannedCentavos: 90_000 },
          ],
        },
      }),
      september,
    );

    expect(result).toMatchObject({
      status: "ready",
      baselineSource: "budget",
      monthlyEssentialCentavos: 180_000,
      monthlyIncomeCentavos: 350_000,
    });
  });

  it("reports unavailable data instead of fabricating a baseline", () => {
    expect(
      calculateRunway(source({ monthlyTotals: [], budget: null }), september)
        .status,
    ).toBe("insufficient_data");
  });

  it("excludes debt-payment categories and adds required minimums once", () => {
    const result = calculateRunway(
      source({
        monthlyTotals: source().monthlyTotals.map((total) =>
          total.transactionType === "expense"
            ? { ...total, categoryId: "debt-payment", amountCentavos: 500_000 }
            : total,
        ),
      }),
      september,
    );

    expect(result.monthlyEssentialCentavos).toBe(0);
    expect(result.monthlyDebtMinimumsCentavos).toBe(10_000);
    expect(result.status).toBe("ready");
  });

  it("clamps negative liquid balances to zero runway funds", () => {
    const result = calculateRunway(
      source({
        accounts: [
          {
            ...source().accounts[0]!,
            currentBalanceCentavos: -10_000,
          },
        ],
      }),
      september,
    );

    expect(result.netLiquidCentavos).toBe(-10_000);
    expect(result.availableLiquidCentavos).toBe(0);
    expect(result.runwayMonths).toBe(0);
  });

  it("requires saved account and category choices", () => {
    expect(
      calculateRunway(
        source({
          accounts: [{ ...source().accounts[0]!, includeInRunway: false }],
        }),
        september,
      ).status,
    ).toBe("missing_liquid_accounts");
    expect(
      calculateRunway(
        source({
          categories: [{ ...source().categories[0]!, isEssential: false }],
        }),
        september,
      ).status,
    ).toBe("missing_essential_categories");
  });

  it("compares a combined scenario without mutating the base analysis", () => {
    const analysis = calculateRunway(source(), september);
    const scenario = calculateScenario(analysis, {
      monthlyIncomeCentavos: 400_000,
      monthlyExpenseChangeCentavos: -50_000,
      oneTimePurchaseCentavos: 100_000,
      extraDebtPayment: { debtId: "debt", amountCentavos: 10_000 },
      targetMonths: 6,
    });

    expect(scenario).toMatchObject({
      availableLiquidCentavos: 800_000,
      monthlyEssentialCentavos: 150_000,
      monthlyNeedCentavos: 170_000,
      monthlyIncomeCentavos: 400_000,
      monthlyFreeCashFlowCentavos: 230_000,
      targetReserveCentavos: 1_020_000,
    });
    expect(scenario.debtProjection?.scenarioMonths).toBeLessThan(
      scenario.debtProjection?.baseMonths ?? Infinity,
    );
    expect(analysis.availableLiquidCentavos).toBe(900_000);
  });

  it("handles purchases larger than liquid funds and non-amortizing debt", () => {
    const analysis = calculateRunway(
      source({
        debts: [
          {
            ...source().debts[0]!,
            interestRatePercent: 120,
            minimumPaymentCentavos: 10_000,
          },
        ],
      }),
      september,
    );
    const scenario = calculateScenario(analysis, {
      monthlyIncomeCentavos: null,
      monthlyExpenseChangeCentavos: -999_999,
      oneTimePurchaseCentavos: 9_000_000,
      extraDebtPayment: { debtId: "debt", amountCentavos: 0 },
      targetMonths: 3,
    });

    expect(scenario.availableLiquidCentavos).toBe(0);
    expect(scenario.monthlyEssentialCentavos).toBe(0);
    expect(scenario.debtProjection?.paidOff).toBe(false);
  });

  it("formats runway numbers without false precision", () => {
    expect(formatRunwayMonths(null)).toBe("Unavailable");
    expect(formatRunwayMonths(0.04)).toBe("Less than 0.1 months");
    expect(formatRunwayMonths(2.345)).toBe("2.3 months");
    expect(formatRunwayMonths(100)).toBe("99+ months");
  });
});

describe("runway choices and breakdown", () => {
  const budgets: RunwayBudget[] = [
    {
      monthStart: "2026-09-01",
      expectedIncomeCentavos: 300_000,
      items: [{ categoryId: "fun", plannedCentavos: 50_000 }],
    },
    {
      monthStart: "2026-08-01",
      expectedIncomeCentavos: 280_000,
      items: [
        { categoryId: "food", plannedCentavos: 120_000 },
        { categoryId: "fun", plannedCentavos: 40_000 },
      ],
    },
  ];
  const categories = [
    ...source().categories,
    { id: "fun", name: "Fun", isEssential: false, isSystem: false },
  ];

  it("falls back to the newest budget that plans a selected essential", () => {
    expect(pickRunwayBudget(budgets, categories)?.monthStart).toBe(
      "2026-08-01",
    );
    expect(
      pickRunwayBudget(
        budgets,
        categories.map((category) => ({ ...category, isEssential: true })),
      )?.monthStart,
    ).toBe("2026-09-01");
    expect(
      pickRunwayBudget(
        budgets,
        categories.map((category) => ({ ...category, isEssential: false })),
      ),
    ).toBeNull();
  });

  it("previews new choices the way the server would load them", () => {
    const base = source({ monthlyTotals: [], categories });
    const preview = applyRunwayChoices(base, budgets, {
      accountIds: [],
      categoryIds: ["fun"],
      targetMonths: 6,
    });

    expect(preview.accounts[0]?.includeInRunway).toBe(false);
    expect(
      preview.categories
        .filter((category) => category.isEssential)
        .map(({ id }) => id),
    ).toEqual(["fun"]);
    expect(preview.budget?.monthStart).toBe("2026-09-01");
    expect(preview.targetMonths).toBe(6);
    expect(calculateRunway(preview, september).status).toBe(
      "missing_liquid_accounts",
    );

    const withAccount = calculateRunway(
      applyRunwayChoices(base, budgets, {
        accountIds: ["cash"],
        categoryIds: ["fun"],
        targetMonths: 6,
      }),
      september,
    );
    expect(withAccount).toMatchObject({
      status: "ready",
      baselineSource: "budget",
      monthlyEssentialCentavos: 50_000,
      targetMonths: 6,
    });
    expect(base.accounts[0]?.includeInRunway).toBe(true);
  });

  it("splits essential spending by category so the parts add up exactly", () => {
    const totals = (
      month: string,
      amounts: Record<string, number>,
    ): RunwaySource["monthlyTotals"] =>
      Object.entries(amounts).map(([categoryId, amountCentavos]) => ({
        monthStart: month,
        categoryId,
        transactionType: "expense" as const,
        amountCentavos,
      }));
    const three = source({
      categories: [
        { id: "a", name: "Rent", isEssential: true, isSystem: false },
        { id: "b", name: "Food", isEssential: true, isSystem: false },
        { id: "c", name: "Water", isEssential: true, isSystem: false },
        { id: "d", name: "Health", isEssential: true, isSystem: false },
        { id: "e", name: "Fun", isEssential: false, isSystem: false },
      ],
      monthlyTotals: [
        // Rent averages 100, Food 100.67, and Water 100.33: the centavo
        // lost to rounding goes to Food, which lost the most.
        ...totals("2026-06-01", { a: 100, b: 100, c: 100, e: 900 }),
        ...totals("2026-07-01", { a: 100, b: 101, c: 100 }),
        ...totals("2026-08-01", { a: 100, b: 101, c: 101 }),
      ],
    });
    const analysis = calculateRunway(three, september);
    const parts = essentialBreakdown(three, analysis);

    expect(analysis.monthlyEssentialCentavos).toBe(301);
    expect(parts.map((part) => part.category.name)).toEqual([
      "Food",
      "Rent",
      "Water",
      "Health",
    ]);
    expect(parts.map((part) => part.monthlyCentavos)).toEqual([
      101, 100, 100, 0,
    ]);
    expect(parts.reduce((sum, part) => sum + part.monthlyCentavos, 0)).toBe(
      analysis.monthlyEssentialCentavos,
    );
    // Every category, essential or not, for the assumption hints.
    expect(monthlyCategoryAmounts(three, analysis).get("e")).toBe(300);
  });

  it("splits a budget baseline by its planned items", () => {
    const fromBudget = source({
      monthlyTotals: [],
      categories,
      budget: pickRunwayBudget(budgets, categories),
    });
    const analysis = calculateRunway(fromBudget, september);

    expect(essentialBreakdown(fromBudget, analysis)).toEqual([
      { category: categories[0], monthlyCentavos: 120_000 },
    ]);
    expect(monthlyCategoryAmounts(fromBudget, analysis).get("fun")).toBe(
      40_000,
    );
  });

  it("has nothing to split without a baseline", () => {
    const empty = source({ monthlyTotals: [], budget: null });
    const analysis = calculateRunway(empty, september);

    expect(monthlyCategoryAmounts(empty, analysis).size).toBe(0);
    expect(essentialBreakdown(empty, analysis)).toEqual([
      { category: empty.categories[0], monthlyCentavos: 0 },
    ]);
  });
});
