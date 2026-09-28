import { describe, expect, it } from "vitest";
import {
  CalculationError,
  contribution,
  difference,
  percentChange,
  rank,
  ratio,
  share,
  sum,
} from "./calculations";
import { EXPECTED_FACTS } from "./evaluation/expected";
import { OWNER_A, PERIODS, ownerDataset } from "./evaluation/fixtures";
import {
  categoryBreakdown,
  legacySpendingV2,
  metricEvidence,
  sampledBreakdown,
  wholeExpenseTotal,
} from "./evaluation/v2-fixtures";

const current = PERIODS.currentMonthToDate;
const previous = PERIODS.previousAligned;
const member = (items: ReturnType<typeof categoryBreakdown>, key: string) =>
  items.find((item) => item.scope.cohort?.member === key)!;

describe("Analyst V2 derived facts", () => {
  it("decomposes the change completely, reconciles it and reports the tie", () => {
    const fact = contribution("contrib", {
      totalCurrent: wholeExpenseTotal("total.current", current),
      totalPrevious: wholeExpenseTotal("total.previous", previous),
      current: categoryBreakdown("current", current),
      previous: categoryBreakdown("previous", previous),
    });
    expect(fact.output).toEqual({
      status: "defined",
      value: 190_000,
      unit: "centavos",
    });
    expect(fact.reconciled).toBe(true);
    expect(fact.ranking).toHaveLength(7);
    expect({ top: fact.top, tie: fact.tie }).toEqual(
      EXPECTED_FACTS["expense.largest_increase"]!.value,
    );
    expect(
      fact.ranking!.find((item) => item.member === "uncategorized")?.value,
    ).toBe(15_000);
  });

  it("ranks a complete set with ties and refuses an incomplete one", () => {
    const bulk = ownerDataset("bulk", OWNER_A);
    const full = rank("rank.full", categoryBreakdown("bulk", current, bulk));
    expect(full.top).toEqual(
      (EXPECTED_FACTS["bulk.largest_category"]!.value as { top: string[] }).top,
    );
    expect(full.tie).toBe(false);
    const sampled = rank("rank.sampled", sampledBreakdown());
    expect(sampled.output).toEqual({
      status: "undefined",
      reason: "incomplete_set",
    });
    expect(sampled.top).toBeNull();
    // The legacy top-five category slice is never a complete set.
    const legacyCategories = legacySpendingV2().filter(
      (item) => item.scope.cohort,
    );
    expect(rank("rank.legacy", legacyCategories).output.status).toBe(
      "undefined",
    );
  });

  it("treats a zero baseline as an undefined percent change", () => {
    const now = member(categoryBreakdown("current", current), "cat-a-health");
    const before = member(
      categoryBreakdown("previous", previous),
      "cat-a-health",
    );
    expect(percentChange("pct", now, before).output).toEqual({
      status: "undefined",
      reason: "zero_denominator",
    });
    expect(ratio("ratio", now, before).output.status).toBe("undefined");
    const total = percentChange(
      "total.pct",
      wholeExpenseTotal("a", current),
      wholeExpenseTotal("b", previous),
    );
    expect(total.output).toEqual({
      status: "defined",
      value: 20.9,
      unit: "percent",
    });
  });

  it("differences only comparable measures in one scope", () => {
    const scope = {
      id: "whole_domain:activity",
      type: "whole_domain" as const,
      description: "Activity",
    };
    const tasks = metricEvidence({
      id: "tasks",
      metricKey: "task_completions",
      value: 5,
      period: current,
      scope,
    });
    const reviews = metricEvidence({
      id: "reviews",
      metricKey: "knowledge_reviews",
      value: 6,
      period: current,
      scope,
    });
    expect(() => difference("d", tasks, reviews)).toThrow(CalculationError);
    const income = metricEvidence({
      id: "income",
      metricKey: "income_centavos",
      value: 5_150_000,
      period: current,
      scope: {
        id: "whole_domain:money",
        type: "whole_domain",
        description: "Money",
      },
    });
    const expense = {
      ...wholeExpenseTotal("expense", current),
      scope: income.scope,
    };
    expect(difference("net", income, expense).output).toEqual({
      status: "defined",
      value: 4_050_000,
      unit: "centavos",
    });
    // Different measures over different periods cannot be combined.
    const lastMonthExpense = {
      ...wholeExpenseTotal("old", previous),
      scope: income.scope,
    };
    expect(() => difference("bad", income, lastMonthExpense)).toThrow(
      CalculationError,
    );
  });

  it("keeps centavo arithmetic exact and bounded", () => {
    const scope = {
      id: "whole_domain:expense",
      type: "whole_domain" as const,
      description: "Expense",
    };
    const huge = metricEvidence({
      id: "a",
      metricKey: "expense_centavos",
      value: Number.MAX_SAFE_INTEGER,
      period: current,
      scope,
    });
    const negative = metricEvidence({
      id: "b",
      metricKey: "expense_centavos",
      value: -10,
      period: previous,
      scope,
    });
    expect(() => difference("overflow", huge, negative)).toThrow(
      CalculationError,
    );
  });

  it("totals a set only when every member is present", () => {
    const members = categoryBreakdown("current", current);
    expect(sum("all", members).output).toEqual({
      status: "defined",
      value: 1_100_000,
      unit: "centavos",
    });
    expect(sum("some", members.slice(1)).output).toEqual({
      status: "undefined",
      reason: "incomplete_set",
    });
    expect(() => sum("dupe", [members[0]!, members[0]!])).toThrow(
      CalculationError,
    );
  });

  it("gives a member's share of its total and refuses a mismatched total", () => {
    const members = categoryBreakdown("current", current);
    const total = wholeExpenseTotal("total.current", current);
    const top = [...members].sort((a, b) =>
      a.kind === "metric" && b.kind === "metric" ? b.value - a.value : 0,
    )[0]!;
    const fact = share("share.top", top, total);
    const part = top.kind === "metric" ? top.value : 0;
    const whole = total.kind === "metric" ? total.value : 0;
    expect(fact.operation).toBe("ratio");
    expect(fact.scopeId).toBe(top.scope.id);
    expect(fact.operands).toEqual([top.id, total.id]);
    expect(fact.output).toEqual({
      status: "defined",
      value: Math.round((part / whole) * 1000) / 10,
      unit: "percent",
    });
    // A total over another period is not this member's total.
    expect(() =>
      share("share.bad", top, wholeExpenseTotal("total.previous", previous)),
    ).toThrow(CalculationError);
    // A total is not a set member.
    expect(() => share("share.bad", total, total)).toThrow(CalculationError);
  });
});
