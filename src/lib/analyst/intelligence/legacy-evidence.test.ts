import { describe, expect, it } from "vitest";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import {
  adaptLegacyCall,
  fixedLabelDomain,
  localEvidenceId,
} from "./legacy-evidence";
import { legacySpendingV2, SPENDING_IDS } from "./evaluation/v2-fixtures";

const item = (
  tool: ToolEvidence["provenance"]["tool"],
  local: string,
  overrides: Partial<ToolEvidence> = {},
): ToolEvidence => ({
  id: `${tool}.${local}.0123456789abcdef`,
  metric: "Synthetic",
  value: 1000,
  unit: "centavos",
  period: { from: "2026-09-01", through: "2026-09-24" },
  comparisonBasis: "Synthetic",
  source: {
    description: "Synthetic",
    recordIds: ["r1"],
    href: "/money/transactions",
  },
  completeness: "complete",
  claimType: "FACT",
  provenance: {
    tool,
    calculationVersion: "1",
    retrievedAt: "2026-09-24T04:00:00.000Z",
    textTrust: "untrusted_data",
  },
  ...overrides,
});

describe("legacy evidence adapter", () => {
  it("strips the tool prefix and digest from evidence IDs", () => {
    expect(
      localEvidenceId(
        "getMoneySummary",
        "getMoneySummary.total.0123456789abcdef",
      ),
    ).toBe("total");
    expect(localEvidenceId("getMoneySummary", "other")).toBe("other");
  });

  it("maps spending evidence to registered measures and an incomplete category set", () => {
    const adapted = legacySpendingV2();
    const byId = new Map(adapted.map((e) => [e.id, e]));
    expect(byId.get(SPENDING_IDS.current)?.semantics).toMatchObject({
      metricKey: "expense_centavos",
      comparableGroup: "money_flow",
      currency: "PHP",
    });
    expect(byId.get(SPENDING_IDS.change)?.semantics.metricKey).toBe(
      "expense_change_centavos",
    );
    const categories = adapted.filter((e) => e.scope.cohort);
    expect(categories).toHaveLength(5);
    expect(categories.every((e) => e.scope.cohort!.setComplete === false)).toBe(
      true,
    );
    // Stored records never prove complete real-world recording.
    expect(byId.get(SPENDING_IDS.current)?.coverage).toMatchObject({
      query: "complete",
      recording: "unknown",
    });
  });

  it("uses the tool input for kind, category and goal scope", () => {
    const [income] = adaptLegacyCall({
      tool: "getMoneySummary",
      input: {
        from: "2026-09-01",
        through: "2026-09-24",
        kind: "income",
        categoryId: "cat-1",
      },
      evidence: [item("getMoneySummary", "total")],
    });
    expect(income?.semantics.metricKey).toBe("income_centavos");
    expect(income?.scope).toMatchObject({
      id: "category:cat-1",
      type: "entity",
    });
    const goal = adaptLegacyCall({
      tool: "getGoalLinkedActivity",
      input: { goalId: "goal-1", from: "2026-09-01", through: "2026-09-24" },
      evidence: [
        item("getGoalLinkedActivity", "task.t1", { value: 1, unit: "count" }),
        item("getGoalLinkedActivity", "link.l1", {
          value: "task_goal",
          unit: "relationship",
        }),
      ],
    });
    expect(
      goal.map((e) => [
        e.kind,
        e.semantics.metricKey,
        e.scope.id,
        e.coverage.relationship,
      ]),
    ).toEqual([
      ["metric", "goal_linked_task_completion", "goal:goal-1", "current_only"],
      ["record_fact", "relationship", "goal:goal-1", "current_only"],
    ]);
  });

  it("marks scenarios as assumption-based and isolates unknown measures", () => {
    const [option] = adaptLegacyCall({
      tool: "compareFinancialScenarios",
      input: {},
      evidence: [
        item("compareFinancialScenarios", "Option 1.runwayMonths", {
          value: 6,
          unit: "months",
          claimType: "SCENARIO",
        }),
      ],
    });
    expect(option).toMatchObject({
      kind: "scenario_output",
      scope: { id: "scenario" },
    });
    expect(option?.time.basis).toBe("assumption");
    const [focus] = adaptLegacyCall({
      tool: "getTaskFocus",
      input: {},
      evidence: [
        item("getTaskFocus", "tasks.open", { value: 4, unit: "count" }),
      ],
    });
    expect(focus?.semantics.metricKey).toBe("legacy:getTaskFocus:tasks.open");
    expect(focus?.semantics.comparableGroup).toBe(
      "legacy:getTaskFocus:tasks.open",
    );
    expect(
      adaptLegacyCall({
        tool: "getTaskFocus",
        input: {},
        evidence: [
          item("getTaskFocus", "tasks.partial", { completeness: "partial" }),
        ],
      })[0]?.coverage.query,
    ).toBe("partial");
  });

  it("reads fewer than twelve reviews as every review, not missing records", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, index) => `w${index}`);
    const review = (local: string, value: number, recordIds: string[]) =>
      item("getWeeklyReviewMetrics", local, {
        value,
        unit: local === "reviews.count" ? "count" : "score",
        source: { description: "Synthetic", recordIds, href: "/reviews" },
        // The tool's sample-size note marks every value partial.
        completeness: "partial",
      });
    const query = (evidence: ToolEvidence[]) =>
      adaptLegacyCall({
        tool: "getWeeklyReviewMetrics",
        input: {},
        evidence,
      }).map((entry) => entry.coverage.query);
    expect(
      query([
        review("reviews.count", 7, ids(7)),
        review("reviews.overall_score", 6.6, ids(7)),
        review("reviews.overall_change", 1.3, ids(7)),
      ]),
    ).toEqual(["complete", "complete", "complete"]);
    // A review without an overall score leaves its average and change partial.
    expect(
      query([
        review("reviews.count", 7, ids(7)),
        review("reviews.energy_score", 5, ids(7)),
        review("reviews.overall_score", 6.6, ids(6)),
        review("reviews.overall_change", 1.3, ids(7)),
      ]),
    ).toEqual(["complete", "complete", "partial", "partial"]);
    expect(
      fixedLabelDomain("legacy:getWeeklyReviewMetrics:reviews.count"),
    ).toBe("review");
    expect(fixedLabelDomain("expense_centavos")).toBeNull();
  });
});
