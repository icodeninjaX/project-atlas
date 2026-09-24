import type { ToolName } from "@/lib/analyst/tools/contracts";
import type { PlannerPlan } from "./contracts";

export type PlannerEvaluationCase = {
  id: string;
  question: string;
  expectedOutcome: PlannerPlan["outcome"];
  requiredTools: ToolName[];
  allowedTools: ToolName[];
  forbiddenTools: ToolName[];
  maxCalls: number;
};

export type PlannerEvaluationScore = {
  passed: boolean;
  outcome: boolean;
  requiredTools: boolean;
  forbiddenTools: boolean;
  retrievalEconomy: boolean;
};

/** Pure scoring keeps the synthetic evaluation corpus provider-independent. */
export function scorePlannerCase(
  fixture: PlannerEvaluationCase,
  plan: PlannerPlan,
): PlannerEvaluationScore {
  const selected = new Set(plan.calls.map((call) => call.tool));
  const outcome = plan.outcome === fixture.expectedOutcome;
  const requiredTools = fixture.requiredTools.every((tool) =>
    selected.has(tool),
  );
  const forbiddenTools = fixture.forbiddenTools.every(
    (tool) => !selected.has(tool),
  );
  const retrievalEconomy =
    plan.calls.length <= fixture.maxCalls &&
    plan.calls.every((call) => fixture.allowedTools.includes(call.tool));
  return {
    passed: outcome && requiredTools && forbiddenTools && retrievalEconomy,
    outcome,
    requiredTools,
    forbiddenTools,
    retrievalEconomy,
  };
}
