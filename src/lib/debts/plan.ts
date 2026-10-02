import { addMonths } from "@/lib/runway/view";
import { calendarDaysBetween } from "@/lib/dates/dates";
import { orderDebts, type DebtRecord, type DebtStrategy } from "./debt";

/**
 * Payoff planning across every open debt: the same monthly budget, ordered
 * by a strategy, with each paid-off debt's payment rolled on to the next.
 * Amounts are integer centavos; months count payments from now (1 is the
 * next one).
 */

export type PlanDebt = {
  id: string;
  balanceCentavos: number;
  interestRatePercent: number;
  minimumPaymentCentavos: number;
  priority: number;
  /**
   * Active debts get their minimum every month. Paused or defaulted ones
   * get only money the plan frees up.
   */
  active: boolean;
};

export function toPlanDebt(debt: DebtRecord): PlanDebt {
  return {
    id: debt.id,
    balanceCentavos: debt.current_balance_centavos,
    interestRatePercent: debt.interest_rate_percent,
    minimumPaymentCentavos: debt.minimum_payment_centavos,
    priority: debt.priority,
    active: debt.status === "active",
  };
}

export type DebtPayoff = {
  id: string;
  /** The month its balance reaches zero; null if not within the horizon. */
  payoffMonth: number | null;
  /**
   * The month it becomes the plan's focus, the first open debt in its
   * order, where the extra and freed-up payments go; null if never.
   */
  focusMonth: number | null;
  interestCentavos: number;
};

export type PayoffPlan = {
  /**
   * `clear` when nothing is owed, `paid_off` when every debt reaches zero
   * within the horizon, `stalled` when the budget never gets there.
   */
  status: "clear" | "paid_off" | "stalled";
  /** Months until the last debt is paid; null when stalled. */
  months: number | null;
  /** What the plan pays in its first month: minimums plus the extra. */
  monthlyBudgetCentavos: number;
  totalInterestCentavos: number;
  /** Interest plus today's balances, when paid off. */
  totalPaidCentavos: number;
  /** Each debt in the order the plan focuses on them. */
  debts: DebtPayoff[];
  /** The total balance at the end of each month; [0] is today's. */
  balances: number[];
};

/** Fifty years: past this, a plan is treated as never finishing. */
export const PLAN_HORIZON_MONTHS = 600;

/** Balances past this are runaway growth; stop before figures overflow. */
const RUNAWAY_CENTAVOS = 1e13;

export function simulatePayoff(
  debts: readonly PlanDebt[],
  {
    strategy,
    extraCentavos = 0,
    rollover = true,
    horizonMonths = PLAN_HORIZON_MONTHS,
  }: {
    strategy: DebtStrategy;
    /** Paid on top of the minimums every month, to the focus debt. */
    extraCentavos?: number;
    /**
     * Whether a paid-off debt's minimum moves on to the next debt. Without
     * it, each debt is paid only its own minimum (and the extra).
     */
    rollover?: boolean;
    horizonMonths?: number;
  },
): PayoffPlan {
  const byId = new Map(debts.map((debt) => [debt.id, debt]));
  const order = orderDebts(
    debts.map((debt) => ({
      id: debt.id,
      balanceCentavos: debt.balanceCentavos,
      interestRatePercent: debt.interestRatePercent,
      priority: debt.priority,
    })),
    strategy,
  ).map((debt) => byId.get(debt.id)!);

  const state = order.map((debt) => ({
    debt,
    balance: Math.max(debt.balanceCentavos, 0),
    rate: debt.interestRatePercent / 100 / 12,
    minimum: debt.active ? Math.max(debt.minimumPaymentCentavos, 0) : 0,
    payoffMonth: debt.balanceCentavos <= 0 ? 0 : (null as number | null),
    focusMonth: null as number | null,
    interest: 0,
  }));
  const extra = Math.max(extraCentavos, 0);
  const minimums = state.reduce(
    (sum, item) => sum + (item.balance > 0 ? item.minimum : 0),
    0,
  );
  const total = () => state.reduce((sum, item) => sum + item.balance, 0);
  const balances = [total()];
  let totalInterest = 0;

  const result = (status: PayoffPlan["status"], months: number | null) => ({
    status,
    months,
    monthlyBudgetCentavos: minimums + extra,
    totalInterestCentavos: totalInterest,
    totalPaidCentavos: balances[0]! + totalInterest,
    debts: state.map((item) => ({
      id: item.debt.id,
      payoffMonth: item.payoffMonth,
      focusMonth: item.focusMonth,
      interestCentavos: item.interest,
    })),
    balances,
  });

  if (balances[0] === 0) return result("clear", 0);
  if (minimums + extra === 0) return result("stalled", null);

  for (let month = 1; month <= horizonMonths; month += 1) {
    const open = state.filter((item) => item.balance > 0);
    open[0]!.focusMonth ??= month;
    // The budget holds steady as debts clear, unless nothing rolls over.
    let available = rollover
      ? minimums + extra
      : open.reduce((sum, item) => sum + item.minimum, 0) + extra;

    for (const item of open) {
      const interest = Math.round(item.balance * item.rate);
      item.balance += interest;
      item.interest += interest;
      totalInterest += interest;
    }
    for (const item of open) {
      const payment = Math.min(item.minimum, item.balance, available);
      item.balance -= payment;
      available -= payment;
    }
    // What is left goes down the order, starting with the focus.
    for (const item of open) {
      if (available <= 0) break;
      const payment = Math.min(available, item.balance);
      item.balance -= payment;
      available -= payment;
    }
    for (const item of open) {
      if (item.balance === 0) item.payoffMonth = month;
    }

    const remaining = total();
    balances.push(remaining);
    if (remaining === 0) return result("paid_off", month);
    if (remaining > RUNAWAY_CENTAVOS) break;
  }
  return result("stalled", null);
}

/** What the balances cost this month at today's rates. */
export function monthlyInterestCentavos(
  debts: readonly Pick<PlanDebt, "balanceCentavos" | "interestRatePercent">[],
) {
  return debts.reduce(
    (sum, debt) =>
      sum +
      Math.round(
        Math.max(debt.balanceCentavos, 0) * (debt.interestRatePercent / 1200),
      ),
    0,
  );
}

/** The share of what was borrowed that has been repaid, from 0 to 1. */
export function repaidShare(originalCentavos: number, currentCentavos: number) {
  if (originalCentavos <= 0) return 0;
  return Math.min(
    Math.max((originalCentavos - currentCentavos) / originalCentavos, 0),
    1,
  );
}

const monthYearShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});
const monthYearLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const monthDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** The calendar month `months` payments from today: "Jun 2027". */
export function payoffMonthLabel(
  todayIso: string,
  months: number,
  style: "short" | "long" = "short",
) {
  const date = new Date(`${addMonths(todayIso, months)}T00:00:00Z`);
  return (style === "long" ? monthYearLong : monthYearShort).format(date);
}

/** "8 months", "1 year", "2 years, 5 months". */
export function formatPayoffDuration(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const part = (count: number, unit: string) =>
    `${count} ${unit}${count === 1 ? "" : "s"}`;
  if (years === 0) return part(rest, "month");
  if (rest === 0) return part(years, "year");
  return `${part(years, "year")}, ${part(rest, "month")}`;
}

export type DueTone = "destructive" | "caution" | "neutral";

/**
 * When the next payment is due, and how urgent it is: `label` names the
 * date where it helps ("Due Oct 7 · in 5 days"), `relative` only counts
 * the days ("In 5 days").
 */
export function dueStatus(
  nextDueDate: string | null,
  todayIso: string,
): { days: number; tone: DueTone; label: string; relative: string } | null {
  if (!nextDueDate) return null;
  const days = calendarDaysBetween(todayIso, nextDueDate);
  if (Number.isNaN(days)) return null;
  if (days < 0) {
    const late = -days;
    const label = `Overdue by ${late} ${late === 1 ? "day" : "days"}`;
    return { days, tone: "destructive", label, relative: label };
  }
  if (days === 0) {
    return { days, tone: "caution", label: "Due today", relative: "Today" };
  }
  if (days === 1) {
    return {
      days,
      tone: "caution",
      label: "Due tomorrow",
      relative: "Tomorrow",
    };
  }
  const date = monthDay.format(new Date(`${nextDueDate}T00:00:00Z`));
  const relative = `In ${days} days`;
  if (days <= 7) {
    return {
      days,
      tone: "caution",
      label: `Due ${date} · in ${days} days`,
      relative,
    };
  }
  return { days, tone: "neutral", label: `Due ${date}`, relative };
}

export const STRATEGY_DETAILS: Record<
  DebtStrategy,
  { label: string; rule: string }
> = {
  avalanche: { label: "Avalanche", rule: "Highest interest first" },
  snowball: { label: "Snowball", rule: "Smallest balance first" },
  priority: { label: "My priority", rule: "Your own order" },
};

export const STRATEGIES = ["avalanche", "snowball", "priority"] as const;
