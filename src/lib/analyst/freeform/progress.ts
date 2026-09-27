import type { ToolName } from "@/lib/analyst/tools/contracts";

/**
 * Live Analyst progress. Stages name fixed steps and domains come from a
 * fixed vocabulary keyed by tool, so no question, record title or figure can
 * reach a progress event.
 */
export const ANALYST_STAGES = [
  "understanding",
  "reading",
  "writing",
  "checking",
  "repairing",
] as const;
export type AnalystStage = (typeof ANALYST_STAGES)[number];

export type AnalystDomain =
  | "spending"
  | "income"
  | "money"
  | "debts"
  | "tasks"
  | "goals"
  | "career"
  | "reviews"
  | "signals"
  | "knowledge"
  | "history"
  | "patterns"
  | "linked records"
  | "timeline"
  | "runway";

export type AnalystProgressEvent =
  | { type: "stage"; stage: Exclude<AnalystStage, "reading"> }
  | { type: "stage"; stage: "reading"; domains: AnalystDomain[] };

/** The last NDJSON line: the same body and status the JSON response carries. */
export type AnalystResultEvent = {
  type: "result";
  status: number;
  body: unknown;
};

export type AnalystStreamEvent = AnalystProgressEvent | AnalystResultEvent;

/** Hook the planner and answer steps call as they reach each stage. */
export type AnalystStageHook = (event: AnalystProgressEvent) => void;

export const NDJSON_TYPE = "application/x-ndjson";

const toolDomains: Record<ToolName, AnalystDomain> = {
  getSpendingChange: "spending",
  getDebtProgress: "debts",
  getTaskFocus: "tasks",
  getGoalProgress: "goals",
  getCareerPipeline: "career",
  getWeeklyReviewMetrics: "reviews",
  getSignals: "signals",
  getMoneySummary: "money",
  getDebtPayments: "debts",
  getHistoricalMetricSeries: "history",
  getCrossDomainHistory: "history",
  getPatternAssociation: "patterns",
  getRelatedEntities: "linked records",
  getGoalLinkedActivity: "goals",
  getTimelineEvents: "timeline",
  getRunway: "runway",
  runFinancialScenario: "runway",
  compareFinancialScenarios: "runway",
};

const metricDomains: Record<string, AnalystDomain> = {
  income_centavos: "income",
  expense_centavos: "spending",
  debt_payments_centavos: "debts",
  task_completions: "tasks",
  knowledge_reviews: "knowledge",
  review_overall_score: "reviews",
};

/** Domains a set of planned calls reads, in plan order, without duplicates. */
export function domainsForCalls(
  calls: ReadonlyArray<{ tool: ToolName; input: unknown }>,
): AnalystDomain[] {
  const domains: AnalystDomain[] = [];
  for (const call of calls) {
    const input = (call.input ?? {}) as {
      kind?: unknown;
      metric?: unknown;
      metrics?: unknown;
    };
    const metrics = [
      ...(typeof input.metric === "string" ? [input.metric] : []),
      ...(Array.isArray(input.metrics) ? input.metrics : []),
    ]
      .map((metric) => metricDomains[String(metric)])
      .filter((domain): domain is AnalystDomain => Boolean(domain));
    const named =
      call.tool === "getMoneySummary" && input.kind === "income"
        ? ["income" as const]
        : call.tool === "getMoneySummary" && input.kind === "expense"
          ? ["spending" as const]
          : metrics.length > 0
            ? metrics
            : [toolDomains[call.tool]];
    for (const domain of named)
      if (domain && !domains.includes(domain)) domains.push(domain);
  }
  return domains;
}

function list(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** Checklist wording for a stage; reading names up to three domains. */
export function stageLabel(stage: AnalystStage, domains: AnalystDomain[] = []) {
  switch (stage) {
    case "understanding":
      return "Understanding your question";
    case "reading": {
      if (domains.length === 0) return "Reading your records";
      const shown = domains.slice(0, 3);
      return `Reading ${list(domains.length > 3 ? [...shown, "more"] : shown)}`;
    }
    case "writing":
      return "Writing the explanation";
    case "checking":
      return "Checking every figure";
    case "repairing":
      return "Correcting an answer that failed checks";
  }
}

/** Reads a stage event from an untrusted NDJSON line, or null. */
export function parseStreamEvent(line: string): AnalystStreamEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (event.type === "result" && typeof event.status === "number")
    return { type: "result", status: event.status, body: event.body };
  if (
    event.type !== "stage" ||
    !ANALYST_STAGES.includes(event.stage as AnalystStage)
  )
    return null;
  if (event.stage !== "reading")
    return {
      type: "stage",
      stage: event.stage as Exclude<AnalystStage, "reading">,
    };
  const known = new Set<string>([
    ...Object.values(toolDomains),
    ...Object.values(metricDomains),
  ]);
  const domains = Array.isArray(event.domains)
    ? event.domains.filter(
        (domain): domain is AnalystDomain =>
          typeof domain === "string" && known.has(domain),
      )
    : [];
  return { type: "stage", stage: "reading", domains };
}
