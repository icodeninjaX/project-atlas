import { describe, expect, it } from "vitest";
import { checkBrief } from "./brief";
import { checkClaim, claimCanShip } from "./claims";
import type { EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { V2_NOW, brief, metricEvidence } from "./evaluation/v2-fixtures";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import { refineBrief, type PlannerOutput } from "./planner";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { capabilityProposer } from "./proposer";
import type { V2ToolResult } from "./tools/contracts";

const now = new Date("2026-09-24T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const allowed = new Set(["money.totals", "money.query"]);
const food = "category:1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const takeout = "category:2c5f39cb-3ab2-42e3-994a-1127e4ddb538";

const plan = (
  query: PlannerOutput["subQuestions"][number]["query"],
): PlannerOutput => ({
  understanding: "Whether food spending is heavier on weekends.",
  intent: "compare",
  responseStyle: "standard",
  subQuestions: [
    {
      question: "How does food spending on weekends compare with weekdays?",
      capabilities: ["money.query"],
      moneyKind: "expense",
      query,
    },
  ],
  hypotheses: [],
  comparePreviousPeriod: false,
  period: null,
  clarification: null,
});
const weekendFood = {
  groupBy: "weekend" as const,
  measures: ["total" as const, "count" as const],
  category: "food",
  minAmountPesos: null,
  maxAmountPesos: null,
};
const refine = (output: PlannerOutput) =>
  refineBrief(
    deterministicBrief({
      question: "Do I spend more on food on weekends?",
      plan: null,
      now,
    }),
    output,
    { now, allowed, defaultedTopic: false },
  );

describe("planned transaction queries", () => {
  it("becomes its own requirement carrying the query", () => {
    const query = refine(plan(weekendFood)).brief.requirements.find((item) =>
      item.evidenceNeeded.includes("money.query"),
    )!;
    expect(query.id).toBe("r_plan1_query_expense");
    expect(query.transactionQuery).toEqual({ kind: "expense", ...weekendFood });
  });

  it("drops a malformed query instead of guessing one", () => {
    const refined = refine(
      plan({ ...weekendFood, minAmountPesos: 5000, maxAmountPesos: 100 }),
    );
    expect(
      refined.brief.requirements.some((item) =>
        item.evidenceNeeded.includes("money.query"),
      ),
    ).toBe(false);
  });

  it("resolves the category phrase, then reads only those categories", async () => {
    const check = checkBrief(refine(plan(weekendFood)).brief, {
      consent,
      route: SHARED_ROUTE,
      authorizedHandles: new Set(),
    });
    if (!check.ok) throw new Error(check.reason);
    const calls: Array<{ tool: string; input: unknown }> = [];
    const result = (
      tool: string,
      extra: Partial<V2ToolResult> = {},
    ): V2ToolResult => ({
      tool: tool as V2ToolResult["tool"],
      status: "ready",
      evidence: [],
      labels: [],
      candidates: [],
      ambiguous: false,
      nextCursor: null,
      limitations: [],
      metadata: { version: "1", durationMs: 0, queries: 0, rows: 0 },
      ...extra,
    });
    await runInvestigation({
      check,
      proposer: capabilityProposer(now),
      invoke: async (tool, input) => {
        calls.push({ tool, input });
        // Two equally good matches and a weaker one.
        return tool === "resolveAnalystEntities"
          ? result(tool, {
              ambiguous: true,
              candidates: [
                { handle: food, type: "category", basis: "exact" },
                { handle: takeout, type: "category", basis: "exact" },
                {
                  handle: "category:3d6a4adc-4bc3-43f4-a55b-2238f5eec649",
                  type: "category",
                  basis: "words",
                },
              ],
            })
          : result(tool);
      },
      clock: () => 0,
    });
    const tools = calls.map((item) => item.tool);
    // Nothing is queried until the phrase has been resolved.
    expect(tools.indexOf("resolveAnalystEntities")).toBeGreaterThanOrEqual(0);
    expect(tools.indexOf("resolveAnalystEntities")).toBeLessThan(
      tools.indexOf("queryTransactions"),
    );
    expect(calls).toContainEqual({
      tool: "resolveAnalystEntities",
      input: { text: "food", types: ["category"] },
    });
    expect(calls).toContainEqual({
      tool: "queryTransactions",
      input: {
        from: "2026-09-01",
        through: "2026-09-24",
        kind: "expense",
        groupBy: "weekend",
        measures: ["total", "count"],
        categories: [food, takeout],
        minAmountPesos: null,
        maxAmountPesos: null,
      },
    });
  });
});

describe("query figures in derivations", () => {
  const period = { from: "2026-09-01", through: "2026-09-24" };
  const key = "expense_q1a2b3c4d";
  const member = (name: string, value: number, metricKey: string) =>
    metricEvidence({
      id: `q.${metricKey}.${name}`,
      metricKey,
      value,
      period,
      scope: {
        id: `cohort:${key}_by_weekend`,
        type: "cohort",
        description: "Food transactions by weekend",
        cohort: {
          setId: `${key}_by_weekend`,
          member: `day_type:${name}`,
          setSize: 2,
          setComplete: true,
        },
      },
    });
  const total = (id: string, scopeId: string, value: number) =>
    metricEvidence({
      id,
      metricKey: "expense_query_centavos",
      value,
      period,
      scope: { id: scopeId, type: "whole_domain", description: "total" },
    });
  const evidence: EvidenceV2[] = [
    member("weekend", 300_000, "expense_query_centavos"),
    member("weekday", 100_000, "expense_query_centavos"),
    // Another query's total over the same measure and period.
    total("other.total", "whole_domain:expense_qall", 5_000_000),
    total("food.total", `whole_domain:${key}`, 400_000),
    member("weekend", 50_000, "expense_query_average_centavos"),
    member("weekday", 20_000, "expense_query_average_centavos"),
  ];
  const derived = autoDerive(evidence);

  it("divides a group only by its own query's total", () => {
    const shares = derived.filter((item) =>
      item.id.startsWith("derived.share."),
    );
    expect(shares.map((item) => item.operands[1])).toEqual([
      "food.total",
      "food.total",
    ]);
    expect(shares[0]!.output).toEqual({
      status: "defined",
      value: 75,
      unit: "percent",
    });
  });

  it("ranks averages but never divides them into shares", () => {
    const ranked = derived.filter(
      (item) =>
        item.operation === "rank" &&
        item.metricKey === "expense_query_average_centavos",
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.top).toEqual(["day_type:weekend"]);
    expect(
      derived.some(
        (item) =>
          item.operation === "ratio" &&
          item.metricKey === "expense_query_average_centavos",
      ),
    ).toBe(false);
  });

  it("ships a claim that states the share with its part and total", () => {
    const share = derived.find((item) =>
      item.id.startsWith("derived.share.day_type:weekend"),
    )!;
    const checked = checkClaim(
      {
        id: "c1",
        kind: "calculation",
        text: "Weekends held 75% of your recorded food spending this month: ₱3,000.00 of ₱4,000.00.",
        answersRequirementIds: ["r_q"],
        evidenceIds: [],
        derivedFactIds: [share.id],
        assumptionIds: [],
        scopeId: share.scopeId,
        comparison: null,
        recommendation: null,
      },
      {
        brief: brief([["r_q", true]]),
        evidence: new Map(evidence.map((item) => [item.id, item])),
        derived: new Map(derived.map((item) => [item.id, item])),
        now: V2_NOW,
      },
    );
    expect(checked.verification.reasons).toEqual([]);
    expect(claimCanShip(checked)).toBe(true);
  });
});
