import { describe, expect, it } from "vitest";
import { goalPace } from "./calculations";
import { checkClaim } from "./claims";
import type { DerivedFact, EvidenceV2, Period } from "./contracts";
import { autoDerive } from "./derive";
import { V2_NOW, brief, metricEvidence } from "./evaluation/v2-fixtures";

const goal = "goal:1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const today: Period = { from: "2026-09-24", through: "2026-09-24" };
const window: Period = { from: "2026-08-28", through: "2026-09-24" };
const scope: EvidenceV2["scope"] = {
  id: goal,
  type: "entity",
  description: "The goal, its milestones and its currently linked tasks",
  entity: { type: "goal", handle: goal },
};

function count(
  metricKey: string,
  value: number,
  period: Period = today,
): EvidenceV2 {
  return {
    ...metricEvidence({ id: metricKey, metricKey, value, period, scope }),
    domain: "tasks",
  };
}
const daysLeft = (value: number) =>
  ({
    ...metricEvidence({
      id: "goal_days_to_target",
      metricKey: "goal_days_to_target",
      value,
      period: today,
      scope,
    }),
    domain: "goals",
    unit: "days",
  }) as EvidenceV2;
const tasks = (total: number, done: number, recent: number) => ({
  total: count("goal_tasks_total", total),
  done: count("goal_tasks_done", done),
  recent: count("goal_tasks_done_recent", recent, window),
});
const output = (facts: DerivedFact[], name: string) =>
  facts.find((item) => item.id.endsWith(`.${name}`))?.output;

describe("a goal's pace", () => {
  it("says when the pace would miss the target date, and by how much", () => {
    // 8 left, 1 done in four weeks: 0.25 a week, about 224 days for the rest.
    const facts = goalPace("p", {
      ...tasks(10, 2, 1),
      daysToTarget: daysLeft(30),
    });
    expect(output(facts, "remaining")).toMatchObject({ value: 8 });
    expect(output(facts, "per_week")).toMatchObject({ value: 0.3 });
    expect(output(facts, "days_needed")).toEqual({
      status: "defined",
      value: 224,
      unit: "days",
    });
    expect(output(facts, "margin_days")).toMatchObject({ value: -194 });
  });

  it("never invents a pace when nothing was done recently", () => {
    const facts = goalPace("p", {
      ...tasks(5, 1, 0),
      daysToTarget: daysLeft(30),
    });
    expect(output(facts, "per_week")).toMatchObject({ value: 0 });
    expect(output(facts, "days_needed")).toEqual({
      status: "undefined",
      reason: "zero_denominator",
    });
    expect(output(facts, "margin_days")).toBeUndefined();
  });

  it("needs no days when everything is done", () => {
    const facts = goalPace("p", {
      ...tasks(3, 3, 1),
      daysToTarget: daysLeft(12),
    });
    expect(output(facts, "days_needed")).toMatchObject({ value: 0 });
    expect(output(facts, "margin_days")).toMatchObject({ value: 12 });
  });

  it("gives no margin without a target date", () => {
    const facts = goalPace("p", { ...tasks(4, 2, 2), daysToTarget: null });
    expect(output(facts, "days_needed")).toMatchObject({ value: 28 });
    expect(output(facts, "margin_days")).toBeUndefined();
  });

  it("refuses counts that do not belong together", () => {
    const mixed = {
      ...tasks(4, 2, 1),
      done: count("goal_milestones_done", 2),
    };
    expect(() => goalPace("p", { ...mixed, daysToTarget: null })).toThrow();
    expect(() =>
      goalPace("p", { ...tasks(2, 3, 1), daysToTarget: null }),
    ).toThrow();
  });

  it("is derived from a goal's counts, and worded as an estimate", () => {
    const evidence = [...Object.values(tasks(10, 2, 1)), daysLeft(30)];
    const derived = autoDerive(evidence);
    const needed = derived.find((item) => item.id.endsWith(".days_needed"))!;
    const margin = derived.find((item) => item.id.endsWith(".margin_days"))!;
    const check = (text: string) =>
      checkClaim(
        {
          id: "c1",
          kind: "calculation",
          text,
          answersRequirementIds: ["r_goals"],
          evidenceIds: [],
          derivedFactIds: [needed.id, margin.id],
          assumptionIds: [],
          scopeId: goal,
          comparison: null,
          recommendation: null,
        },
        {
          brief: brief([["r_goals", true]]),
          evidence: new Map(evidence.map((item) => [item.id, item])),
          derived: new Map(derived.map((item) => [item.id, item])),
          now: V2_NOW,
        },
      ).verification.reasons;
    expect(
      check("The remaining tasks will take 224 days, 194 days past the date."),
    ).toContain("projection_wording");
    expect(
      check(
        "At this pace, the remaining tasks would take about 224 days, 194 days past the target date.",
      ),
    ).toEqual([]);
  });
});
