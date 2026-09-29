import { z } from "zod";
import {
  toolDescriptions,
  toolInputs,
  type ToolName,
} from "@/lib/analyst/tools/contracts";
import { validTimelineDate } from "@/lib/timeline/timeline";
import type { ConsentDomain, EvidenceV2 } from "../contracts";

/**
 * Analyst V2 read tools (AI-02B, AI-02C). They are a separate registry from
 * the legacy tools, so the legacy planner catalog and its behavior do not
 * change. Inputs accept no owner, SQL, table, field list or URL; entity
 * references are handles that every tool re-authorizes for the signed-in
 * owner on every call.
 */

export const V2_ENTITY_TYPES = [
  "goal",
  "task",
  "goal_milestone",
  "debt",
  "job_application",
  "knowledge_concept",
  "decision",
  "weekly_review",
  "category",
] as const;
export type V2EntityType = (typeof V2_ENTITY_TYPES)[number];

export const ENTITY_DOMAINS: Record<V2EntityType, ConsentDomain> = {
  goal: "goals",
  task: "tasks",
  goal_milestone: "goals",
  debt: "debts",
  job_application: "career",
  knowledge_concept: "knowledge",
  decision: "decisions",
  weekly_review: "reviews",
  category: "money",
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A handle is `type:uuid`. It carries no authority: holding one proves
 * nothing, and a tool that receives one reads it with the owner's filter.
 */
export const handleSchema = z
  .string()
  .max(80)
  .refine((value) => parseHandle(value) !== null, "Unknown record reference.");

export function parseHandle(value: string) {
  const [type, id, extra] = value.split(":");
  if (extra !== undefined || !type || !id || !uuid.test(id)) return null;
  if (!(V2_ENTITY_TYPES as readonly string[]).includes(type)) return null;
  return { type: type as V2EntityType, id: id.toLowerCase() };
}

export const toHandle = (type: V2EntityType, id: string) => `${type}:${id}`;

const day = z.string().refine((value) => validTimelineDate(value) !== null);
const period = { from: day, through: day };
const bounded = (value: { from: string; through: string }) => {
  const days =
    (Date.parse(value.through) - Date.parse(value.from)) / 86_400_000;
  return days >= 0 && days < 366;
};
// Names only: punctuation that PostgREST filters treat as syntax is removed.
const searchText = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .transform((value) =>
    value
      .replace(/[%,_\\()*.:"']/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
  .refine((value) => value.length >= 2, "Use at least two letters.");

export const V2_TOOL_LIMITS = Object.freeze({
  queries: 48,
  rows: 4000,
  namesPerType: 100,
  candidates: 10,
  searchPage: 20,
  detailHandles: 10,
  graphNodes: 40,
  graphEdges: 80,
  graphDepth: 2,
  // Each one-hop Graph read costs several queries; this bounds a traversal.
  graphExpansions: 5,
  aggregateGroups: 500,
  events: 20,
  observations: 50,
  excerptChars: 600,
  outputBytes: 96_000,
  timeoutMs: 12_000,
});

/**
 * Existing aggregate tools that V2 calls unchanged, with their own inputs,
 * owner scoping, bounded transport and fixed-vocabulary labels. Their
 * evidence is adapted to EvidenceV2 (`legacy-evidence.ts`); nothing new is
 * read. They answer the aggregate questions (debt state, task focus, goal
 * progress, the career pipeline, review scores, signals, runway scenarios)
 * that the V2 entity tools cannot.
 */
export const BRIDGED_TOOLS = [
  "getDebtProgress",
  "getDebtPayments",
  "getTaskFocus",
  "getGoalProgress",
  "getCareerPipeline",
  "getWeeklyReviewMetrics",
  "getSignals",
  "getRunway",
  "compareFinancialScenarios",
  "getHistoricalMetricSeries",
] as const satisfies readonly ToolName[];
export type BridgedTool = (typeof BRIDGED_TOOLS)[number];
export const isBridgedTool = (name: string): name is BridgedTool =>
  (BRIDGED_TOOLS as readonly string[]).includes(name);

export const v2ToolInputs = {
  resolveAnalystEntities: z
    .object({
      text: searchText,
      types: z
        .array(z.enum(V2_ENTITY_TYPES))
        .min(1)
        .max(V2_ENTITY_TYPES.length),
    })
    .strict(),
  searchAnalystRecords: z
    .object({
      text: searchText,
      type: z.enum(V2_ENTITY_TYPES),
      cursor: z.string().regex(uuid).nullable().default(null),
      limit: z.number().int().min(1).max(V2_TOOL_LIMITS.searchPage).default(10),
    })
    .strict(),
  getAnalystRecordDetails: z
    .object({
      handles: z.array(handleSchema).min(1).max(V2_TOOL_LIMITS.detailHandles),
      profile: z
        .enum(["aggregate", "sensitive_narrative"])
        .default("aggregate"),
    })
    .strict()
    .refine(
      (value) => new Set(value.handles).size === value.handles.length,
      "Duplicate records.",
    ),
  getMoneyBreakdown: z
    .object({ ...period, kind: z.enum(["expense", "income"]) })
    .strict()
    .refine(bounded, "Use an ordered period of at most 366 days."),
  getGoalAnalysisContext: z
    .object({ goal: handleSchema, ...period })
    .strict()
    .refine(bounded, "Use an ordered period of at most 366 days.")
    .refine(
      (value) => parseHandle(value.goal)?.type === "goal",
      "Choose a goal.",
    ),
  getDecisionAnalysisContext: z
    .object({ decision: handleSchema, includeText: z.boolean().default(false) })
    .strict()
    .refine(
      (value) => parseHandle(value.decision)?.type === "decision",
      "Choose a decision.",
    ),
  getRelationshipPaths: z
    .object({
      start: handleSchema,
      depth: z.union([z.literal(1), z.literal(2)]).default(2),
    })
    .strict(),
  getDebtProgress: toolInputs.getDebtProgress,
  getDebtPayments: toolInputs.getDebtPayments,
  getTaskFocus: toolInputs.getTaskFocus,
  getGoalProgress: toolInputs.getGoalProgress,
  getCareerPipeline: toolInputs.getCareerPipeline,
  getWeeklyReviewMetrics: toolInputs.getWeeklyReviewMetrics,
  getSignals: toolInputs.getSignals,
  getRunway: toolInputs.getRunway,
  compareFinancialScenarios: toolInputs.compareFinancialScenarios,
  getHistoricalMetricSeries: toolInputs.getHistoricalMetricSeries,
} as const;
export type V2ToolName = keyof typeof v2ToolInputs;
export type V2ToolInput<N extends V2ToolName> = z.infer<
  (typeof v2ToolInputs)[N]
>;

export const v2ToolDescriptions: Record<V2ToolName, string> = {
  resolveAnalystEntities:
    "Find the owner's records whose names match a phrase. Returns candidates with the basis of each match and whether the phrase is ambiguous; never guesses one.",
  searchAnalystRecords:
    "One page of the owner's records of one type whose names contain a phrase, with a cursor. For finding records, never for totals or rankings.",
  getAnalystRecordDetails:
    "Current facts for up to ten resolved records. Private text is returned only for the sensitive profile and only when policy allows it.",
  getMoneyBreakdown:
    "Complete per-category totals of recorded income or expenses for an explicit period, from a database aggregate. Withheld when the aggregate is not complete.",
  getGoalAnalysisContext:
    "A resolved goal's current state, milestones and currently linked activity in a period. Current links do not prove past links.",
  getDecisionAnalysisContext:
    "A resolved decision's dates, review window, revisions, observations and the existing before/after comparison. Plan text and notes only with includeText and policy approval.",
  getRelationshipPaths:
    "Native and manual relationships up to two hops from a resolved record, with provenance, cycle cuts and truncation.",
  getDebtProgress: toolDescriptions.getDebtProgress,
  getDebtPayments: toolDescriptions.getDebtPayments,
  getTaskFocus: toolDescriptions.getTaskFocus,
  getGoalProgress: toolDescriptions.getGoalProgress,
  getCareerPipeline: toolDescriptions.getCareerPipeline,
  getWeeklyReviewMetrics: toolDescriptions.getWeeklyReviewMetrics,
  getSignals: toolDescriptions.getSignals,
  getRunway: toolDescriptions.getRunway,
  compareFinancialScenarios: toolDescriptions.compareFinancialScenarios,
  getHistoricalMetricSeries: toolDescriptions.getHistoricalMetricSeries,
};

/** Owner-only display text. It reaches a provider only through policy. */
export type OwnerLabel = {
  handle: string;
  domain: ConsentDomain;
  text: string;
  href: string;
};

export type EntityCandidate = {
  handle: string;
  type: V2EntityType;
  basis: "exact" | "mentioned" | "contains" | "words";
};

export type V2FailureCode =
  | "invalid_input"
  | "unauthenticated"
  | "unavailable_source"
  | "setup_error"
  | "timeout"
  | "partial"
  | "invalid_output"
  | "budget_exceeded";

export type V2ToolPayload = {
  status: "ready" | "partial" | "insufficient";
  evidence: EvidenceV2[];
  labels: OwnerLabel[];
  candidates: EntityCandidate[];
  ambiguous: boolean;
  nextCursor: string | null;
  limitations: string[];
};

export type V2ToolResult = Omit<V2ToolPayload, "status"> & {
  tool: V2ToolName | null;
  status: V2ToolPayload["status"] | "error";
  error?: { code: V2FailureCode; message: string };
  metadata: { version: "1"; durationMs: number; queries: number; rows: number };
};

export const emptyPayload = (): V2ToolPayload => ({
  status: "ready",
  evidence: [],
  labels: [],
  candidates: [],
  ambiguous: false,
  nextCursor: null,
  limitations: [],
});
