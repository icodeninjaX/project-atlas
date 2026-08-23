export type DebtStrategy = "snowball" | "avalanche" | "priority";

const debtStrategies = new Set<DebtStrategy>([
  "snowball",
  "avalanche",
  "priority",
]);

export function resolveDebtStrategy(
  requested: string | undefined,
  saved: string | undefined,
): DebtStrategy {
  if (debtStrategies.has(requested as DebtStrategy)) {
    return requested as DebtStrategy;
  }
  if (debtStrategies.has(saved as DebtStrategy)) {
    return saved as DebtStrategy;
  }
  return "avalanche";
}

export type DebtForStrategy = {
  id: string;
  balanceCentavos: number;
  interestRatePercent: number;
  priority: number;
};

export function recalculateDebtBalance(
  originalBalanceCentavos: number,
  paymentCentavos: number[],
): number {
  const remaining =
    originalBalanceCentavos -
    paymentCentavos.reduce((sum, payment) => sum + payment, 0);

  if (remaining < 0) {
    throw new Error("Payment exceeds the remaining debt balance");
  }

  return remaining;
}

export function orderDebts(
  debts: DebtForStrategy[],
  strategy: DebtStrategy,
): DebtForStrategy[] {
  return [...debts].sort((left, right) => {
    if (strategy === "snowball") {
      return left.balanceCentavos - right.balanceCentavos;
    }

    if (strategy === "avalanche") {
      return right.interestRatePercent - left.interestRatePercent;
    }

    return left.priority - right.priority;
  });
}

type PayoffInput = {
  balanceCentavos: number;
  annualInterestRatePercent: number;
  monthlyPaymentCentavos: number;
  maximumMonths?: number;
};

type PayoffProjection = {
  months: number;
  totalInterestCentavos: number;
  paidOff: boolean;
};

export function projectDebtPayoff({
  balanceCentavos,
  annualInterestRatePercent,
  monthlyPaymentCentavos,
  maximumMonths = 1_200,
}: PayoffInput): PayoffProjection {
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  let balance = balanceCentavos;
  let totalInterestCentavos = 0;
  let months = 0;

  if (balance <= 0) {
    return { months: 0, totalInterestCentavos: 0, paidOff: true };
  }

  if (monthlyPaymentCentavos <= 0) {
    return { months: 0, totalInterestCentavos: 0, paidOff: false };
  }

  while (balance > 0 && months < maximumMonths) {
    const interest = Math.round(balance * monthlyRate);

    if (monthlyPaymentCentavos <= interest) {
      return { months, totalInterestCentavos, paidOff: false };
    }

    totalInterestCentavos += interest;
    balance = Math.max(0, balance + interest - monthlyPaymentCentavos);
    months += 1;
  }

  return {
    months,
    totalInterestCentavos,
    paidOff: balance === 0,
  };
}
