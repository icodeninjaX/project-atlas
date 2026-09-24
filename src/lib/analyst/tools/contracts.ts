import { z } from "zod";
import { graphEntityTypes } from "@/lib/graph/registry";
import { timelineModules, validTimelineDate } from "@/lib/timeline/timeline";
import type { Evidence } from "@/lib/analyst/evidence";
import {
  historicalBucketCount,
  metricDefinitions,
} from "@/lib/history/metrics";

export const TOOL_LIMITS = Object.freeze({
  queries: 24,
  rows: 4000,
  rowsPerQuery: 500,
  responseBytes: 1_000_000,
  timeoutMs: 10_000,
  evidence: 40,
  outputBytes: 48_000,
});

export type ToolFailureCode =
  | "invalid_input"
  | "unauthenticated"
  | "unavailable_source"
  | "setup_error"
  | "timeout"
  | "partial"
  | "insufficient_history"
  | "stale_data"
  | "invalid_output"
  | "budget_exceeded";

export class ToolFailure extends Error {
  constructor(
    public readonly code: ToolFailureCode,
    message: string = code,
  ) {
    super(message);
    this.name = "ToolFailure";
  }
}

const empty = z.object({}).strict();
const day = z.string().refine((value) => validTimelineDate(value) !== null);
const periodShape = { from: day, through: day };
const boundedPeriod = (value: { from: string; through: string }) => {
  const days =
    (Date.parse(value.through) - Date.parse(value.from)) / 86_400_000;
  return days >= 0 && days < 366;
};
const centavos = z.number().int().min(0).max(1_000_000_000_000);
const scenario = z
  .object({
    monthlyIncomeCentavos: centavos.nullable(),
    monthlyExpenseChangeCentavos: z
      .number()
      .int()
      .min(-1_000_000_000_000)
      .max(1_000_000_000_000),
    oneTimePurchaseCentavos: centavos,
    extraDebtPayment: z
      .object({ debtId: z.uuid(), amountCentavos: centavos })
      .strict()
      .nullable(),
    targetMonths: z.number().int().min(1).max(24),
  })
  .strict();

/** No owner, SQL, arbitrary table, prompt, or mutation arguments are accepted. */
export const toolInputs = {
  getSpendingChange: empty,
  getDebtProgress: empty,
  getTaskFocus: empty,
  getGoalProgress: empty,
  getCareerPipeline: empty,
  getWeeklyReviewMetrics: empty,
  getSignals: empty,
  getMoneySummary: z
    .object({
      ...periodShape,
      kind: z.enum(["expense", "income"]),
      categoryId: z.uuid().optional(),
    })
    .strict()
    .refine(boundedPeriod, "Use an ordered period of at most 366 days."),
  getDebtPayments: z
    .object({ ...periodShape, debtId: z.uuid().optional() })
    .strict()
    .refine(boundedPeriod),
  getHistoricalMetricSeries: z
    .object({
      ...periodShape,
      metric: z.enum(
        Object.keys(metricDefinitions) as [
          keyof typeof metricDefinitions,
          ...(keyof typeof metricDefinitions)[],
        ],
      ),
      grain: z.enum(["day", "week", "month"]),
    })
    .strict()
    .refine((value) => {
      if (!boundedPeriod(value)) return false;
      return (
        historicalBucketCount(value.from, value.through, value.grain) <= 12
      );
    }, "Use at most twelve calendar periods within a year."),
  getRelatedEntities: z
    .object({
      entityType: z.enum(graphEntityTypes),
      entityId: z.uuid(),
      limit: z.number().int().min(1).max(20).default(20),
    })
    .strict(),
  getTimelineEvents: z
    .object({ ...periodShape, module: z.enum(timelineModules).optional() })
    .strict()
    .refine(boundedPeriod),
  getRunway: empty,
  runFinancialScenario: scenario,
} as const;
export type ToolName = keyof typeof toolInputs;
export type ToolInput<N extends ToolName> = z.infer<(typeof toolInputs)[N]>;

export type ToolEvidence = Omit<Evidence, "unit"> & {
  unit: Evidence["unit"] | "months" | "event" | "relationship";
  claimType: "FACT" | "TREND" | "SCENARIO" | "RECOMMENDATION";
  provenance: {
    tool: ToolName;
    calculationVersion: "1";
    retrievedAt: string;
    textTrust: "untrusted_data";
  };
  relationship?: {
    source: { type: string; id: string };
    target: { type: string; id: string };
    origin: "native" | "manual";
  };
};

export type ToolPayload = {
  status: "ready" | "partial" | "insufficient";
  evidence: ToolEvidence[];
  limitations: string[];
};

export type ToolResult = Omit<ToolPayload, "status"> & {
  tool: ToolName | null;
  status: ToolPayload["status"] | "error";
  error?: { code: ToolFailureCode; message: string };
  metadata: {
    version: "1";
    startedAt: string;
    durationMs: number;
    queries: number;
    rows: number;
    evidenceCount: number;
    modelCalls: 0;
    tokens: 0;
    estimatedCost: 0;
  };
};

export const toolDescriptions: Record<ToolName, string> = {
  getSpendingChange:
    "Compare this month's recorded expenses with the existing Analyst comparison period.",
  getDebtProgress:
    "Current debt balances and reduction from original principal; no balance history.",
  getTaskFocus:
    "Current open-task counts and existing priority/date focus ranking.",
  getGoalProgress:
    "Current active-goal and milestone progress; no historical reconstruction.",
  getCareerPipeline:
    "Current career stage counts and overdue follow-ups; not conversion rates.",
  getWeeklyReviewMetrics:
    "Numeric scores from at most twelve latest completed reviews.",
  getSignals:
    "Current deterministic Signals; private titles and notes are excluded.",
  getMoneySummary:
    "Recorded income or expense sum for an explicit Manila date period; excludes transfers.",
  getDebtPayments:
    "Recorded debt payments for an explicit Manila date period; not historical balances.",
  getHistoricalMetricSeries:
    "Versioned whole-domain historical series. Metric must be one of income_centavos, expense_centavos, debt_payments_centavos, task_completions, knowledge_reviews, review_overall_score. Supply inclusive from/through dates and grain day/week/month, up to twelve buckets. Call once per metric; two calls with the same dates compare two domains. Includes source counts and coverage. No past balances, overdue counts or goal progress. No category or entity ID is needed.",
  getRelatedEntities:
    "One-hop native and manual Graph relationships with source references.",
  getTimelineEvents:
    "One bounded page of recorded events, without private titles or descriptions.",
  getRunway:
    "Existing deterministic runway calculation with disclosed baseline coverage.",
  runFinancialScenario:
    "Existing runway scenario calculation under explicit assumptions; never writes.",
};
