import { describe, expect, it } from "vitest";
import { scorePlannerCase, type PlannerEvaluationCase } from "./evaluation";
import type { PlannerPlan } from "./contracts";

const fixture: PlannerEvaluationCase = {
  id: "career-goal",
  question: "Review my career goal and current pipeline.",
  expectedOutcome: "plan",
  requiredTools: ["getGoalProgress", "getCareerPipeline"],
  allowedTools: ["getGoalProgress", "getCareerPipeline", "getSignals"],
  forbiddenTools: ["runFinancialScenario"],
  maxCalls: 3,
};

function plan(tools: PlannerPlan["calls"][number]["tool"][]): PlannerPlan {
  return {
    version: "1",
    outcome: "plan",
    clarification: null,
    unsupportedReason: null,
    missingCapabilities: [],
    calls: tools.map((tool, index) => ({
      id: `call_${index + 1}`,
      tool,
      input: {},
    })),
  };
}

describe("planner evaluation scoring", () => {
  it("scores required, forbidden, unnecessary, and outcome behavior separately", () => {
    expect(
      scorePlannerCase(fixture, plan(["getGoalProgress", "getCareerPipeline"])),
    ).toEqual({
      passed: true,
      outcome: true,
      requiredTools: true,
      forbiddenTools: true,
      retrievalEconomy: true,
    });
    expect(
      scorePlannerCase(
        fixture,
        plan(["getGoalProgress", "runFinancialScenario"]),
      ),
    ).toEqual({
      passed: false,
      outcome: true,
      requiredTools: false,
      forbiddenTools: false,
      retrievalEconomy: false,
    });
  });
});
