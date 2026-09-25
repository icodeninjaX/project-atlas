import "server-only";
import { z } from "zod";
import {
  toolDescriptions,
  toolInputs,
  type ToolInput,
  type ToolName,
} from "@/lib/analyst/tools/contracts";

export const PLANNER_LIMITS = Object.freeze({
  questionChars: 500,
  providerInputChars: 18_000,
  inputTokens: 16_000,
  outputTokens: 500,
  estimatedCostUsdMicros: 3_000,
  authenticationTimeoutMs: 5_000,
  modelTimeoutMs: 12_000,
  executionTimeoutMs: 11_000,
  toolCalls: 4,
  argumentsChars: 2_000,
  planBytes: 10_000,
  providerResponseBytes: 24_000,
  evidenceItems: 80,
  evidenceBytes: 96_000,
  missingCapabilities: 6,
});

export const plannerQuestionSchema = z
  .string()
  .trim()
  .min(8)
  .max(PLANNER_LIMITS.questionChars);

const toolNames = Object.keys(toolInputs) as [ToolName, ...ToolName[]];
const providerCallSchema = z
  .object({
    id: z.string().regex(/^call_[1-9][0-9]?$/),
    tool: z.enum(toolNames),
    argumentsJson: z.string().max(PLANNER_LIMITS.argumentsChars),
  })
  .strict();

const providerPlanSchema = z
  .object({
    outcome: z.enum(["plan", "clarification", "unsupported"]),
    clarification: z.string().trim().min(1).max(300).nullable(),
    unsupportedReason: z.string().trim().min(1).max(300).nullable(),
    missingCapabilities: z
      .array(z.string().trim().min(1).max(160))
      .max(PLANNER_LIMITS.missingCapabilities),
    calls: z.array(providerCallSchema).max(PLANNER_LIMITS.toolCalls),
  })
  .strict();

const normalizedCallSchema = z
  .object({
    id: z.string().regex(/^call_[1-9][0-9]?$/),
    tool: z.enum(toolNames),
    input: z.unknown(),
  })
  .strict();

const normalizedPlanSchema = z
  .object({
    version: z.literal("1"),
    outcome: z.enum(["plan", "clarification", "unsupported"]),
    clarification: z.string().trim().min(1).max(300).nullable(),
    unsupportedReason: z.string().trim().min(1).max(300).nullable(),
    missingCapabilities: z
      .array(z.string().trim().min(1).max(160))
      .max(PLANNER_LIMITS.missingCapabilities),
    calls: z.array(normalizedCallSchema).max(PLANNER_LIMITS.toolCalls),
  })
  .strict();

export type PlannerCall<N extends ToolName = ToolName> = {
  id: string;
  tool: N;
  input: ToolInput<N>;
};

export type PlannerPlan = {
  version: "1";
  outcome: "plan" | "clarification" | "unsupported";
  clarification: string | null;
  unsupportedReason: string | null;
  missingCapabilities: string[];
  calls: PlannerCall[];
};

export type PlannerFailureCode =
  | "invalid_question"
  | "unauthenticated"
  | "configuration_error"
  | "context_limit"
  | "cost_limit"
  | "timeout"
  | "provider_auth"
  | "model_access"
  | "provider_rate_limit"
  | "provider_error"
  | "invalid_response"
  | "invalid_plan";

export type PlannerProviderStatus =
  | "not_called"
  | "success"
  | "configuration_error"
  | "context_limit"
  | "cost_limit"
  | "timeout"
  | "provider_auth"
  | "model_access"
  | "provider_rate_limit"
  | "provider_error"
  | "invalid_plan"
  | "invalid_response";

export type PlannerMetadata = {
  version: "1";
  model: string | null;
  resolvedModel: string | null;
  startedAt: string;
  durationMs: number;
  modelCalls: 0 | 1;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsdMicros: number;
  providerStatus: PlannerProviderStatus;
};

export type PlannerRequestResult =
  | { status: "planned"; plan: PlannerPlan; metadata: PlannerMetadata }
  | {
      status: "clarification_required";
      clarification: string;
      metadata: PlannerMetadata;
    }
  | {
      status: "unsupported";
      unsupportedReason: string;
      missingCapabilities: string[];
      metadata: PlannerMetadata;
    }
  | {
      status: "error";
      error: { code: PlannerFailureCode; message: string };
      metadata: PlannerMetadata;
    };

export class PlannerContractError extends Error {
  constructor(message = "Invalid planner output.") {
    super(message);
    this.name = "PlannerContractError";
  }
}

function parseToolInput(tool: ToolName, raw: unknown) {
  const schema = toolInputs[tool] as z.ZodType<unknown>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new PlannerContractError();
  return parsed.data;
}

function referencedIds(tool: ToolName, input: unknown): string[] {
  if (!input || typeof input !== "object") return [];
  const value = input as Record<string, unknown>;
  if (tool === "getRelatedEntities" && typeof value.entityId === "string")
    return [value.entityId];
  if (tool === "getGoalLinkedActivity" && typeof value.goalId === "string")
    return [value.goalId];
  if (
    (tool === "getMoneySummary" || tool === "getDebtPayments") &&
    typeof value.categoryId === "string"
  )
    return [value.categoryId];
  if (tool === "getDebtPayments" && typeof value.debtId === "string")
    return [value.debtId];
  if (tool === "runFinancialScenario") {
    const payment = value.extraDebtPayment;
    if (
      payment &&
      typeof payment === "object" &&
      "debtId" in payment &&
      typeof payment.debtId === "string"
    )
      return [payment.debtId];
  }
  return [];
}

function validateOutcome(plan: PlannerPlan) {
  const uniqueIds = new Set(plan.calls.map((call) => call.id));
  if (uniqueIds.size !== plan.calls.length) throw new PlannerContractError();
  if (plan.calls.some((call, index) => call.id !== `call_${index + 1}`))
    throw new PlannerContractError();
  if (plan.outcome === "plan") {
    if (
      plan.calls.length === 0 ||
      plan.clarification !== null ||
      plan.unsupportedReason !== null
    )
      throw new PlannerContractError();
  } else if (plan.outcome === "clarification") {
    if (
      !plan.clarification ||
      plan.unsupportedReason !== null ||
      plan.calls.length > 0
    )
      throw new PlannerContractError();
  } else if (
    !plan.unsupportedReason ||
    plan.clarification !== null ||
    plan.calls.length > 0
  ) {
    throw new PlannerContractError();
  }
}

function statedPesoAmounts(question: string) {
  return new Set(
    [...question.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)].flatMap((match) => {
      const amount = Number(match[0].replaceAll(",", ""));
      return Number.isFinite(amount) ? [Math.round(amount * 100)] : [];
    }),
  );
}

function scenarioIsGrounded(input: unknown, question: string) {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  const stated = statedPesoAmounts(question);
  const amounts = [
    value.monthlyIncomeCentavos,
    Math.abs(Number(value.monthlyExpenseChangeCentavos ?? 0)),
    value.oneTimePurchaseCentavos,
  ];
  const payment = value.extraDebtPayment;
  if (payment && typeof payment === "object" && "amountCentavos" in payment)
    amounts.push(payment.amountCentavos);
  if (
    amounts.some(
      (amount) =>
        typeof amount === "number" && amount !== 0 && !stated.has(amount),
    )
  )
    return false;
  const months = value.targetMonths;
  return (
    typeof months === "number" &&
    new RegExp(`(?:^|\\D)${months}(?:\\D|$)`).test(question)
  );
}

function normalizeCalls(
  calls: Array<{ id: string; tool: ToolName; rawInput: unknown }>,
  question?: string,
) {
  const normalized: PlannerCall[] = calls.map((call) => ({
    id: call.id,
    tool: call.tool,
    input: parseToolInput(call.tool, call.rawInput) as never,
  }));
  const signatures = normalized.map((call) =>
    JSON.stringify([call.tool, call.input]),
  );
  if (new Set(signatures).size !== signatures.length)
    throw new PlannerContractError("Duplicate retrieval is not allowed.");
  if (question) {
    const lowerQuestion = question.toLowerCase();
    if (
      normalized.some((call) =>
        referencedIds(call.tool, call.input).some(
          (id) => !lowerQuestion.includes(id.toLowerCase()),
        ),
      )
    )
      throw new PlannerContractError(
        "Clarification is required for an unresolved entity reference.",
      );
    if (
      normalized.some(
        (call) =>
          call.tool === "runFinancialScenario" &&
          !scenarioIsGrounded(call.input, question),
      )
    )
      throw new PlannerContractError(
        "Clarification is required for unstated scenario assumptions.",
      );
  }
  return normalized;
}

export function validatePlannerOutput(
  raw: unknown,
  rawQuestion: string,
): PlannerPlan {
  const question = plannerQuestionSchema.parse(rawQuestion);
  if (Buffer.byteLength(JSON.stringify(raw)) > PLANNER_LIMITS.planBytes)
    throw new PlannerContractError();
  const parsed = providerPlanSchema.safeParse(raw);
  if (!parsed.success) throw new PlannerContractError();
  const calls = normalizeCalls(
    parsed.data.calls.map((call) => {
      let rawInput: unknown;
      try {
        rawInput = JSON.parse(call.argumentsJson);
      } catch {
        throw new PlannerContractError();
      }
      return { id: call.id, tool: call.tool, rawInput };
    }),
    question,
  );
  const plan: PlannerPlan = { version: "1", ...parsed.data, calls };
  validateOutcome(plan);
  return plan;
}

/** Revalidate even server-created plans at the execution boundary. */
export function validateExecutablePlan(raw: unknown): PlannerPlan {
  const parsed = normalizedPlanSchema.safeParse(raw);
  if (!parsed.success) throw new PlannerContractError();
  const calls = normalizeCalls(
    parsed.data.calls.map((call) => ({
      id: call.id,
      tool: call.tool,
      rawInput: call.input,
    })),
  );
  const plan: PlannerPlan = { ...parsed.data, calls };
  validateOutcome(plan);
  return plan;
}

export function plannerToolCatalog() {
  return toolNames.map((name) => ({
    name,
    description: toolDescriptions[name],
    inputSchema: z.toJSONSchema(toolInputs[name], { unrepresentable: "any" }),
  }));
}

export function plannerResponseJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "outcome",
      "clarification",
      "unsupportedReason",
      "missingCapabilities",
      "calls",
    ],
    properties: {
      outcome: {
        type: "string",
        enum: ["plan", "clarification", "unsupported"],
      },
      clarification: { type: ["string", "null"], maxLength: 300 },
      unsupportedReason: { type: ["string", "null"], maxLength: 300 },
      missingCapabilities: {
        type: "array",
        maxItems: PLANNER_LIMITS.missingCapabilities,
        items: { type: "string", maxLength: 160 },
      },
      calls: {
        type: "array",
        maxItems: PLANNER_LIMITS.toolCalls,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "tool", "argumentsJson"],
          properties: {
            id: { type: "string", pattern: "^call_[1-9][0-9]?$" },
            tool: { type: "string", enum: toolNames },
            argumentsJson: {
              type: "string",
              maxLength: PLANNER_LIMITS.argumentsChars,
            },
          },
        },
      },
    },
  } as const;
}
