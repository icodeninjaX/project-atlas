/**
 * Pure budget math for the monthly plan: how each planned category is
 * doing, what was spent without a plan, and where the month stands.
 * Amounts are integer centavos throughout.
 */

export type BudgetCategory = {
  id: string;
  name: string;
  icon?: string | null;
};

/** `near` once 85% of a category's plan is spent; `over` past the plan. */
export type EnvelopeStatus = "under" | "near" | "over";

export type BudgetEnvelope = {
  category: BudgetCategory;
  plannedCentavos: number;
  spentCentavos: number;
  /** Planned minus spent; negative when over. */
  leftCentavos: number;
  /** Spent as a share of planned. A zero plan with spending reads as 1+. */
  usedRatio: number;
  status: EnvelopeStatus;
};

export type UnplannedSpend = {
  category: BudgetCategory;
  spentCentavos: number;
};

export type BudgetPlan = {
  /** Planned categories: over first, then nearly spent, then the rest. */
  envelopes: BudgetEnvelope[];
  /** Categories with spending this month but no planned amount. */
  unplanned: UnplannedSpend[];
  plannedCentavos: number;
  /** Every expense this month, planned or not. */
  spentCentavos: number;
  /** Planned minus every expense: the honest room left in the plan. */
  leftCentavos: number;
  overCount: number;
};

export const NEAR_RATIO = 0.85;

/** Spending in categories that are no longer listed (deleted or renamed). */
const OTHER_CATEGORY: BudgetCategory = {
  id: "unlisted",
  name: "Other categories",
  icon: "circle-ellipsis",
};

const STATUS_RANK: Record<EnvelopeStatus, number> = {
  over: 0,
  near: 1,
  under: 2,
};

function envelopeStatus(planned: number, spent: number): EnvelopeStatus {
  if (spent > planned) return "over";
  if (planned > 0 && spent >= planned * NEAR_RATIO) return "near";
  return "under";
}

export function buildBudgetPlan({
  categories,
  planned,
  spent,
}: {
  categories: readonly BudgetCategory[];
  planned: Readonly<Record<string, number>>;
  spent: Readonly<Record<string, number>>;
}): BudgetPlan {
  const listed = new Set(categories.map((category) => category.id));
  const envelopes: BudgetEnvelope[] = [];
  const unplanned: UnplannedSpend[] = [];

  for (const category of categories) {
    const plannedCentavos = planned[category.id];
    const spentCentavos = spent[category.id] ?? 0;
    if (plannedCentavos === undefined) {
      if (spentCentavos > 0) unplanned.push({ category, spentCentavos });
      continue;
    }
    envelopes.push({
      category,
      plannedCentavos,
      spentCentavos,
      leftCentavos: plannedCentavos - spentCentavos,
      usedRatio:
        plannedCentavos > 0
          ? spentCentavos / plannedCentavos
          : spentCentavos > 0
            ? Number.POSITIVE_INFINITY
            : 0,
      status: envelopeStatus(plannedCentavos, spentCentavos),
    });
  }

  const unlistedSpend = Object.entries(spent)
    .filter(([id]) => !listed.has(id))
    .reduce((sum, [, value]) => sum + value, 0);
  if (unlistedSpend > 0) {
    unplanned.push({ category: OTHER_CATEGORY, spentCentavos: unlistedSpend });
  }

  envelopes.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (a.status === "over" ? a.leftCentavos - b.leftCentavos : 0) ||
      b.plannedCentavos - a.plannedCentavos ||
      a.category.name.localeCompare(b.category.name),
  );
  unplanned.sort((a, b) => b.spentCentavos - a.spentCentavos);

  const plannedCentavos = envelopes.reduce(
    (sum, envelope) => sum + envelope.plannedCentavos,
    0,
  );
  const spentCentavos = Object.values(spent).reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    envelopes,
    unplanned,
    plannedCentavos,
    spentCentavos,
    leftCentavos: plannedCentavos - spentCentavos,
    overCount: envelopes.filter((envelope) => envelope.status === "over")
      .length,
  };
}

export type MonthPace = {
  phase: "past" | "current" | "future";
  daysInMonth: number;
  /** Days gone, counting today. */
  daysElapsed: number;
  /** Days still to come, counting today. */
  daysLeft: number;
  /** Share of the month gone by the end of today. */
  elapsedRatio: number;
};

function daysIn(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
}

/** Where `today` (YYYY-MM-DD) falls in `month` (YYYY-MM). */
export function monthPace(month: string, today: string): MonthPace {
  const daysInMonth = daysIn(month);
  const todayMonth = today.slice(0, 7);
  if (todayMonth > month) {
    return {
      phase: "past",
      daysInMonth,
      daysElapsed: daysInMonth,
      daysLeft: 0,
      elapsedRatio: 1,
    };
  }
  if (todayMonth < month) {
    return {
      phase: "future",
      daysInMonth,
      daysElapsed: 0,
      daysLeft: daysInMonth,
      elapsedRatio: 0,
    };
  }
  const day = Number(today.slice(8, 10));
  return {
    phase: "current",
    daysInMonth,
    daysElapsed: day,
    daysLeft: daysInMonth - day + 1,
    elapsedRatio: day / daysInMonth,
  };
}

/**
 * What can still go out each day without passing the plan, for the rest of
 * the current month. Null once the plan is used up or the month is not on.
 */
export function dailyAllowance(
  leftCentavos: number,
  pace: MonthPace,
): number | null {
  if (pace.phase !== "current" || leftCentavos <= 0 || pace.daysLeft <= 0) {
    return null;
  }
  return Math.floor(leftCentavos / pace.daysLeft);
}

/** `2026-10` shifted by whole months, e.g. `shiftMonth("2026-01", -1)`. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Rounds up to the next whole ₱100, for plans seeded from past spending. */
export function roundUpToHundredPesos(centavos: number): number {
  return Math.ceil(centavos / 10_000) * 10_000;
}
