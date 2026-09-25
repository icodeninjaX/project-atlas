import { describe, expect, it } from "vitest";
import {
  PLANNER_LIMITS,
  plannerResponseJsonSchema,
  validatePlannerOutput,
} from "./contracts";

const goalId = "11111111-1111-4111-8111-111111111111";

function output(overrides: Record<string, unknown> = {}) {
  return {
    outcome: "plan",
    clarification: null,
    unsupportedReason: null,
    missingCapabilities: [],
    calls: [
      {
        id: "call_1",
        tool: "getGoalProgress",
        argumentsJson: "{}",
      },
    ],
    ...overrides,
  };
}

describe("Analyst planner contract", () => {
  it("publishes a strict allowlisted provider schema", () => {
    const schema = plannerResponseJsonSchema();
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.calls.maxItems).toBe(PLANNER_LIMITS.toolCalls);
    expect(schema.properties.calls.items.properties.tool.enum).toContain(
      "getGoalProgress",
    );
    expect(schema.properties.calls.items.properties.tool.enum).not.toContain(
      "executeSQL",
    );
  });

  it("normalizes valid arguments through the Phase 9 schemas", () => {
    const plan = validatePlannerOutput(
      output({
        calls: [
          {
            id: "call_1",
            tool: "getRelatedEntities",
            argumentsJson: JSON.stringify({
              entityType: "goal",
              entityId: goalId,
            }),
          },
        ],
      }),
      `What is related to goal ${goalId}?`,
    );
    expect(plan).toMatchObject({
      outcome: "plan",
      calls: [
        {
          tool: "getRelatedEntities",
          input: { entityType: "goal", entityId: goalId, limit: 20 },
        },
      ],
    });
  });

  it.each([
    [
      "unknown tool",
      { calls: [{ id: "call_1", tool: "executeSQL", argumentsJson: "{}" }] },
    ],
    [
      "owner injection",
      {
        calls: [
          {
            id: "call_1",
            tool: "getGoalProgress",
            argumentsJson: '{"ownerId":"other"}',
          },
        ],
      },
    ],
    [
      "invalid JSON",
      {
        calls: [
          { id: "call_1", tool: "getGoalProgress", argumentsJson: "not-json" },
        ],
      },
    ],
    [
      "duplicate calls",
      {
        calls: [
          { id: "call_1", tool: "getGoalProgress", argumentsJson: "{}" },
          { id: "call_2", tool: "getGoalProgress", argumentsJson: "{}" },
        ],
      },
    ],
    [
      "too many calls",
      {
        calls: Array.from(
          { length: PLANNER_LIMITS.toolCalls + 1 },
          (_, index) => ({
            id: `call_${index + 1}`,
            tool: index % 2 ? "getGoalProgress" : "getCareerPipeline",
            argumentsJson: "{}",
          }),
        ),
      },
    ],
  ])("rejects %s", (_, overrides) => {
    expect(() =>
      validatePlannerOutput(output(overrides), "Review my goals"),
    ).toThrow();
  });

  it("requires clarification instead of accepting an invented entity ID", () => {
    expect(() =>
      validatePlannerOutput(
        output({
          calls: [
            {
              id: "call_1",
              tool: "getRelatedEntities",
              argumentsJson: JSON.stringify({
                entityType: "goal",
                entityId: goalId,
              }),
            },
          ],
        }),
        "What is blocking my developer-job goal?",
      ),
    ).toThrow(/clarification/i);
  });
  it("accepts bounded cross-domain months and rejects an invented goal ID", () => {
    const history = validatePlannerOutput(
      output({
        calls: [
          {
            id: "call_1",
            tool: "getCrossDomainHistory",
            argumentsJson: JSON.stringify({
              from: "2026-05-01",
              through: "2026-06-30",
              metrics: ["income_centavos", "task_completions"],
            }),
          },
        ],
      }),
      "Compare my income and task completions in May and June 2026.",
    );
    expect(history.calls[0]?.tool).toBe("getCrossDomainHistory");
    expect(() =>
      validatePlannerOutput(
        output({
          calls: [
            {
              id: "call_1",
              tool: "getGoalLinkedActivity",
              argumentsJson: JSON.stringify({
                goalId,
                from: "2026-05-01",
                through: "2026-06-30",
              }),
            },
          ],
        }),
        "What happened around my goal in May and June?",
      ),
    ).toThrow(/clarification/i);
  });

  it("keeps clarification and unsupported outcomes non-executable", () => {
    const clarification = validatePlannerOutput(
      output({
        outcome: "clarification",
        clarification: "Which goal do you mean?",
        calls: [],
      }),
      "What is blocking my goal?",
    );
    expect(clarification.outcome).toBe("clarification");
    const unsupported = validatePlannerOutput(
      output({
        outcome: "unsupported",
        unsupportedReason: "Sleep records are not available.",
        calls: [],
      }),
      "How did I sleep?",
    );
    expect(unsupported.outcome).toBe("unsupported");
  });

  it("rejects invented scenario assumptions but accepts explicitly stated ones", () => {
    const scenario = output({
      calls: [
        {
          id: "call_1",
          tool: "runFinancialScenario",
          argumentsJson: JSON.stringify({
            monthlyIncomeCentavos: 500_000,
            monthlyExpenseChangeCentavos: -100_000,
            oneTimePurchaseCentavos: 0,
            extraDebtPayment: null,
            targetMonths: 6,
          }),
        },
      ],
    });
    expect(() =>
      validatePlannerOutput(scenario, "Can I improve my runway?"),
    ).toThrow(/scenario assumptions/i);
    expect(
      validatePlannerOutput(
        scenario,
        "With monthly income of 5,000, expenses reduced by 1,000, and no purchase, can I reach 6 months?",
      ).calls[0]?.tool,
    ).toBe("runFinancialScenario");
  });
});
