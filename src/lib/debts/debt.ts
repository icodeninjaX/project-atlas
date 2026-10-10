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

/** A debt as stored, with its columns' own names. */
export type DebtRecord = {
  id: string;
  creditor_name: string;
  debt_type: string;
  original_balance_centavos: number;
  current_balance_centavos: number;
  interest_rate_percent: number;
  minimum_payment_centavos: number;
  due_day: number | null;
  next_due_date: string | null;
  status: string;
  priority: number;
  notes: string | null;
};

export const DEBT_COLUMNS =
  "id,creditor_name,debt_type,original_balance_centavos,current_balance_centavos,interest_rate_percent,minimum_payment_centavos,due_day,next_due_date,status,priority,notes";

/** Database numerics can arrive as strings; the app works in numbers. */
export function toDebtRecord(row: DebtRecord): DebtRecord {
  return {
    ...row,
    original_balance_centavos: Number(row.original_balance_centavos),
    current_balance_centavos: Number(row.current_balance_centavos),
    interest_rate_percent: Number(row.interest_rate_percent),
    minimum_payment_centavos: Number(row.minimum_payment_centavos),
    priority: Number(row.priority),
  };
}

export type RateUnit = "month" | "year";

/**
 * A rate as a yearly percent, which is how it is stored. Lenders here often
 * quote a monthly rate ("3% a month"); twelve of those make the year.
 */
export function annualRatePercent(rate: number, unit: RateUnit) {
  if (!Number.isFinite(rate)) return Number.NaN;
  return unit === "month" ? Math.round(rate * 12 * 10_000) / 10_000 : rate;
}

/** "3% a month · 36% a year", or "No interest". */
export function formatRate(annualPercent: number) {
  if (annualPercent <= 0) return "No interest";
  const month = Number((annualPercent / 12).toFixed(2));
  return `${month}% a month · ${Number(annualPercent.toFixed(2))}% a year`;
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
