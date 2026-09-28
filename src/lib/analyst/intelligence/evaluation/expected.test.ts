import { describe, expect, it } from "vitest";
import {
  EXPECTED_FACTS,
  boundedPaths,
  percentChange,
  rankTotals,
  sumCentavos,
} from "./expected";
import { OWNER_A, OWNER_B, ownerDataset } from "./fixtures";

const value = (key: string) => EXPECTED_FACTS[key]!.value;

describe("expected Analyst facts", () => {
  it("align the comparison to the same elapsed Manila days", () => {
    expect(value("period.current")).toEqual({
      from: "2026-09-01",
      through: "2026-09-24",
    });
    expect(value("period.previous")).toEqual({
      from: "2026-08-01",
      through: "2026-08-24",
    });
    expect(value("expense.current")).toBe(1_100_000);
    expect(value("expense.previous_aligned")).toBe(910_000);
    // The full previous month includes a late-August row the aligned period excludes.
    expect(value("expense.previous_full_month")).toBe(1_909_900);
    expect(value("expense.change")).toBe(190_000);
    expect(value("expense.change_percent")).toEqual({
      status: "defined",
      tenths: 209,
    });
  });

  it("decompose the change completely, reconcile it and report ties", () => {
    const contributions = value("expense.contributions") as Array<{
      key: string;
      change: number;
    }>;
    expect(contributions.map((item) => [item.key, item.change])).toEqual([
      ["cat-a-dining", 100_000],
      ["cat-a-entertainment", -50_000],
      ["cat-a-groceries", 100_000],
      ["cat-a-health", 45_000],
      ["cat-a-transport", 0],
      ["cat-a-utilities", -20_000],
      ["uncategorized", 15_000],
    ]);
    expect(value("expense.contributions_reconcile")).toBe(true);
    expect(value("expense.largest_increase")).toEqual({
      top: ["cat-a-dining", "cat-a-groceries"],
      tie: true,
    });
  });

  it("treat a zero baseline as an undefined percentage", () => {
    expect(value("expense.health_percent_change")).toEqual({
      status: "undefined",
      reason: "zero_baseline",
    });
    expect(percentChange(0, 0)).toEqual({
      status: "undefined",
      reason: "zero_baseline",
    });
    expect(percentChange(50, 100)).toEqual({ status: "defined", tenths: -500 });
  });

  it("rank the full large month, which a one-page sample gets wrong", () => {
    expect(value("bulk.row_count")).toBe(1_501);
    expect(value("bulk.largest_category")).toEqual({
      top: ["cat-a-groceries"],
      tie: false,
    });
    expect(value("bulk.sampled_largest_category")).toEqual(["cat-a-transport"]);
    expect(value("bulk.expense_total")).toBe(500 * 20_000 + 1_001 * 15_000);
  });

  it("separate income, transfers, refunds, budgets and debt payments", () => {
    expect(value("income.current")).toBe(5_150_000);
    expect(value("income.transfers_excluded")).toBe(1_000_000);
    expect(value("income.refund_recorded_as_income")).toBe(150_000);
    expect(value("budget.dining_over")).toBe(30_000);
    expect(value("debt.payments_current")).toBe(500_000);
    expect(value("expense.owner_b_current")).toBe(0);
  });

  it("split goal-linked task completions from all completions", () => {
    expect(value("goal.career_activity")).toEqual({
      completedAll: 5,
      completedLinked: 2,
      completedUnlinked: 3,
      linkedIds: ["task-a-resume", "task-a-site"],
      openLinked: ["task-a-interview"],
      milestonesCompleted: 1,
    });
    expect(value("goal.career_activity_previous")).toMatchObject({
      completedAll: 1,
      completedLinked: 1,
    });
  });

  it("keep identical goal titles isolated by owner", () => {
    expect(value("goal.owner_a_title_matches")).toEqual(["goal-a-career"]);
    expect(value("goal.owner_b_title_matches")).toEqual(["goal-b-career"]);
    expect(EXPECTED_FACTS["goal.owner_b_title_matches"]!.owner).toBe(OWNER_B);
  });

  it("trace a bounded two-hop path and cut the cycle", () => {
    expect(value("graph.career_two_hop")).toMatchObject({
      reachesDecision: true,
      cycleCut: true,
    });
    const a = ownerDataset("rich", OWNER_A);
    // Another owner's start node has no reachable records.
    expect(boundedPaths(a.edges, OWNER_B, "goal-a-career", 2).paths).toEqual(
      [],
    );
    expect(
      boundedPaths(a.edges, OWNER_A, "goal-a-career", 2, 3).truncated,
    ).toBe(true);
  });

  it("keep the original decision plan beside its revision", () => {
    expect(value("decision.original_plan")).toMatch(/two free evenings/);
    expect(value("decision.latest_plan")).toMatch(/three free evenings/);
    expect(value("decision.review_window_open")).toBe(true);
    expect(value("decision.unavailable_sources")).toEqual(["obs-a-deleted"]);
  });

  it("rank with explicit ties and refuse unsafe arithmetic", () => {
    expect(
      rankTotals([
        { key: "b", value: 2 },
        { key: "a", value: 2 },
        { key: "c", value: 1 },
      ]),
    ).toMatchObject({
      top: ["a", "b"],
      tie: true,
    });
    expect(() => sumCentavos([1.5])).toThrow(RangeError);
    expect(() => sumCentavos([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
  });
});
