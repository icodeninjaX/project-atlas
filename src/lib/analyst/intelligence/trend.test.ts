import { describe, expect, it } from "vitest";
import {
  comparablePeriods,
  fullMonth,
  monthlyTrend,
  NET_FLOW_SCOPE,
} from "./calculations";
import { checkClaim, claimCanShip, type ClaimCheckContext } from "./claims";
import type { DraftClaim, EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { V2_NOW, brief, metricEvidence } from "./evaluation/v2-fixtures";
import { runInvestigation } from "./orchestrator";
import { checkBrief } from "./brief";
import { deterministicBrief } from "./planning";
import { refineBrief, requirementTrend, type PlannerOutput } from "./planner";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { capabilityProposer } from "./proposer";
import type { V2ToolResult } from "./tools/contracts";

const scope = {
  id: "whole_domain:expense_centavos",
  type: "whole_domain" as const,
  description: "All of the owner's recorded expense_centavos",
};
const month = (from: string, through: string, value: number, id = from) =>
  metricEvidence({
    id: `expense.${id}`,
    metricKey: "expense_centavos",
    value,
    period: { from, through },
    scope,
  });
// Four whole months rising three times in a row, then the month in progress.
const series: EvidenceV2[] = [
  month("2026-05-01", "2026-05-31", 4_000_000),
  month("2026-06-01", "2026-06-30", 4_200_000),
  month("2026-07-01", "2026-07-31", 4_500_000),
  month("2026-08-01", "2026-08-31", 5_100_000),
  month("2026-09-01", "2026-09-24", 3_900_000),
];
const facts = monthlyTrend("t", series);
const byId = (suffix: string) =>
  facts.find((item) => item.id === `t.${suffix}`)!;

describe("monthly trend", () => {
  it("knows whole months and like-for-like periods", () => {
    expect(fullMonth({ from: "2026-02-01", through: "2026-02-28" })).toBe(true);
    expect(fullMonth({ from: "2026-09-01", through: "2026-09-24" })).toBe(
      false,
    );
    // This month so far against the same days last month, or two whole
    // months, but never a month in progress against a whole month.
    expect(
      comparablePeriods(
        { from: "2026-09-01", through: "2026-09-24" },
        { from: "2026-08-01", through: "2026-08-24" },
      ),
    ).toBe(true);
    expect(
      comparablePeriods(
        { from: "2026-09-01", through: "2026-09-30" },
        { from: "2026-08-01", through: "2026-08-31" },
      ),
    ).toBe(true);
    expect(
      comparablePeriods(
        { from: "2026-09-01", through: "2026-09-24" },
        { from: "2026-08-01", through: "2026-08-31" },
      ),
    ).toBe(false);
  });

  it("ranks, averages and compares whole months only", () => {
    expect(byId("rank")).toMatchObject({
      operation: "rank",
      periods: [{ from: "2026-05-01", through: "2026-08-31" }],
      top: ["month:2026-08"],
      tie: false,
      output: { status: "defined", value: 5_100_000 },
    });
    expect(byId("rank").ranking).toHaveLength(4);
    expect(byId("mean").output).toEqual({
      status: "defined",
      value: 4_450_000,
      unit: "centavos",
    });
    // August against the average of May to July (₱42,333.33).
    expect(byId("latest_vs_mean").output).toEqual({
      status: "defined",
      value: 5_100_000 - 4_233_333,
      unit: "centavos",
    });
    expect(byId("streak").output).toEqual({
      status: "defined",
      value: 3,
      unit: "count",
    });
  });

  it("keeps ties and reports falls as a negative run", () => {
    const tied = monthlyTrend("x", [
      month("2026-06-01", "2026-06-30", 5_000_000),
      month("2026-07-01", "2026-07-31", 5_000_000),
    ]);
    expect(tied.find((item) => item.operation === "rank")).toMatchObject({
      tie: true,
      top: ["month:2026-06", "month:2026-07"],
    });
    const falling = monthlyTrend("y", [
      month("2026-06-01", "2026-06-30", 5_000_000),
      month("2026-07-01", "2026-07-31", 4_000_000),
      month("2026-08-01", "2026-08-31", 3_000_000),
    ]);
    expect(
      falling.find((item) => item.operation === "streak")?.output,
    ).toMatchObject({ value: -2 });
  });

  it("derives the trend and never sets the month in progress against a whole month", () => {
    const derived = autoDerive(series);
    expect(derived.some((item) => item.operation === "mean")).toBe(true);
    const change = derived.find((item) =>
      item.id.startsWith("derived.change."),
    );
    // The latest like-for-like pair is August against July.
    expect(change?.periods).toEqual([
      { from: "2026-08-01", through: "2026-08-31" },
      { from: "2026-07-01", through: "2026-07-31" },
    ]);
  });
});

describe("trend claims", () => {
  const derived = autoDerive(series);
  const ctx: ClaimCheckContext = {
    brief: brief([["r_trend", true]]),
    evidence: new Map(series.map((item) => [item.id, item])),
    derived: new Map(derived.map((item) => [item.id, item])),
    now: V2_NOW,
  };
  const fact = (operation: string) =>
    derived.find(
      (item) =>
        item.operation === operation && item.id.startsWith("derived.trend."),
    )!;
  const claim = (text: string, factIds: string[]): DraftClaim => ({
    id: "c1",
    kind: "fact",
    text,
    answersRequirementIds: ["r_trend"],
    evidenceIds: [],
    derivedFactIds: factIds,
    assumptionIds: [],
    scopeId: scope.id,
    comparison: null,
    recommendation: null,
  });

  it("ships a highest month, an average and a run of rises", () => {
    for (const draft of [
      claim(
        "August had the highest recorded spending of the whole months since May, at ₱51,000.00.",
        [fact("rank").id],
      ),
      claim(
        "Recorded spending averaged ₱44,500.00 a month from May to August.",
        [fact("mean").id],
      ),
      claim("Recorded spending rose for 3 months in a row through August.", [
        fact("streak").id,
      ]),
    ]) {
      const checked = checkClaim(draft, ctx);
      expect(checked.verification.reasons, draft.text).toEqual([]);
      expect(claimCanShip(checked)).toBe(true);
    }
  });

  it("rejects a fall the run does not show", () => {
    const checked = checkClaim(
      claim("Recorded spending fell for 3 months in a row.", [
        fact("streak").id,
      ]),
      ctx,
    );
    expect(checked.verification.reasons).toContain("comparison");
  });
});

describe("planned trends", () => {
  const now = new Date("2026-09-24T04:00:00.000Z");
  const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
  const allowed = new Set(["money.totals", "history.trend"]);
  const plan = (extra: Partial<PlannerOutput["subQuestions"][number]>) =>
    ({
      understanding: "Whether spending is higher than usual.",
      intent: "compare",
      responseStyle: "detailed",
      subQuestions: [
        {
          question: "How has spending moved over the last six months?",
          capabilities: ["history.trend", "money.totals"],
          moneyKind: "expense",
          ...extra,
        },
      ],
      hypotheses: [],
      comparePreviousPeriod: false,
      period: null,
      clarification: null,
    }) satisfies PlannerOutput;

  it("makes a trend its own requirement and reads the measure month by month", async () => {
    const refined = refineBrief(
      deterministicBrief({
        question: "Am I spending more than usual?",
        plan: null,
        now,
      }),
      plan({ trendMetric: "expense_centavos", trendMonths: 6 }),
      { now, allowed, defaultedTopic: false },
    );
    const trend = refined.brief.requirements.find((item) =>
      item.evidenceNeeded.includes("history.trend"),
    )!;
    expect(trend.id).toBe("r_plan1_trend_expense_centavos_6");
    expect(requirementTrend(trend)).toEqual({
      metric: "expense_centavos",
      months: 6,
    });
    const check = checkBrief(refined.brief, {
      consent,
      route: SHARED_ROUTE,
      authorizedHandles: new Set(),
    });
    if (!check.ok) throw new Error(check.reason);
    const calls: Array<{ tool: string; input: unknown }> = [];
    await runInvestigation({
      check,
      proposer: capabilityProposer(now),
      invoke: async (tool, input) => {
        calls.push({ tool, input });
        return {
          tool,
          status: "ready",
          evidence: [],
          labels: [],
          candidates: [],
          ambiguous: false,
          nextCursor: null,
          limitations: [],
          metadata: { version: "1", durationMs: 0, queries: 0, rows: 0 },
        } satisfies V2ToolResult;
      },
      clock: () => 0,
    });
    expect(calls).toContainEqual({
      tool: "getHistoricalMetricSeries",
      input: {
        from: "2026-04-01",
        through: "2026-09-24",
        metric: "expense_centavos",
        grain: "month",
      },
    });
  });

  it("drops a trend that names no measure", () => {
    const refined = refineBrief(
      deterministicBrief({
        question: "Am I spending more than usual?",
        plan: null,
        now,
      }),
      plan({ capabilities: ["history.trend"], trendMetric: "none" }),
      { now, allowed, defaultedTopic: false },
    );
    expect(
      refined.brief.requirements.some((item) =>
        item.evidenceNeeded.includes("history.trend"),
      ),
    ).toBe(false);
  });

  it("nets a monthly income and expense series in the money flow", () => {
    const income = metricEvidence({
      id: "income.aug",
      metricKey: "income_centavos",
      value: 5_000_000,
      period: { from: "2026-08-01", through: "2026-08-31" },
      scope: { ...scope, id: "whole_domain:income_centavos" },
    });
    const net = autoDerive([income, series[3]!]).find(
      (item) => item.scopeId === NET_FLOW_SCOPE,
    );
    expect(net?.output).toMatchObject({ value: -100_000 });
  });
});
