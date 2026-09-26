import { describe, expect, it } from "vitest";
import {
  compareDecisionHistory,
  decisionAlternativeQuestion,
  decisionComparisonWindow,
  decisionMetricKeys,
  decisionSchema,
} from "./decision";
import type { HistoricalMetric } from "@/lib/history/metrics";

function rows(
  from: string,
  through: string,
  firstRecordedOn = from,
): HistoricalMetric[] {
  const result: HistoricalMetric[] = [];
  const date = new Date(`${from}T12:00:00Z`);
  while (date.toISOString().slice(0, 10) <= through) {
    const day = date.toISOString().slice(0, 10);
    result.push({
      metric: "task_completions",
      period: { from: day, through: day },
      value: day < "2026-09-10" ? 1 : 2,
      sourceCount: 1,
      coverage: day < firstRecordedOn ? "insufficient" : "recorded",
      firstRecordedOn,
    });
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return result;
}

describe("decision review contract", () => {
  it("requires an explicit decision and later review date", () => {
    const input = {
      title: "Apply weekly",
      decisionOn: "2026-09-10",
      intent: "Send applications",
      expectedOutcome: "More interviews",
      rationale: "",
      assumptions: "",
      reviewOn: "2026-09-09",
      goalId: "",
      metricKey: "task_completions",
    };
    expect(decisionSchema.safeParse(input).success).toBe(false);
    expect(
      decisionSchema.safeParse({ ...input, reviewOn: "2026-10-10" }).success,
    ).toBe(true);
    expect(
      decisionSchema.safeParse({ ...input, decisionOn: "2026-02-30" }).success,
    ).toBe(false);
  });

  it("aligns equal windows across year boundaries and waits for complete follow-up", () => {
    expect(decisionComparisonWindow("2026-01-05", "2026-02-01")).toEqual({
      beforeFrom: "2025-12-22",
      beforeThrough: "2026-01-04",
      afterFrom: "2026-01-06",
      afterThrough: "2026-01-19",
    });
    expect(decisionComparisonWindow("2026-09-10", "2026-09-24")).toBeNull();
  });

  it("compares only complete recorded windows and never infers an outcome from gaps", () => {
    const window = decisionComparisonWindow("2026-09-10", "2026-09-26");
    expect(window).not.toBeNull();
    const history = rows(window!.beforeFrom, window!.afterThrough);
    const decision = {
      decision_on: "2026-09-10",
      review_on: "2026-09-24",
      metric_key: "task_completions" as const,
    };
    expect(
      compareDecisionHistory(decision, "2026-09-26", history),
    ).toMatchObject({
      before: 14,
      after: 28,
      beforeCount: 14,
      afterCount: 14,
    });
    expect(
      compareDecisionHistory(decision, "2026-09-26", history.slice(1)),
    ).toBeNull();
    expect(
      compareDecisionHistory(
        decision,
        "2026-09-26",
        rows(window!.beforeFrom, window!.afterThrough, "2026-09-01"),
      ),
    ).toBeNull();
    expect(
      compareDecisionHistory(
        { ...decision, review_on: "2026-09-27" },
        "2026-09-26",
        history,
      ),
    ).toBeNull();
  });

  it("offers alternative checks without turning a changed measure into a success claim", () => {
    for (const key of decisionMetricKeys) {
      const question = decisionAlternativeQuestion(key);
      expect(question).toMatch(/\?$/);
      expect(question).not.toMatch(/proved|succeeded|caused|because/i);
    }
    const window = decisionComparisonWindow("2026-09-10", "2026-09-26")!;
    const history = rows(window.beforeFrom, window.afterThrough);
    const comparison = compareDecisionHistory(
      {
        decision_on: "2026-09-10",
        review_on: "2026-09-24",
        metric_key: "task_completions",
      },
      "2026-09-26",
      history,
    );
    expect(comparison?.after).toBeGreaterThan(comparison!.before);
    expect(comparison).not.toHaveProperty("success");
    expect(comparison).not.toHaveProperty("causedByDecision");
  });
});
