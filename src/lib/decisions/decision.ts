import { z } from "zod";
import {
  metricDefinitions,
  type HistoricalMetric,
} from "@/lib/history/metrics";
import { validTimelineDate } from "@/lib/timeline/timeline";

export const decisionMetricKeys = [
  "income_centavos",
  "expense_centavos",
  "debt_payments_centavos",
  "task_completions",
  "knowledge_reviews",
] as const;

export const observationSourceTypes = [
  "task",
  "transaction",
  "job_application",
] as const;
export type ObservationSourceType = (typeof observationSourceTypes)[number];

export function parseRecordReference(
  value: string,
  allowed: readonly string[],
) {
  if (!value) return null;
  const [type, id, extra] = value.split(":");
  return !extra &&
    type &&
    allowed.includes(type) &&
    id &&
    z.uuid().safeParse(id).success
    ? { type, id }
    : null;
}

export const decisionSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    decisionOn: z.string().refine((value) => validTimelineDate(value) !== null),
    intent: z.string().trim().min(1).max(1000),
    expectedOutcome: z.string().trim().min(1).max(1000),
    rationale: z.string().trim().max(2000),
    assumptions: z.string().trim().max(2000),
    reviewOn: z.string().refine((value) => validTimelineDate(value) !== null),
    goalId: z.union([z.uuid(), z.literal("")]),
    actionRecord: z
      .string()
      .refine(
        (value) => !value || parseRecordReference(value, ["task"]) !== null,
      )
      .default(""),
    metricKey: z.union([z.enum(decisionMetricKeys), z.literal("")]),
  })
  .refine((value) => value.reviewOn > value.decisionOn, {
    message: "Review date must follow the decision date.",
    path: ["reviewOn"],
  });

export type DecisionInput = z.infer<typeof decisionSchema>;

export const observationSchema = z.object({
  observedOn: z.string().refine((value) => validTimelineDate(value) !== null),
  note: z.string().trim().min(1).max(2000),
  sourceRecord: z
    .string()
    .refine(
      (value) =>
        !value || parseRecordReference(value, observationSourceTypes) !== null,
    )
    .default(""),
});

export type Decision = {
  id: string;
  title: string;
  decision_on: string;
  intent: string;
  expected_outcome: string;
  rationale: string | null;
  assumptions: string | null;
  review_on: string;
  goal_id: string | null;
  action_task_id: string | null;
  metric_key: (typeof decisionMetricKeys)[number] | null;
  created_at: string;
  updated_at: string;
};

export type DecisionObservation = {
  id: string;
  decision_id: string;
  observed_on: string;
  note: string;
  source_task_id: string | null;
  source_transaction_id: string | null;
  source_application_id: string | null;
  created_at: string;
};

export type DecisionRevision = {
  id: string;
  previous_title: string;
  previous_decision_on: string;
  previous_intent: string;
  previous_expected_outcome: string;
  previous_rationale: string | null;
  previous_assumptions: string | null;
  previous_review_on: string;
  previous_goal_id: string | null;
  previous_action_task_id: string | null;
  previous_metric_key: (typeof decisionMetricKeys)[number] | null;
  changed_at: string;
};

function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function decisionComparisonWindow(decisionOn: string, today: string) {
  const beforeFrom = shiftDay(decisionOn, -14);
  const beforeThrough = shiftDay(decisionOn, -1);
  const afterFrom = shiftDay(decisionOn, 1);
  const afterThrough = shiftDay(decisionOn, 14);
  if (afterThrough >= today || beforeFrom < shiftDay(today, -365)) return null;
  return { beforeFrom, beforeThrough, afterFrom, afterThrough };
}

export type DecisionComparison = {
  before: number;
  after: number;
  beforeCount: number;
  afterCount: number;
  beforeFrom: string;
  beforeThrough: string;
  afterFrom: string;
  afterThrough: string;
  metric: (typeof decisionMetricKeys)[number];
};

export function compareDecisionHistory(
  decision: Pick<Decision, "decision_on" | "review_on" | "metric_key">,
  today: string,
  rows: HistoricalMetric[],
): DecisionComparison | null {
  if (!decision.metric_key || decision.review_on > today) return null;
  const window = decisionComparisonWindow(decision.decision_on, today);
  if (!window) return null;
  const matching = rows.filter((row) => row.metric === decision.metric_key);
  const before = matching.filter(
    (row) =>
      row.period.from >= window.beforeFrom &&
      row.period.from <= window.beforeThrough,
  );
  const after = matching.filter(
    (row) =>
      row.period.from >= window.afterFrom &&
      row.period.from <= window.afterThrough,
  );
  if (
    before.length !== 14 ||
    after.length !== 14 ||
    [...before, ...after].some(
      (row) => row.coverage !== "recorded" || row.value === null,
    )
  )
    return null;
  return {
    ...window,
    metric: decision.metric_key,
    before: before.reduce((sum, row) => sum + (row.value ?? 0), 0),
    after: after.reduce((sum, row) => sum + (row.value ?? 0), 0),
    beforeCount: before.reduce((sum, row) => sum + row.sourceCount, 0),
    afterCount: after.reduce((sum, row) => sum + row.sourceCount, 0),
  };
}

export function decisionMetricLabel(key: (typeof decisionMetricKeys)[number]) {
  return metricDefinitions[key].label;
}

const alternativeQuestions: Record<
  (typeof decisionMetricKeys)[number],
  string
> = {
  income_centavos:
    "Did your work, pay schedule, or other income change during either window?",
  expense_centavos:
    "Did prices, planned purchases, or unrecorded spending change during either window?",
  debt_payments_centavos:
    "Did payment timing, income, or debt terms change during either window?",
  task_completions:
    "Did your workload, available time, or way of recording tasks change during either window?",
  knowledge_reviews:
    "Did your study schedule, available time, or review habits change during either window?",
};

export function decisionAlternativeQuestion(
  key: (typeof decisionMetricKeys)[number],
) {
  return alternativeQuestions[key];
}
