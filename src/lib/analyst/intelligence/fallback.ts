import type { AnalysisBrief, EvidenceV2 } from "./contracts";
import { formatMoney } from "./language";

/**
 * The deterministic draft used when no model can write (AI-07, roadmap
 * §9.5 step 4). It states selected ATLAS figures plainly, one claim per
 * figure, in the same claim shape a writer returns, so every figure passes
 * the same deterministic checks before it can ship. It never interprets,
 * compares or recommends.
 */

const MAX_PER_REQUIREMENT = 3;
const SHOWN_UNITS = new Set(["centavos", "count", "months"]);
// Changes and percentages need their two periods stated together; those
// come from a writer or a derived fact, not a one-figure sentence.
const SHOWN_AGGREGATIONS = new Set(["sum", "count", "latest", "value"]);

type Numeric = Extract<EvidenceV2, { kind: "metric" }>;

function isShown(item: EvidenceV2): item is Numeric {
  return (
    item.kind === "metric" &&
    SHOWN_UNITS.has(item.unit) &&
    SHOWN_AGGREGATIONS.has(item.semantics.aggregation) &&
    (item.scope.type === "whole_domain" || item.scope.type === "entity") &&
    item.coverage.query === "complete"
  );
}

function valueText(item: Numeric) {
  if (item.unit === "centavos") return formatMoney(item.value);
  if (item.unit === "months") return `${item.value} months`;
  return String(item.value);
}

export function deterministicDraft(
  brief: AnalysisBrief,
  evidence: EvidenceV2[],
  byRequirement: Readonly<Record<string, string[]>>,
) {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const used = new Set<string>();
  let next = 0;
  const claims = brief.requirements.flatMap((requirement) =>
    (byRequirement[requirement.id] ?? [])
      .map((id) => byId.get(id))
      .filter((item): item is Numeric => Boolean(item && isShown(item)))
      .filter((item) => !used.has(item.id))
      .slice(0, MAX_PER_REQUIREMENT)
      .map((item) => {
        // Only a figure that is shown is used; one past this requirement's
        // limit stays available to a later requirement.
        used.add(item.id);
        const label = item.semantics.definition.split(":")[0]!.trim();
        const scope =
          item.scope.type === "entity" ? ` (${item.scope.description})` : "";
        return {
          id: `c${(next += 1)}`,
          kind: "fact" as const,
          text: `${label}${scope}: ${valueText(item)} from ${item.time.period.from} to ${item.time.period.through}.`,
          answersRequirementIds: [requirement.id],
          evidenceIds: [item.id],
          derivedFactIds: [],
          assumptionIds: [],
          scopeId: item.scope.id,
          comparison: null,
          recommendation: null,
        };
      }),
  );
  return {
    version: "2" as const,
    directAnswerClaimIds: claims.slice(0, 1).map((claim) => claim.id),
    claims,
    sections: [],
    table: null,
  };
}
