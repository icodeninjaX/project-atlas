import { projectDebtPayoff } from "@/lib/debts/debt";

export type RunwayAccount = {
  id: string;
  name: string;
  accountType: string;
  currentBalanceCentavos: number;
  includeInRunway: boolean;
  isArchived: boolean;
};

export type RunwayCategory = {
  id: string;
  name: string;
  isEssential: boolean;
  isSystem: boolean;
};

export type RunwayMonthlyTotal = {
  monthStart: string;
  categoryId: string;
  transactionType: "income" | "expense";
  amountCentavos: number;
};

export type RunwayDebt = {
  id: string;
  creditorName: string;
  currentBalanceCentavos: number;
  interestRatePercent: number;
  minimumPaymentCentavos: number;
  status: string;
};

export type RunwayBudget = {
  monthStart: string;
  expectedIncomeCentavos: number;
  items: Array<{ categoryId: string; plannedCentavos: number }>;
};

export type RunwaySource = {
  accounts: RunwayAccount[];
  categories: RunwayCategory[];
  monthlyTotals: RunwayMonthlyTotal[];
  budget: RunwayBudget | null;
  debts: RunwayDebt[];
  profileMonthlyNetIncomeCentavos: number;
  targetMonths: number;
};

export type RunwayStatus =
  | "ready"
  | "missing_liquid_accounts"
  | "missing_essential_categories"
  | "insufficient_data"
  | "zero_monthly_need";

export type IncomeSource = "historical" | "budget" | "profile" | "none";
export type BaselineSource = "historical" | "budget" | "none";

export type RunwayAnalysis = {
  status: RunwayStatus;
  baselineSource: BaselineSource;
  incomeSource: IncomeSource;
  includedMonths: string[];
  selectedAccounts: RunwayAccount[];
  selectedCategories: RunwayCategory[];
  debts: RunwayDebt[];
  netLiquidCentavos: number;
  availableLiquidCentavos: number;
  monthlyEssentialCentavos: number;
  monthlyDebtMinimumsCentavos: number;
  monthlyNeedCentavos: number;
  monthlyIncomeCentavos: number;
  monthlyFreeCashFlowCentavos: number;
  runwayMonths: number | null;
  targetMonths: number;
  targetReserveCentavos: number;
  targetGapCentavos: number;
};

export type ScenarioInput = {
  monthlyIncomeCentavos: number | null;
  monthlyExpenseChangeCentavos: number;
  oneTimePurchaseCentavos: number;
  extraDebtPayment: { debtId: string; amountCentavos: number } | null;
  targetMonths: number;
};

export type ScenarioResult = {
  netLiquidCentavos: number;
  availableLiquidCentavos: number;
  monthlyEssentialCentavos: number;
  monthlyNeedCentavos: number;
  monthlyIncomeCentavos: number;
  monthlyFreeCashFlowCentavos: number;
  runwayMonths: number | null;
  targetMonths: number;
  targetReserveCentavos: number;
  targetGapCentavos: number;
  debtProjection: null | {
    debtId: string;
    creditorName: string;
    baseMonths: number;
    scenarioMonths: number;
    baseInterestCentavos: number;
    scenarioInterestCentavos: number;
    paidOff: boolean;
  };
};

function monthStart(date: Date): string {
  return (
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    }).format(date) + "-01"
  );
}

function priorMonthStarts(now: Date): string[] {
  const parts = monthStart(now).slice(0, 7).split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  if (year === undefined || month === undefined) return [];
  return [1, 2, 3].map((offset) => {
    const value = new Date(Date.UTC(year, month - 1 - offset, 1));
    return value.toISOString().slice(0, 10);
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isDebtPayment(category: RunwayCategory): boolean {
  return category.name.trim().toLowerCase() === "debt payment";
}

function sourceIncome(
  incomeCentavos: number,
  preferred: IncomeSource,
  profileIncomeCentavos: number,
): { amount: number; source: IncomeSource } {
  if (incomeCentavos > 0) return { amount: incomeCentavos, source: preferred };
  if (profileIncomeCentavos > 0) {
    return { amount: profileIncomeCentavos, source: "profile" };
  }
  return { amount: 0, source: "none" };
}

function boundedTargetMonths(value: number): number {
  return Number.isInteger(value) && value >= 1 && value <= 24 ? value : 3;
}

function safeAverage(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0;
}

export function formatRunwayMonths(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (value < 0.1) return "Less than 0.1 months";
  if (value >= 99) return "99+ months";
  return `${value.toFixed(1)} months`;
}

export function calculateRunway(
  source: RunwaySource,
  now = new Date(),
): RunwayAnalysis {
  const selectedAccounts = source.accounts.filter(
    (account) => account.includeInRunway && !account.isArchived,
  );
  const selectedCategories = source.categories.filter(
    (category) => category.isEssential && !isDebtPayment(category),
  );
  const debts = source.debts.filter((debt) => debt.status === "active");
  const netLiquidCentavos = sum(
    selectedAccounts.map((account) => account.currentBalanceCentavos),
  );
  const availableLiquidCentavos = Math.max(0, netLiquidCentavos);
  const monthlyDebtMinimumsCentavos = sum(
    debts.map((debt) => debt.minimumPaymentCentavos),
  );
  const targetMonths = boundedTargetMonths(source.targetMonths);
  const empty = (status: RunwayStatus): RunwayAnalysis => ({
    status,
    baselineSource: "none",
    incomeSource: "none",
    includedMonths: [],
    selectedAccounts,
    selectedCategories,
    debts,
    netLiquidCentavos,
    availableLiquidCentavos,
    monthlyEssentialCentavos: 0,
    monthlyDebtMinimumsCentavos,
    monthlyNeedCentavos: 0,
    monthlyIncomeCentavos: 0,
    monthlyFreeCashFlowCentavos: 0,
    runwayMonths: null,
    targetMonths,
    targetReserveCentavos: 0,
    targetGapCentavos: 0,
  });

  if (selectedAccounts.length === 0) return empty("missing_liquid_accounts");
  if (selectedCategories.length === 0)
    return empty("missing_essential_categories");

  const selectedCategoryIds = new Set(selectedCategories.map(({ id }) => id));
  const completedMonths = priorMonthStarts(now);
  const usableMonths = completedMonths.filter((month) =>
    source.monthlyTotals.some(
      (total) => total.monthStart === month && total.amountCentavos > 0,
    ),
  );
  let baselineSource: BaselineSource = "none";
  let includedMonths: string[] = [];
  let monthlyEssentialCentavos = 0;
  let baselineIncomeCentavos = 0;

  if (usableMonths.length >= 2) {
    baselineSource = "historical";
    includedMonths = usableMonths;
    monthlyEssentialCentavos = safeAverage(
      sum(
        source.monthlyTotals
          .filter(
            (total) =>
              usableMonths.includes(total.monthStart) &&
              total.transactionType === "expense" &&
              selectedCategoryIds.has(total.categoryId),
          )
          .map((total) => total.amountCentavos),
      ),
      usableMonths.length,
    );
    baselineIncomeCentavos = safeAverage(
      sum(
        source.monthlyTotals
          .filter(
            (total) =>
              usableMonths.includes(total.monthStart) &&
              total.transactionType === "income",
          )
          .map((total) => total.amountCentavos),
      ),
      usableMonths.length,
    );
  } else if (source.budget) {
    const budgetEssentialCentavos = sum(
      source.budget.items
        .filter((item) => selectedCategoryIds.has(item.categoryId))
        .map((item) => item.plannedCentavos),
    );
    if (budgetEssentialCentavos > 0) {
      baselineSource = "budget";
      includedMonths = [source.budget.monthStart];
      monthlyEssentialCentavos = budgetEssentialCentavos;
      baselineIncomeCentavos = source.budget.expectedIncomeCentavos;
    }
  }

  if (baselineSource === "none") return empty("insufficient_data");

  const income = sourceIncome(
    baselineIncomeCentavos,
    baselineSource === "historical" ? "historical" : "budget",
    source.profileMonthlyNetIncomeCentavos,
  );
  const monthlyNeedCentavos =
    monthlyEssentialCentavos + monthlyDebtMinimumsCentavos;
  if (monthlyNeedCentavos <= 0) {
    return {
      ...empty("zero_monthly_need"),
      baselineSource,
      incomeSource: income.source,
      includedMonths,
      monthlyEssentialCentavos,
      monthlyIncomeCentavos: income.amount,
    };
  }

  const targetReserveCentavos = monthlyNeedCentavos * targetMonths;
  return {
    status: "ready",
    baselineSource,
    incomeSource: income.source,
    includedMonths,
    selectedAccounts,
    selectedCategories,
    debts,
    netLiquidCentavos,
    availableLiquidCentavos,
    monthlyEssentialCentavos,
    monthlyDebtMinimumsCentavos,
    monthlyNeedCentavos,
    monthlyIncomeCentavos: income.amount,
    monthlyFreeCashFlowCentavos: income.amount - monthlyNeedCentavos,
    runwayMonths: availableLiquidCentavos / monthlyNeedCentavos,
    targetMonths,
    targetReserveCentavos,
    targetGapCentavos: targetReserveCentavos - availableLiquidCentavos,
  };
}

export function calculateScenario(
  analysis: RunwayAnalysis,
  input: ScenarioInput,
): ScenarioResult {
  const extraDebtPayment = input.extraDebtPayment?.amountCentavos ?? 0;
  const monthlyEssentialCentavos = Math.max(
    0,
    analysis.monthlyEssentialCentavos + input.monthlyExpenseChangeCentavos,
  );
  const netLiquidCentavos =
    analysis.netLiquidCentavos - Math.max(0, input.oneTimePurchaseCentavos);
  const availableLiquidCentavos = Math.max(0, netLiquidCentavos);
  const monthlyNeedCentavos =
    monthlyEssentialCentavos +
    analysis.monthlyDebtMinimumsCentavos +
    Math.max(0, extraDebtPayment);
  const monthlyIncomeCentavos =
    input.monthlyIncomeCentavos === null
      ? analysis.monthlyIncomeCentavos
      : Math.max(0, input.monthlyIncomeCentavos);
  const targetMonths = boundedTargetMonths(input.targetMonths);
  const targetReserveCentavos = monthlyNeedCentavos * targetMonths;
  const selectedDebt = input.extraDebtPayment
    ? analysis.debts.find((debt) => debt.id === input.extraDebtPayment?.debtId)
    : undefined;
  const debtProjection = selectedDebt
    ? (() => {
        const base = projectDebtPayoff({
          balanceCentavos: selectedDebt.currentBalanceCentavos,
          annualInterestRatePercent: selectedDebt.interestRatePercent,
          monthlyPaymentCentavos: selectedDebt.minimumPaymentCentavos,
        });
        const scenario = projectDebtPayoff({
          balanceCentavos: selectedDebt.currentBalanceCentavos,
          annualInterestRatePercent: selectedDebt.interestRatePercent,
          monthlyPaymentCentavos:
            selectedDebt.minimumPaymentCentavos + Math.max(0, extraDebtPayment),
        });
        return {
          debtId: selectedDebt.id,
          creditorName: selectedDebt.creditorName,
          baseMonths: base.months,
          scenarioMonths: scenario.months,
          baseInterestCentavos: base.totalInterestCentavos,
          scenarioInterestCentavos: scenario.totalInterestCentavos,
          paidOff: scenario.paidOff,
        };
      })()
    : null;

  return {
    netLiquidCentavos,
    availableLiquidCentavos,
    monthlyEssentialCentavos,
    monthlyNeedCentavos,
    monthlyIncomeCentavos,
    monthlyFreeCashFlowCentavos: monthlyIncomeCentavos - monthlyNeedCentavos,
    runwayMonths:
      monthlyNeedCentavos > 0
        ? availableLiquidCentavos / monthlyNeedCentavos
        : null,
    targetMonths,
    targetReserveCentavos,
    targetGapCentavos: targetReserveCentavos - availableLiquidCentavos,
    debtProjection,
  };
}
