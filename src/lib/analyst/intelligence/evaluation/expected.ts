import { spendingPeriods } from "@/lib/analyst/evidence";
import {
  FIXTURE_CLOCK,
  OWNER_A,
  OWNER_B,
  PERIODS,
  ownerDataset,
  type FixtureDataset,
  type FixtureEdge,
  type FixtureOwner,
  type FixtureTransaction,
  type FixtureVariant,
  type Period,
} from "./fixtures";

/**
 * Deterministic expected facts for the evaluation corpus. These are the
 * answers an Analyst response is scored against, computed from the synthetic
 * fixtures with integer centavos and inclusive Manila calendar dates. They
 * are evaluation oracles, not a second source of truth for ATLAS: where ATLAS
 * already defines a rule (the aligned comparison period), it is reused.
 */

const inPeriod = (date: string, period: Period) =>
  date >= period.from && date <= period.through;

/** Sums integer centavos and refuses to leave the safe integer range. */
export function sumCentavos(values: number[]) {
  return values.reduce((sum, value) => {
    if (!Number.isSafeInteger(value))
      throw new RangeError("Amounts must be integer centavos.");
    const next = sum + value;
    if (!Number.isSafeInteger(next))
      throw new RangeError("Total exceeds the safe centavo range.");
    return next;
  }, 0);
}

export function transactionsIn(
  data: FixtureDataset,
  kind: FixtureTransaction["kind"],
  period: Period,
) {
  return data.transactions.filter(
    (row) => row.kind === kind && inPeriod(row.date, period),
  );
}

export function totalCentavos(
  data: FixtureDataset,
  kind: FixtureTransaction["kind"],
  period: Period,
) {
  return sumCentavos(
    transactionsIn(data, kind, period).map((row) => row.amountCentavos),
  );
}

export type PercentChange =
  | { status: "defined"; tenths: number }
  | { status: "undefined"; reason: "zero_baseline" };

/** Percent change to one decimal place; a zero baseline has none. */
export function percentChange(
  current: number,
  previous: number,
): PercentChange {
  if (previous === 0) return { status: "undefined", reason: "zero_baseline" };
  return {
    status: "defined",
    tenths: Math.round(((current - previous) / previous) * 1000),
  };
}

/** A complete ranking; equal values share a rank and are reported as ties. */
export function rankTotals(totals: Array<{ key: string; value: number }>) {
  const sorted = [...totals].sort(
    (a, b) => b.value - a.value || a.key.localeCompare(b.key),
  );
  let rank = 0;
  let previous: number | null = null;
  const ranked = sorted.map((item, index) => {
    if (item.value !== previous) rank = index + 1;
    previous = item.value;
    return { ...item, rank };
  });
  const top = ranked.filter((item) => item.rank === 1);
  return { ranked, top: top.map((item) => item.key), tie: top.length > 1 };
}

const UNCATEGORIZED = "uncategorized";

function byCategory(rows: FixtureTransaction[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.categoryId ?? UNCATEGORIZED;
    totals.set(key, sumCentavos([totals.get(key) ?? 0, row.amountCentavos]));
  }
  return totals;
}

/**
 * Category contributions to a change in recorded expenses. Contributions
 * include uncategorized activity and must sum to the total change exactly;
 * this is accounting decomposition, not a behavioral cause.
 */
export function categoryContributions(
  data: FixtureDataset,
  current: Period,
  previous: Period,
) {
  const now = byCategory(transactionsIn(data, "expense", current));
  const before = byCategory(transactionsIn(data, "expense", previous));
  const keys = [...new Set([...now.keys(), ...before.keys()])].sort();
  const contributions = keys.map((key) => ({
    key,
    current: now.get(key) ?? 0,
    previous: before.get(key) ?? 0,
    change: (now.get(key) ?? 0) - (before.get(key) ?? 0),
  }));
  const totalChange =
    totalCentavos(data, "expense", current) -
    totalCentavos(data, "expense", previous);
  const reconciled =
    sumCentavos(contributions.map((item) => item.change)) === totalChange;
  const increases = rankTotals(
    contributions
      .filter((item) => item.change > 0)
      .map((item) => ({ key: item.key, value: item.change })),
  );
  return { contributions, totalChange, reconciled, largestIncrease: increases };
}

/** Ranking from only the first page of rows by date, as a sampled search would. */
export function sampledCategoryRanking(
  data: FixtureDataset,
  period: Period,
  pageRows: number,
) {
  const page = [...transactionsIn(data, "expense", period)]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, pageRows);
  return rankTotals(
    [...byCategory(page)].map(([key, value]) => ({ key, value })),
  );
}

export function categoryRanking(data: FixtureDataset, period: Period) {
  return rankTotals(
    [...byCategory(transactionsIn(data, "expense", period))].map(
      ([key, value]) => ({ key, value }),
    ),
  );
}

/** Tasks completed in a period, split by their current explicit goal link. */
export function goalTaskActivity(
  data: FixtureDataset,
  goalId: string,
  period: Period,
) {
  const completed = data.tasks.filter(
    (task) => task.completedOn !== null && inPeriod(task.completedOn, period),
  );
  const linked = completed.filter((task) => task.goalId === goalId);
  return {
    completedAll: completed.length,
    completedLinked: linked.length,
    completedUnlinked: completed.length - linked.length,
    linkedIds: linked.map((task) => task.id).sort(),
    openLinked: data.tasks
      .filter((task) => task.goalId === goalId && task.completedOn === null)
      .map((task) => task.id)
      .sort(),
    milestonesCompleted: data.milestones.filter(
      (item) =>
        item.goalId === goalId &&
        item.completedOn !== null &&
        inPeriod(item.completedOn, period),
    ).length,
  };
}

/**
 * Bounded, cycle-safe traversal over one owner's current links, in either
 * direction. Returns simple paths up to `maxDepth` hops and whether a cycle
 * was cut. Current links do not prove that the links existed historically.
 */
export function boundedPaths(
  edges: FixtureEdge[],
  ownerId: FixtureOwner,
  start: string,
  maxDepth: number,
  maxNodes = 40,
) {
  const owned = edges.filter((edge) => edge.ownerId === ownerId);
  const neighbours = (id: string) =>
    owned.flatMap((edge) =>
      edge.source === id
        ? [edge.target]
        : edge.target === id
          ? [edge.source]
          : [],
    );
  const paths: string[][] = [];
  const visited = new Set([start]);
  let cycleCut = false;
  let truncated = false;
  const walk = (path: string[]) => {
    for (const next of [...new Set(neighbours(path.at(-1)!))].sort()) {
      // A link back into the path, other than the edge just walked, is a cycle.
      if (path.includes(next)) {
        if (next !== path.at(-2)) cycleCut = true;
        continue;
      }
      if (path.length - 1 >= maxDepth) continue;
      if (!visited.has(next) && visited.size >= maxNodes) {
        truncated = true;
        continue;
      }
      visited.add(next);
      const extended = [...path, next];
      paths.push(extended);
      walk(extended);
    }
  };
  walk([start]);
  return { paths, nodes: [...visited].sort(), cycleCut, truncated };
}

/** Records the owner can see whose title matches, case-insensitively. */
export function ownerGoalMatches(data: FixtureDataset, text: string) {
  const needle = text.trim().toLocaleLowerCase();
  return data.goals
    .filter((goal) => goal.title.toLocaleLowerCase().includes(needle))
    .map((goal) => goal.id);
}

export type ExpectedFact = {
  key: string;
  owner: FixtureOwner;
  variant: FixtureVariant;
  description: string;
  value: unknown;
};

/** Every fact a corpus case can require, computed once from the fixtures. */
export function buildExpectedFacts(): Record<string, ExpectedFact> {
  const a = ownerDataset("rich", OWNER_A);
  const b = ownerDataset("rich", OWNER_B);
  const bulk = ownerDataset("bulk", OWNER_A);
  const aligned = spendingPeriods(new Date(FIXTURE_CLOCK));
  const current = aligned.current;
  const previous = aligned.previous;
  const facts: ExpectedFact[] = [];
  const fact = (
    key: string,
    description: string,
    value: unknown,
    owner: FixtureOwner = OWNER_A,
    variant: FixtureVariant = "rich",
  ) => facts.push({ key, owner, variant, description, value });

  const expenseNow = totalCentavos(a, "expense", current);
  const expenseBefore = totalCentavos(a, "expense", previous);
  fact(
    "period.current",
    "Aligned current period at the fixture clock",
    current,
  );
  fact(
    "period.previous",
    "Aligned previous period at the fixture clock",
    previous,
  );
  fact("expense.current", "Recorded expenses, current period", expenseNow);
  fact(
    "expense.previous_aligned",
    "Recorded expenses, aligned previous period",
    expenseBefore,
  );
  fact(
    "expense.previous_full_month",
    "Recorded expenses, full previous month (must not replace the aligned period)",
    totalCentavos(a, "expense", PERIODS.previousFullMonth),
  );
  fact(
    "expense.change",
    "Change in recorded expenses",
    expenseNow - expenseBefore,
  );
  fact(
    "expense.change_percent",
    "Percent change in recorded expenses",
    percentChange(expenseNow, expenseBefore),
  );
  const decomposition = categoryContributions(a, current, previous);
  fact(
    "expense.contributions",
    "Category contributions to the change",
    decomposition.contributions,
  );
  fact(
    "expense.contributions_reconcile",
    "Contributions sum to the total change",
    decomposition.reconciled,
  );
  fact("expense.largest_increase", "Largest category increase, with ties", {
    top: decomposition.largestIncrease.top,
    tie: decomposition.largestIncrease.tie,
  });
  const health = decomposition.contributions.find(
    (item) => item.key === "cat-a-health",
  )!;
  fact(
    "expense.health_percent_change",
    "Health percent change from a zero baseline",
    percentChange(health.current, health.previous),
  );
  const fullRanking = categoryRanking(bulk, current);
  fact(
    "bulk.largest_category",
    "Largest category across every row of the large month",
    { top: fullRanking.top, tie: fullRanking.tie },
    OWNER_A,
    "bulk",
  );
  fact(
    "bulk.sampled_largest_category",
    "Largest category on the first retrieval page only (a wrong answer)",
    sampledCategoryRanking(bulk, current, 500).top,
    OWNER_A,
    "bulk",
  );
  fact(
    "bulk.expense_total",
    "Recorded expenses across every row of the large month",
    totalCentavos(bulk, "expense", current),
    OWNER_A,
    "bulk",
  );
  fact(
    "bulk.row_count",
    "Expense rows in the large month",
    transactionsIn(bulk, "expense", current).length,
    OWNER_A,
    "bulk",
  );

  fact(
    "income.current",
    "Recorded income transactions, current period",
    totalCentavos(a, "income", current),
  );
  fact(
    "income.transfers_excluded",
    "Transfers in the current period, which are not income",
    sumCentavos(
      a.transfers
        .filter((row) => inPeriod(row.date, current))
        .map((row) => row.amountCentavos),
    ),
  );
  fact(
    "income.refund_recorded_as_income",
    "A refund recorded as income (no refund type exists)",
    sumCentavos(
      transactionsIn(a, "income", current)
        .filter((row) => /refund/i.test(row.merchant))
        .map((row) => row.amountCentavos),
    ),
  );
  const dining = transactionsIn(a, "expense", {
    from: "2026-09-01",
    through: "2026-09-30",
  })
    .filter((row) => row.categoryId === "cat-a-dining")
    .map((row) => row.amountCentavos);
  const diningBudget = a.budgets.find(
    (item) => item.categoryId === "cat-a-dining",
  )!;
  fact("budget.dining_spent", "Dining spent in September", sumCentavos(dining));
  fact(
    "budget.dining_limit",
    "Dining budget for September",
    diningBudget.limitCentavos,
  );
  fact(
    "budget.dining_over",
    "Dining over budget",
    sumCentavos(dining) - diningBudget.limitCentavos,
  );
  fact(
    "debt.payments_current",
    "Recorded debt payments, current period",
    sumCentavos(
      a.debtPayments
        .filter((row) => inPeriod(row.date, current))
        .map((row) => row.amountCentavos),
    ),
  );
  fact(
    "debt.balance",
    "Current debt balance (no balance history)",
    a.debts[0]!.balanceCentavos,
  );

  fact(
    "expense.owner_b_current",
    "Owner B recorded expenses, current period",
    totalCentavos(b, "expense", current),
    OWNER_B,
  );

  const career = goalTaskActivity(a, "goal-a-career", current);
  fact(
    "goal.career_activity",
    "Career goal task activity, current period",
    career,
  );
  fact(
    "goal.career_activity_previous",
    "Career goal task activity, previous full month",
    goalTaskActivity(a, "goal-a-career", PERIODS.previousFullMonth),
  );
  fact(
    "goal.active_candidates",
    "Active goals that could be the main goal",
    a.goals
      .filter((goal) => goal.status === "active")
      .map((goal) => goal.id)
      .sort(),
  );
  fact(
    "goal.owner_a_title_matches",
    "Owner A goals matching the shared title",
    ownerGoalMatches(a, "Land a developer job"),
  );
  fact(
    "goal.owner_b_title_matches",
    "Owner B goals matching the shared title",
    ownerGoalMatches(b, "Land a developer job"),
    OWNER_B,
  );

  const twoHop = boundedPaths(a.edges, OWNER_A, "goal-a-career", 2);
  fact("graph.career_two_hop", "Two-hop paths from the career goal", {
    reachesDecision: twoHop.paths.some((path) =>
      path.includes("decision-a-study"),
    ),
    cycleCut: twoHop.cycleCut,
    nodes: twoHop.nodes,
  });

  fact(
    "career.overdue_follow_ups",
    "Applications whose follow-up date has passed",
    a.applications
      .filter(
        (item) =>
          item.followUpOn !== null &&
          item.followUpOn < current.through &&
          item.stage !== "rejected",
      )
      .map((item) => item.id),
  );
  fact(
    "career.same_company_roles",
    "Applications at the same company",
    a.applications
      .filter((item) => item.company === "Acme Synthetic")
      .map((item) => item.id)
      .sort(),
  );
  fact("career.stage_history_available", "Dated stage history exists", false);

  fact(
    "reviews.scores",
    "Weekly review overall scores by week",
    a.reviews.map((item) => [item.weekStart, item.overallScore]),
  );
  fact(
    "knowledge.sysdesign_reviews_current",
    "System design reviews, current period",
    a.concepts
      .find((item) => item.id === "concept-a-sysdesign")!
      .reviewDates.filter((day) => inPeriod(day, current)).length,
  );
  const decision = a.decisions[0]!;
  fact(
    "decision.original_plan",
    "Decision plan as first recorded",
    decision.originalPlan,
  );
  fact(
    "decision.latest_plan",
    "Decision plan after revision",
    decision.revisions.at(-1)!.plan,
  );
  fact(
    "decision.review_window_open",
    "Decision review date not yet reached",
    decision.reviewOn > current.through,
  );
  fact(
    "decision.unavailable_sources",
    "Observation sources that no longer exist",
    a.observations
      .filter((item) => item.sourceId && a.deletedIds.includes(item.sourceId))
      .map((item) => item.id),
  );
  fact(
    "signal.overdue_source",
    "Source fact behind the overdue Signal",
    a.signals[0]!.sourceId,
  );

  return Object.fromEntries(facts.map((item) => [item.key, item]));
}

export const EXPECTED_FACTS = buildExpectedFacts();
