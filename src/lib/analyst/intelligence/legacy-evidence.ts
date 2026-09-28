import type { ToolEvidence, ToolName } from "@/lib/analyst/tools/contracts";
import {
  evidenceV2Schema,
  type ConsentDomain,
  type EvidenceCoverage,
  type EvidenceScope,
  type EvidenceUnit,
  type EvidenceV2,
} from "./contracts";
import { semanticsFor, type MetricDomain } from "./semantics";

/**
 * Adapts evidence from the existing approved tools to EvidenceV2 without
 * changing those tools or their consumers. The tool call's validated input
 * supplies what an evidence item alone does not say (the transaction kind,
 * the selected goal). Anything the adapter cannot classify gets an isolated
 * comparable group, so it can be cited but never combined with other values.
 */

export type LegacyToolCall = {
  tool: ToolName;
  input: unknown;
  evidence: ToolEvidence[];
};

/** The consent domain each existing tool reads. */
const toolDomains: Record<ToolName, ConsentDomain> = {
  getSpendingChange: "money",
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
  getPatternAssociation: "history",
  getRelatedEntities: "graph",
  getGoalLinkedActivity: "goals",
  getTimelineEvents: "timeline",
  getRunway: "runway",
  runFinancialScenario: "runway",
  compareFinancialScenarios: "runway",
};

/** A whole-domain series belongs to its own domain, not to "history". */
function historyDomain(domain: MetricDomain): ConsentDomain {
  if (domain === "income" || domain === "expense") return "money";
  if (domain === "debt") return "debts";
  if (domain === "task") return "tasks";
  if (domain === "knowledge") return "knowledge";
  if (domain === "review") return "reviews";
  return "history";
}

const digestSuffix = /\.[0-9a-f]{16}$/;

/** The tool's own evidence key, without the tool prefix and content digest. */
export function localEvidenceId(tool: ToolName, id: string) {
  const prefix = `${tool}.`;
  return id.startsWith(prefix) && digestSuffix.test(id)
    ? id.slice(prefix.length).replace(digestSuffix, "")
    : id;
}

type Classified = {
  metricKey: string;
  scope: EvidenceScope;
  relationship?: EvidenceCoverage["relationship"];
};

const wholeDomain = (domain: string): EvidenceScope => ({
  id: `whole_domain:${domain}`,
  type: "whole_domain",
  description: `All of the owner's recorded ${domain}`,
});

function field(input: unknown, key: string) {
  return input && typeof input === "object" && key in input
    ? (input as Record<string, unknown>)[key]
    : undefined;
}

function classify(
  call: LegacyToolCall,
  local: string,
  categoryCount: number,
): Classified {
  const { tool, input } = call;
  switch (tool) {
    case "getSpendingChange": {
      if (local === "spending.current" || local === "spending.previous")
        return { metricKey: "expense_centavos", scope: wholeDomain("expense") };
      if (local === "spending.change")
        return {
          metricKey: "expense_change_centavos",
          scope: wholeDomain("expense"),
        };
      if (local === "spending.change_percent")
        return {
          metricKey: "expense_change_percent",
          scope: wholeDomain("expense"),
        };
      if (local === "spending.records_inspected")
        return { metricKey: "records_count", scope: wholeDomain("expense") };
      if (local.startsWith("spending.category."))
        return {
          metricKey: "expense_change_centavos",
          scope: {
            id: "cohort:expense_by_category",
            type: "cohort",
            description: "Recorded expense change by category",
            // The legacy tool returns only the five largest changes, so the
            // set is never complete enough to rank or reconcile.
            cohort: {
              setId: "expense_by_category",
              member: local.slice("spending.category.".length),
              setSize: Math.max(categoryCount, 1),
              setComplete: false,
            },
          },
        };
      break;
    }
    case "getMoneySummary":
    case "getDebtPayments": {
      const payments = tool === "getDebtPayments";
      const kind = payments ? "debt_payments" : String(field(input, "kind"));
      const entityId = payments
        ? field(input, "debtId")
        : field(input, "categoryId");
      const scope: EvidenceScope =
        typeof entityId === "string"
          ? {
              id: `${payments ? "debt" : "category"}:${entityId}`,
              type: "entity",
              description: payments
                ? "One selected debt"
                : "One selected category",
              entity: {
                type: payments ? "debt" : "category",
                handle: entityId,
              },
            }
          : wholeDomain(payments ? "debt payments" : kind);
      if (local === "total") return { metricKey: `${kind}_centavos`, scope };
      if (local === "count") return { metricKey: "records_count", scope };
      break;
    }
    case "getHistoricalMetricSeries": {
      const metric = String(field(input, "metric"));
      return { metricKey: metric, scope: wholeDomain(metric) };
    }
    case "getCrossDomainHistory": {
      const metric = local.split(".")[0]!;
      return {
        metricKey: local.includes(".change.") ? `${metric}_change` : metric,
        scope: wholeDomain(metric),
      };
    }
    case "getPatternAssociation":
      return { metricKey: "correlation", scope: wholeDomain("history") };
    case "getGoalLinkedActivity": {
      const goalId = String(field(input, "goalId"));
      const scope: EvidenceScope = {
        id: `goal:${goalId}`,
        type: "entity",
        description: "Records currently linked to the selected goal",
        entity: { type: "goal", handle: goalId },
      };
      const key = local.startsWith("task.")
        ? "goal_linked_task_completion"
        : local.startsWith("milestone.")
          ? "goal_linked_milestone_completion"
          : local.startsWith("transaction.")
            ? "goal_linked_transaction"
            : "relationship";
      return { metricKey: key, scope, relationship: "current_only" };
    }
    case "getRelatedEntities":
      return {
        metricKey: "relationship",
        scope: {
          id: `relationship:${String(field(input, "entityId"))}`,
          type: "relationship",
          description: "Current one-hop Graph relationships",
        },
        relationship: "current_only",
      };
    case "runFinancialScenario":
    case "compareFinancialScenarios": {
      const [label, key] = local.split(".");
      return {
        metricKey: `scenario:${key}`,
        scope: {
          id: "scenario",
          type: "scenario",
          description: "Runway scenario options on one current baseline",
          cohort: {
            setId: "scenario_options",
            member: label ?? local,
            setSize: 1,
            setComplete: true,
          },
        },
      };
    }
  }
  // Uuid-like segments vary per record; the rest names the measure.
  const stable = local.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "*");
  return { metricKey: `legacy:${tool}:${stable}`, scope: wholeDomain(tool) };
}

const recordingUnknown = new Set<EvidenceUnit>(["centavos", "count"]);

export function adaptLegacyCall(call: LegacyToolCall): EvidenceV2[] {
  const categoryCount = call.evidence.filter((item) =>
    localEvidenceId(call.tool, item.id).startsWith("spending.category."),
  ).length;
  return call.evidence.map((item) => {
    const local = localEvidenceId(call.tool, item.id);
    const unit = item.unit as EvidenceUnit;
    const { metricKey, scope, relationship } = classify(
      call,
      local,
      categoryCount,
    );
    const semantics = semanticsFor(metricKey, unit);
    const scenario =
      item.provenance.tool === "compareFinancialScenarios" ||
      item.provenance.tool === "runFinancialScenario";
    const truncated = local === "spending.records_inspected";
    const base = {
      version: "2" as const,
      id: item.id,
      sourceType: call.tool,
      domain:
        call.tool === "getHistoricalMetricSeries" ||
        call.tool === "getCrossDomainHistory"
          ? historyDomain(semantics.domain)
          : toolDomains[call.tool],
      calculationVersion: item.provenance.calculationVersion,
      semantics: {
        metricKey: semantics.key,
        definition: semantics.definition.slice(0, 400),
        aggregation: semantics.aggregation,
        comparableGroup: semantics.comparableGroup,
        ...(unit === "centavos" && { currency: "PHP" as const }),
      },
      scope,
      time: {
        period: item.period,
        timeZone: "Asia/Manila" as const,
        basis: scenario ? ("assumption" as const) : ("event_date" as const),
        retrievedAt: item.provenance.retrievedAt,
        asOf: null,
      },
      coverage: {
        query:
          item.completeness === "complete"
            ? ("complete" as const)
            : item.completeness === "partial"
              ? ("partial" as const)
              : ("unknown" as const),
        // Stored records never prove the user logged everything.
        recording: scenario
          ? ("not_applicable" as const)
          : recordingUnknown.has(unit)
            ? ("unknown" as const)
            : ("not_applicable" as const),
        period:
          item.completeness === "complete"
            ? ("complete" as const)
            : ("partial" as const),
        relationship: relationship ?? ("not_applicable" as const),
        recordsConsidered: null,
        truncated,
        missingPeriods: [],
      },
      provenance: {
        tool: call.tool,
        sourceRefs: item.source.recordIds.slice(0, 20).map((id) => ({
          handle: `record:${id}`,
          href: item.source.href,
        })),
        inputs: [],
        legacyId: item.id,
      },
      sharing: {
        route: "aggregate" as const,
        allowedFields: ["metric", "value", "unit", "period"],
      },
      limitations: item.note ? [item.note.slice(0, 400)] : [],
    };
    const numeric = typeof item.value === "number";
    const adapted =
      scenario && numeric
        ? {
            ...base,
            kind: "scenario_output" as const,
            value: item.value as number,
            unit,
            assumptions: [item.comparisonBasis.slice(0, 400)],
          }
        : numeric && unit !== "relationship"
          ? {
              ...base,
              kind: "metric" as const,
              value: item.value as number,
              unit,
            }
          : {
              ...base,
              kind: "record_fact" as const,
              value:
                typeof item.value === "number"
                  ? item.value
                  : String(item.value).slice(0, 200),
              unit,
              sharing: {
                route: "basic_context" as const,
                allowedFields: base.sharing.allowedFields,
              },
            };
    return evidenceV2Schema.parse(adapted);
  });
}

export function adaptLegacyCalls(calls: LegacyToolCall[]) {
  return calls.flatMap(adaptLegacyCall);
}
