import { FIXTURE_DATASETS, OWNER_A, type FixtureOwner } from "./fixtures";

/**
 * Synthetic runway data for owner A's rich dataset, so runway scenarios
 * (corpus Q10 and Q43) can be evaluated. It is a versioned supplement beside
 * the frozen fixture datasets, which stay unchanged: it adds only what the
 * runway engine reads and the datasets do not model (account balances,
 * essential-category flags, debt terms, profile income, a runway target and
 * the budget the datasets already describe). All values are invented.
 *
 * The frozen transactions record only August among the three months before
 * the fixture clock, so the engine uses its budget fallback: September's
 * planned essential spending and expected income.
 */

export const RUNWAY_FIXTURE_VERSION = "2026-09-28.1" as const;

export type RunwaySupplement = {
  accounts: Array<{
    id: string;
    name: string;
    accountType: "cash" | "bank" | "e_wallet" | "savings";
    balanceCentavos: number;
    includeInRunway: boolean;
  }>;
  /** Expense category IDs the owner marks essential. */
  essentialCategoryIds: string[];
  /** Terms for the datasets' existing debts, by debt ID. */
  debtTerms: Record<
    string,
    { interestRatePercent: number; minimumPaymentCentavos: number }
  >;
  monthlyNetIncomeCentavos: number;
  targetMonths: number;
  budget: {
    id: string;
    monthStart: string;
    expectedIncomeCentavos: number;
    /** Planned amounts by category; the datasets' own limits are added. */
    plannedCentavos: Record<string, number>;
  };
};

export const RUNWAY_SUPPLEMENTS: Partial<
  Record<FixtureOwner, RunwaySupplement>
> = {
  [OWNER_A]: {
    accounts: [
      {
        id: "acct-a-savings",
        name: "Synthetic Savings",
        accountType: "savings",
        balanceCentavos: 6_000_000,
        includeInRunway: true,
      },
      {
        id: "acct-a-wallet",
        name: "Synthetic Wallet",
        accountType: "e_wallet",
        balanceCentavos: 250_000,
        // Spending money, deliberately outside the reserve.
        includeInRunway: false,
      },
    ],
    essentialCategoryIds: [
      "cat-a-groceries",
      "cat-a-transport",
      "cat-a-utilities",
      "cat-a-health",
    ],
    debtTerms: {
      "debt-a-card": {
        interestRatePercent: 24,
        minimumPaymentCentavos: 200_000,
      },
    },
    monthlyNetIncomeCentavos: 5_000_000,
    targetMonths: 6,
    budget: {
      id: "mbud-a-2026-09",
      monthStart: "2026-09-01",
      expectedIncomeCentavos: 5_000_000,
      plannedCentavos: {
        "cat-a-groceries": 500_000,
        "cat-a-transport": 100_000,
        "cat-a-utilities": 300_000,
        "cat-a-health": 50_000,
      },
    },
  },
};

/** The budget's items: supplement plans plus the datasets' own limits. */
export function runwayBudgetItems(owner: FixtureOwner) {
  const supplement = RUNWAY_SUPPLEMENTS[owner];
  if (!supplement) return [];
  const limits = FIXTURE_DATASETS.rich[owner].budgets.filter(
    (item) => `${item.month}-01` === supplement.budget.monthStart,
  );
  return [
    ...Object.entries(supplement.budget.plannedCentavos).map(
      ([categoryId, plannedCentavos]) => ({ categoryId, plannedCentavos }),
    ),
    ...limits.map((item) => ({
      categoryId: item.categoryId,
      plannedCentavos: item.limitCentavos,
    })),
  ];
}
