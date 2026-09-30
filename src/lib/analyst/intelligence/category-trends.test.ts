import { describe, expect, it } from "vitest";
import {
  memberMonth,
  memberMonthProjection,
  monthSetTrend,
} from "./calculations";
import { checkClaim } from "./claims";
import type { DerivedFact, EvidenceV2, Period } from "./contracts";
import { autoDerive } from "./derive";
import { V2_NOW, brief, metricEvidence } from "./evaluation/v2-fixtures";
import { deterministicBrief, withChangeDrivers } from "./planning";
import { refineBrief, type PlannerOutput } from "./planner";
import { capabilityProposer, changeDrivers } from "./proposer";
import { checkBrief } from "./brief";
import { selectEvidence } from "./evidence";
import { runInvestigation, selectionLimits } from "./orchestrator";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import type { ToolOutcome } from "./orchestrator";
import type { V2ToolResult } from "./tools/contracts";
import { compactEvidence } from "./writer";

const now = new Date("2026-09-24T04:00:00.000Z");
const food = "category:1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const fuel = "category:2c5f39cb-3ab2-42e3-994a-1127e4ddb538";
const rent = "category:3d6a4adc-4bc3-43f4-aa5b-2238e5eec649";

const queryPeriod = { from: "2026-04-15", through: "2026-09-24" };
const setId = "expense_q0badf00d_by_month";

/** One month member of a query grouped by month, read over `period`. */
function monthMember(
  month: string,
  value: number,
  options: { period?: Period; metricKey?: string; size?: number } = {},
): EvidenceV2 {
  const item = metricEvidence({
    id: `q.${month}`,
    metricKey: options.metricKey ?? "expense_query_centavos",
    value,
    period: options.period ?? queryPeriod,
    scope: {
      id: `cohort:${setId}`,
      type: "cohort",
      description: "Recorded expense transactions in 1 chosen category",
      cohort: {
        setId,
        member: `month:${month}`,
        setSize: options.size ?? 6,
        setComplete: true,
      },
    },
  });
  return {
    ...item,
    provenance: {
      ...item.provenance,
      tool: "queryTransactions",
      sourceRefs: [{ handle: food, href: "/money/transactions" }],
    },
  };
}

// April is only partly read (the query starts on the 15th) and September is
// the month in progress, so May through August are the whole months.
const series = [
  monthMember("2026-04", 90_000),
  monthMember("2026-05", 50_000),
  monthMember("2026-06", 60_000),
  monthMember("2026-07", 70_000),
  monthMember("2026-08", 80_000),
  monthMember("2026-09", 180_000),
];
const byOperation = (facts: DerivedFact[], id: string) =>
  facts.find((item) => item.id.endsWith(`.${id}`));

describe("trends over a query grouped by month", () => {
  it("reads month members as calendar months", () => {
    expect(memberMonth("month:2026-02")).toEqual({
      from: "2026-02-01",
      through: "2026-02-28",
    });
    expect(memberMonth("month:2026-13")).toBeNull();
    expect(memberMonth("weekday:mon")).toBeNull();
  });

  it("uses only the months the query and the records cover whole", () => {
    const facts = monthSetTrend("t", series, null);
    const rank = byOperation(facts, "rank")!;
    expect(rank.ranking?.map((entry) => entry.member)).toEqual([
      "month:2026-08",
      "month:2026-07",
      "month:2026-06",
      "month:2026-05",
    ]);
    expect(rank.periods).toEqual([
      { from: "2026-05-01", through: "2026-08-31" },
    ]);
    expect(byOperation(facts, "mean")?.output).toEqual({
      status: "defined",
      value: 65_000,
      unit: "centavos",
    });
    // August less the average of May through July.
    expect(byOperation(facts, "latest_vs_mean")?.output).toMatchObject({
      value: 20_000,
    });
    expect(byOperation(facts, "streak")?.output).toMatchObject({ value: 3 });
  });

  it("leaves out months before the records begin", () => {
    const facts = monthSetTrend("t", series, {
      day: "2026-06-10",
      evidenceId: "inventory",
    });
    // June starts before the first record, so July and August remain.
    expect(
      byOperation(facts, "rank")?.ranking?.map((entry) => entry.member),
    ).toEqual(["month:2026-08", "month:2026-07"]);
    expect(byOperation(facts, "streak")).toBeUndefined();
  });

  it("without a known start, leaves out empty months before the first active one", () => {
    const quiet = [
      monthMember("2026-05", 0),
      monthMember("2026-06", 0),
      monthMember("2026-07", 40_000),
      monthMember("2026-08", 30_000),
    ].map((item) => ({
      ...item,
      scope: {
        ...item.scope,
        cohort: { ...item.scope.cohort!, setSize: 4 },
      },
    }));
    const facts = monthSetTrend("t", quiet, null);
    expect(
      byOperation(facts, "rank")?.ranking?.map((entry) => entry.member),
    ).toEqual(["month:2026-07", "month:2026-08"]);
    // With the start known, the empty months are real months of nothing.
    const known = monthSetTrend("t", quiet, {
      day: "2026-01-01",
      evidenceId: "inventory",
    });
    expect(byOperation(known, "rank")?.ranking).toHaveLength(4);
  });

  it("derives nothing from an incomplete set", () => {
    expect(monthSetTrend("t", series.slice(1), null)).toEqual([]);
  });

  it("projects the month in progress at its pace", () => {
    const fact = memberMonthProjection("p", series[5]!, "2026-09-24", null);
    // ₱1,800.00 over 24 days is ₱75.00 a day; six days remain.
    expect(fact.output).toEqual({
      status: "defined",
      value: 225_000,
      unit: "centavos",
    });
    expect(fact.periods).toEqual([
      { from: "2026-09-01", through: "2026-09-30" },
    ]);
    expect(fact.metricKey).toBe("expense_query_centavos_projection");
  });

  it("never projects a past month, an early month, or an average", () => {
    expect(() =>
      memberMonthProjection("p", series[4]!, "2026-09-24", null),
    ).toThrow();
    expect(() =>
      memberMonthProjection("p", series[5]!, "2026-09-05", null),
    ).toThrow();
    const average = monthMember("2026-09", 1_500, {
      metricKey: "expense_query_average_centavos",
    });
    expect(() =>
      memberMonthProjection("p", average, "2026-09-24", null),
    ).toThrow();
  });

  it("gives a month set its trend and projection, never a partial-month ranking", () => {
    const facts = autoDerive(series, { today: "2026-09-24" });
    expect(facts.some((item) => item.id.startsWith("derived.rank."))).toBe(
      false,
    );
    expect(
      facts.find((item) => item.id.startsWith("derived.trend."))?.periods,
    ).toEqual([{ from: "2026-05-01", through: "2026-08-31" }]);
    expect(
      facts.find((item) => item.operation === "projection")?.output,
    ).toMatchObject({ value: 225_000 });
    // No share divides a month by the months' total.
    expect(facts.some((item) => item.id.startsWith("derived.share."))).toBe(
      false,
    );
  });

  it("shows the writer which category a filtered query read", () => {
    expect(compactEvidence(series[0]!)).toMatchObject({ categories: [food] });
  });

  it("lets a trend claim name the category its query read", () => {
    const facts = autoDerive(series, { today: "2026-09-24" });
    const streak = facts.find((item) => item.operation === "streak")!;
    const evidence = new Map(series.map((item) => [item.id, item]));
    const claim = checkClaim(
      {
        id: "c1",
        kind: "fact",
        text: `Spending in {{${food}}} has risen three months in a row.`,
        evidenceIds: [],
        derivedFactIds: [streak.id],
        answersRequirementIds: ["r_money"],
        assumptionIds: [],
        comparison: null,
        recommendation: null,
        scopeId: streak.scopeId,
      },
      {
        evidence,
        derived: new Map(facts.map((item) => [item.id, item])),
        brief: brief([["r_money", true]]),
        now: V2_NOW,
      },
    );
    expect(claim.verification.reasons).toEqual([]);
  });
});

/** A category breakdown read for one period. */
function breakdown(period: Period, values: Record<string, number>) {
  const members = Object.entries(values);
  return [
    ...members.map(([member, value]) =>
      metricEvidence({
        id: `b.${member}.${period.from}`,
        metricKey: "expense_centavos",
        value,
        period,
        scope: {
          id: "cohort:expense_by_category",
          type: "cohort",
          description: "Recorded expenses by category",
          cohort: {
            setId: "expense_by_category",
            member,
            setSize: members.length,
            setComplete: true,
          },
        },
      }),
    ),
    metricEvidence({
      id: `b.total.${period.from}`,
      metricKey: "expense_centavos",
      value: members.reduce((sum, [, value]) => sum + value, 0),
      period,
      scope: {
        id: "whole_domain:expense",
        type: "whole_domain",
        description: "All of the owner's recorded expense",
      },
    }),
  ];
}

const current = { from: "2026-09-01", through: "2026-09-24" };
const previous = { from: "2026-08-01", through: "2026-08-24" };

describe("change drivers", () => {
  it("picks the categories that moved most with the total", () => {
    const now = breakdown(current, {
      [food]: 300_000,
      [fuel]: 150_000,
      [rent]: 500_000,
      uncategorized: 900_000,
    });
    const before = breakdown(previous, {
      [food]: 100_000,
      [fuel]: 100_000,
      [rent]: 520_000,
      uncategorized: 0,
    });
    // Spending rose; uncategorized rose most but cannot be read alone.
    expect(changeDrivers("expense", now, before)).toEqual([food, fuel]);
    // Read the other way, spending fell, and so did food and fuel.
    expect(changeDrivers("expense", before, now)).toEqual([food, fuel]);
  });

  it("finds none when the total did not change", () => {
    const same = breakdown(current, { [food]: 100_000 });
    expect(
      changeDrivers("expense", same, breakdown(previous, { [food]: 100_000 })),
    ).toEqual([]);
  });

  it("is added for a money change over two periods", () => {
    const base = deterministicBrief({
      question: "Why did my spending go up?",
      plan: null,
      now,
    });
    expect(base.periods).toHaveLength(2);
    expect(
      base.requirements.find((item) => item.id === "r_money_drivers_expense")
        ?.evidenceNeeded,
    ).toEqual(["money.change_drivers"]);
    // One period has no change to explain.
    expect(
      withChangeDrivers(base.requirements.slice(0, 1), "explain_change", 1, ""),
    ).toHaveLength(1);
  });

  it("is added after the plan adds a baseline, and dropped without one", () => {
    const base = deterministicBrief({
      question: "Why did I spend more this month?",
      plan: null,
      now,
    });
    expect(base.periods).toHaveLength(1);
    const output = (comparePreviousPeriod: boolean): PlannerOutput => ({
      understanding: "Why spending rose this month.",
      intent: "explain_change",
      responseStyle: "detailed",
      subQuestions: [
        {
          question: "Which categories account for the rise?",
          capabilities: ["money.change_drivers"],
          moneyKind: "expense",
          query: null,
        },
      ],
      hypotheses: [],
      comparePreviousPeriod,
      period: null,
      clarification: null,
    });
    const allowed = new Set([
      "money.totals",
      "money.category_breakdown",
      "money.change_drivers",
    ]);
    const refined = refineBrief(base, output(true), {
      now,
      allowed,
      defaultedTopic: false,
    });
    expect(refined.brief.periods).toHaveLength(2);
    expect(
      refined.brief.requirements.filter((item) =>
        item.evidenceNeeded.includes("money.change_drivers"),
      ),
    ).toHaveLength(1);
    const single = refineBrief(base, output(false), {
      now,
      allowed,
      defaultedTopic: false,
    });
    expect(
      single.brief.requirements.some((item) =>
        item.evidenceNeeded.includes("money.change_drivers"),
      ),
    ).toBe(false);
  });

  it("reads both breakdowns, then each driver's last six months", async () => {
    const base = deterministicBrief({
      question: "Why did my spending go up?",
      plan: null,
      now,
    });
    const view = (outcomes: ToolOutcome[]) => ({
      brief: base,
      round: outcomes.length ? 2 : 1,
      outcomes,
      progress: base.requirements.map((item) => ({
        requirementId: item.id,
        essential: item.essential,
        state:
          item.id === "r_money_drivers_expense" || !outcomes.length
            ? ("missing" as const)
            : ("evidenced" as const),
        reason: null,
      })),
      knownHandles: new Set<string>(),
    });
    const proposer = capabilityProposer(now);
    const first = await proposer.propose(view([]));
    const reads = first.requests.filter(
      (item) => item.tool === "getMoneyBreakdown",
    );
    expect(reads.map((item) => item.input)).toEqual(
      expect.arrayContaining([
        { ...current, kind: "expense" },
        { ...previous, kind: "expense" },
      ]),
    );
    expect(
      reads.every((item) =>
        item.requirementIds.includes("r_money_drivers_expense"),
      ),
    ).toBe(true);
    const outcome = (period: Period, evidence: EvidenceV2[]): ToolOutcome => ({
      round: 1,
      request: {
        tool: "getMoneyBreakdown",
        input: { ...period, kind: "expense" },
        requirementIds: ["r_money", "r_money_drivers_expense"],
      },
      result: {
        status: "ready",
        evidence,
        candidates: [],
        labels: [],
        ambiguous: false,
        limitations: [],
        error: null,
        metadata: { queries: 1 },
      } as unknown as V2ToolResult,
    });
    const second = await proposer.propose(
      view([
        outcome(
          current,
          breakdown(current, { [food]: 300_000, [fuel]: 90_000 }),
        ),
        outcome(
          previous,
          breakdown(previous, { [food]: 100_000, [fuel]: 100_000 }),
        ),
      ]),
    );
    expect(
      second.requests
        .filter((item) =>
          item.requirementIds.includes("r_money_drivers_expense"),
        )
        .map((item) => [item.tool, item.input]),
    ).toEqual([
      [
        "queryTransactions",
        {
          from: "2026-04-01",
          through: "2026-09-24",
          kind: "expense",
          groupBy: "month",
          measures: ["total"],
          categories: [food],
          minAmountPesos: null,
          maxAmountPesos: null,
        },
      ],
    ]);
  });
});

describe("month-by-month queries", () => {
  const monthQuery = async (
    period: PlannerOutput["period"],
    comparePreviousPeriod = true,
  ) => {
    const refined = refineBrief(
      deterministicBrief({
        question: "Is my food spending going up?",
        plan: null,
        now,
      }),
      {
        understanding: "Whether food spending is rising.",
        intent: "compare",
        responseStyle: "standard",
        subQuestions: [
          {
            question: "Food spending by month",
            capabilities: ["money.query"],
            moneyKind: "expense",
            query: {
              groupBy: "month",
              measures: ["total"],
              category: null,
              minAmountPesos: null,
              maxAmountPesos: null,
            },
          },
        ],
        hypotheses: [],
        comparePreviousPeriod,
        period,
        clarification: null,
      },
      {
        now,
        allowed: new Set(["money.totals", "money.query"]),
        defaultedTopic: true,
      },
    );
    const proposal = await capabilityProposer(now).propose({
      brief: refined.brief,
      round: 1,
      outcomes: [],
      progress: refined.brief.requirements.map((item) => ({
        requirementId: item.id,
        essential: item.essential,
        state: "missing" as const,
        reason: null,
      })),
      knownHandles: new Set(),
    });
    return proposal.requests
      .filter((item) => item.tool === "queryTransactions")
      .map((item) => item.input as Period);
  };

  it("reads the last six months once, without a named window", async () => {
    expect(await monthQuery(null)).toEqual([
      expect.objectContaining({ from: "2026-04-01", through: "2026-09-24" }),
    ]);
  });

  it("keeps a window the person named", async () => {
    expect(
      await monthQuery({ from: "2026-08-01", through: "2026-09-24" }, false),
    ).toEqual([
      expect.objectContaining({ from: "2026-08-01", through: "2026-09-24" }),
    ]);
  });
});

describe("change drivers in a run", () => {
  const base = () =>
    deterministicBrief({
      question: "Why did my spending go up?",
      plan: null,
      now,
    });
  const result = (
    evidence: EvidenceV2[],
    labels: string[] = [],
  ): V2ToolResult => ({
    tool: null,
    status: "ready",
    evidence,
    labels: labels.map((handle) => ({
      handle,
      domain: "money",
      text: "Owner category",
      href: "/money/transactions",
    })),
    candidates: [],
    ambiguous: false,
    nextCursor: null,
    limitations: [],
    metadata: { version: "1", durationMs: 1, queries: 1, rows: 1 },
  });

  it("is not answered when one leading category's read fails", async () => {
    const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
    const check = checkBrief(base(), {
      consent,
      route: SHARED_ROUTE,
      authorizedHandles: new Set(),
    });
    if (!check.ok) throw new Error(check.reason);
    const run = await runInvestigation({
      check,
      proposer: capabilityProposer(now),
      clock: () => 0,
      invoke: async (tool, input) => {
        if (tool === "getMoneyBreakdown") {
          const period = input as Period;
          return result(
            period.from === current.from
              ? breakdown(current, { [food]: 300_000, [fuel]: 150_000 })
              : breakdown(previous, { [food]: 100_000, [fuel]: 100_000 }),
            [food, fuel],
          );
        }
        const categories = (input as { categories: string[] }).categories;
        if (categories[0] === fuel)
          return {
            ...result([]),
            status: "error",
            error: { code: "unavailable_source", message: "Unavailable" },
          };
        return result(series);
      },
    });
    const drivers = run.progress.find(
      (item) => item.requirementId === "r_money_drivers_expense",
    );
    // Food's months were read, fuel's were not: the drivers are not
    // answered, and the reason says a read failed.
    expect(drivers).toMatchObject({
      state: "partial",
      reason: "operational_failure",
    });
    expect(run.stopReason).toBe("sufficient");
  });

  it("keeps many-category breakdowns whole beside the driver histories", () => {
    const brief = base();
    const categories = Array.from(
      { length: 15 },
      (_, index) =>
        `category:00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const values = (step: number) =>
      Object.fromEntries(
        categories.map((handle, index) => [handle, 100_000 + index * step]),
      );
    const both = ["r_money", "r_money_drivers_expense"];
    const history = (tag: string) =>
      series.map((item) => ({
        ...item,
        id: `${item.id}.${tag}`,
        scope: {
          ...item.scope,
          id: `cohort:expense_q${tag}_by_month`,
          cohort: { ...item.scope.cohort!, setId: `expense_q${tag}_by_month` },
        },
      }));
    const retrieved = [
      ...breakdown(current, values(1_000)),
      ...breakdown(previous, values(0)),
    ]
      .map((evidence) => ({ evidence, requirementIds: both }))
      .concat(
        [...history("a"), ...history("b")].map((evidence) => ({
          evidence,
          requirementIds: ["r_money_drivers_expense"],
        })),
      );
    const contribution = (selected: EvidenceV2[]) =>
      autoDerive(selected).find((item) =>
        item.id.startsWith("derived.contribution.whole_domain:expense"),
      );
    // Before: the histories took room from the breakdowns, whose sets were
    // cut, so the contribution disappeared.
    expect(
      contribution(
        selectEvidence(brief, retrieved, { items: 40, bytes: 60_000 }).selected,
      ),
    ).toBeUndefined();
    const selection = selectEvidence(
      brief,
      retrieved,
      selectionLimits(brief, "deep"),
    );
    expect(selection.dropped).toBe(0);
    expect(contribution(selection.selected)?.output).toMatchObject({
      status: "defined",
      value: 105_000,
    });
  });
});
