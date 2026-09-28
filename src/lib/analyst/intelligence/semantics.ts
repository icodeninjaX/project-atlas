import { metricDefinitions, type MetricKey } from "@/lib/history/metrics";
import type { EvidenceUnit } from "./contracts";

/**
 * Metric semantics for Analyst V2 evidence. Historical metrics come from the
 * authoritative `metricDefinitions` registry rather than a copied list; the
 * remaining entries describe values existing tools already return. A value
 * may only be compared or combined with values in the same comparable group,
 * so two unrelated counts can never be presented as one population.
 */

export type MetricDomain =
  | "income"
  | "expense"
  | "debt"
  | "task"
  | "knowledge"
  | "review"
  | "goal"
  | "career"
  | "signal"
  | "runway"
  | "records"
  | "relationship"
  | "association";

export type MetricSemantics = {
  key: string;
  definition: string;
  unit: EvidenceUnit;
  domain: MetricDomain;
  aggregation:
    | "sum"
    | "count"
    | "mean"
    | "difference"
    | "percent"
    | "coefficient"
    | "latest"
    | "estimate"
    | "value";
  comparableGroup: string;
};

// Recorded money flows share one group so income and expenses can be netted;
// debt payments stay apart because they may overlap with recorded expenses.
const historicalGroup: Record<MetricKey, string> = {
  income_centavos: "money_flow",
  expense_centavos: "money_flow",
  debt_payments_centavos: "debt_payment_flow",
  task_completions: "task_completions",
  knowledge_reviews: "knowledge_reviews",
  review_overall_score: "review_score",
};
const historicalDomain: Record<MetricKey, MetricDomain> = {
  income_centavos: "income",
  expense_centavos: "expense",
  debt_payments_centavos: "debt",
  task_completions: "task",
  knowledge_reviews: "knowledge",
  review_overall_score: "review",
};

const historical = Object.fromEntries(
  (Object.keys(metricDefinitions) as MetricKey[]).map((key) => {
    const definition = metricDefinitions[key];
    return [
      key,
      {
        key,
        definition: `${definition.label}: ${definition.source}`,
        unit: definition.unit,
        domain: historicalDomain[key],
        aggregation:
          definition.unit === "score"
            ? "mean"
            : definition.unit === "count"
              ? "count"
              : "sum",
        comparableGroup: historicalGroup[key],
      } satisfies MetricSemantics,
    ];
  }),
) as Record<MetricKey, MetricSemantics>;

const own = (
  key: string,
  definition: string,
  unit: EvidenceUnit,
  domain: MetricDomain,
  aggregation: MetricSemantics["aggregation"],
  comparableGroup = key,
): MetricSemantics => ({
  key,
  definition,
  unit,
  domain,
  aggregation,
  comparableGroup,
});

export const METRIC_SEMANTICS: Record<string, MetricSemantics> = {
  ...historical,
  expense_change_centavos: own(
    "expense_change_centavos",
    "Change in recorded expenses between two aligned periods",
    "centavos",
    "expense",
    "difference",
    "expense_change",
  ),
  expense_change_percent: own(
    "expense_change_percent",
    "Percent change in recorded expenses between two aligned periods",
    "percent",
    "expense",
    "percent",
  ),
  records_count: own(
    "records_count",
    "Number of stored records a query included",
    "count",
    "records",
    "count",
  ),
  debt_balance_centavos: own(
    "debt_balance_centavos",
    "Current recorded debt balance; no balance history",
    "centavos",
    "debt",
    "latest",
    "debt_balance",
  ),
  goal_linked_task_completion: own(
    "goal_linked_task_completion",
    "A task currently linked to the goal, completed in the period",
    "count",
    "goal",
    "count",
  ),
  goal_linked_milestone_completion: own(
    "goal_linked_milestone_completion",
    "A milestone of the goal completed in the period",
    "count",
    "goal",
    "count",
  ),
  goal_linked_transaction: own(
    "goal_linked_transaction",
    "A transaction currently linked to the goal",
    "centavos",
    "goal",
    "value",
  ),
  relationship: own(
    "relationship",
    "A current Graph relationship",
    "relationship",
    "relationship",
    "value",
  ),
  correlation: own(
    "correlation",
    "Approved association test result between two whole-domain metrics",
    "correlation",
    "association",
    "coefficient",
  ),
};

/** Semantics for a key, or an isolated group for values with no registry entry. */
export function semanticsFor(key: string, unit: EvidenceUnit): MetricSemantics {
  return (
    METRIC_SEMANTICS[key] ??
    own(key, `Tool value ${key}`, unit, unitDomain(unit), "value")
  );
}

function unitDomain(unit: EvidenceUnit): MetricDomain {
  if (unit === "relationship") return "relationship";
  if (unit === "correlation") return "association";
  if (unit === "months") return "runway";
  return "records";
}

/**
 * Words that name a domain in claim text, English and Filipino. A claim that
 * names a domain must cite evidence from it, so a correct figure cannot be
 * relabeled as another measure.
 */
export const DOMAIN_TERMS: Partial<Record<MetricDomain, RegExp>> = {
  income: /\b(?:income|earn(?:ed|ings)?|salary|kita|kinita|sahod)\b/i,
  expense:
    /\b(?:expenses?|spending|spent|spend|expenditures?|gastos|gumastos|ginastos|gastusin)\b/i,
  debt: /\b(?:debts?|loans?|utang|pagkakautang)\b/i,
  task: /\b(?:tasks?|gawain)\b/i,
  knowledge: /\b(?:knowledge|concepts?)\b/i,
  review: /\b(?:weekly reviews?|review scores?)\b/i,
};

/** Which domains a cited metric may speak for in text. */
export function textDomains(semantics: MetricSemantics): MetricDomain[] {
  // Goal-linked activity is still a task, milestone or transaction.
  if (semantics.key === "goal_linked_task_completion") return ["goal", "task"];
  if (semantics.key === "goal_linked_transaction")
    return ["goal", "income", "expense"];
  // Debt payments are recorded payments toward a debt.
  if (semantics.key === "debt_payments_centavos") return ["debt"];
  return [semantics.domain];
}
