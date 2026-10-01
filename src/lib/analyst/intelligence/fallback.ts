import { NET_FLOW_SCOPE } from "./calculations";
import type { AnalysisBrief, DerivedFact, EvidenceV2 } from "./contracts";
import { formatMoney } from "./language";

/**
 * The deterministic draft used when no model can write (AI-07, roadmap
 * §9.5 step 4). It states selected ATLAS figures plainly, one claim per
 * figure, in the same claim shape a writer returns, so every figure passes
 * the same deterministic checks before it can ship. It never interprets,
 * compares or recommends.
 */

const MAX_PER_REQUIREMENT = 3;
const SHOWN_UNITS = new Set(["centavos", "count", "months", "days"]);
// Changes and percentages need their two periods stated together; those
// come from a writer or a derived fact, not a one-figure sentence.
const SHOWN_AGGREGATIONS = new Set(["sum", "count", "latest", "value"]);

type Numeric = Extract<EvidenceV2, { kind: "metric" }>;

// Counts about the retrieval itself or the data inventory are context, not
// findings a person asked for.
const HIDDEN_METRICS = /^(?:records_count$|inventory_)/;

function isShown(item: EvidenceV2): item is Numeric {
  return (
    item.kind === "metric" &&
    !HIDDEN_METRICS.test(item.semantics.metricKey) &&
    SHOWN_UNITS.has(item.unit) &&
    SHOWN_AGGREGATIONS.has(item.semantics.aggregation) &&
    (item.scope.type === "whole_domain" || item.scope.type === "entity") &&
    item.coverage.query === "complete"
  );
}

const statedKey = (item: Numeric) =>
  `${item.semantics.definition.split(":")[0]}|${item.value}|${item.time.period.from}`;

function valueText(item: Numeric) {
  if (item.unit === "centavos") return formatMoney(item.value);
  if (item.unit === "months") return `${item.value} months`;
  if (item.unit === "days") return `${item.value} days`;
  return String(item.value);
}

/**
 * The leading member of a complete ATLAS ranking, as a mention the owner
 * sees by its label, for a requirement that asks where the most goes. A tie
 * names every tied member. Returns null without a defined, complete ranking.
 */
function rankingText(fact: DerivedFact, kind: string) {
  if (fact.output.status !== "defined" || !fact.complete || !fact.top?.length)
    return null;
  const names = fact.top.map((member) => `{{${member}}}`);
  const [period] = fact.periods;
  const amount = formatMoney(fact.output.value);
  const span = `from ${period!.from} to ${period!.through}`;
  return names.length > 1
    ? `Tied for the largest recorded ${kind} category: ${names.join(" and ")}, ${amount} each ${span}.`
    : `Largest recorded ${kind} category: ${names[0]}, ${amount} ${span}.`;
}

export function deterministicDraft(
  brief: AnalysisBrief,
  evidence: EvidenceV2[],
  byRequirement: Readonly<Record<string, string[]>>,
  derived: DerivedFact[] = [],
) {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const used = new Set<string>();
  const stated = new Set<string>();
  let next = 0;
  // A ranking question is answered first, from ATLAS's own ranking.
  const rankingClaims = brief.requirements.flatMap((requirement) => {
    if (!requirement.evidenceNeeded.includes("money.category_ranking"))
      return [];
    const selected = new Set(byRequirement[requirement.id] ?? []);
    const fact = derived.find(
      (item) =>
        item.operation === "rank" &&
        item.operands.some((id) => selected.has(id)),
    );
    const kind = /\bincome\b/i.test(requirement.question)
      ? "income"
      : "expense";
    const text = fact && rankingText(fact, kind);
    if (!fact || !text) return [];
    return [
      {
        id: `c${(next += 1)}`,
        kind: "fact" as const,
        text,
        answersRequirementIds: [requirement.id],
        evidenceIds: [],
        derivedFactIds: [fact.id],
        assumptionIds: [],
        scopeId: fact.scopeId,
        comparison: null,
        recommendation: null,
      },
    ];
  });
  // Income less expenses says whether income covered spending, which is the
  // plainest answer to how money is going; it is stated once, for the first
  // requirement whose selected totals it nets.
  const netClaims = derived.flatMap((fact) => {
    if (
      fact.scopeId !== NET_FLOW_SCOPE ||
      fact.output.status !== "defined" ||
      !fact.complete
    )
      return [];
    const requirement = brief.requirements.find((item) =>
      (byRequirement[item.id] ?? []).some((id) => fact.operands.includes(id)),
    );
    const [period] = fact.periods;
    if (!requirement || !period) return [];
    return [
      {
        id: `c${(next += 1)}`,
        kind: "fact" as const,
        text: `Recorded income less recorded expenses: ${formatMoney(fact.output.value)} from ${period.from} to ${period.through}.`,
        answersRequirementIds: [requirement.id],
        evidenceIds: [],
        derivedFactIds: [fact.id],
        assumptionIds: [],
        scopeId: fact.scopeId,
        comparison: null,
        recommendation: null,
      },
    ];
  });
  const claims = brief.requirements.flatMap((requirement) =>
    (byRequirement[requirement.id] ?? [])
      .map((id) => byId.get(id))
      .filter((item): item is Numeric => Boolean(item && isShown(item)))
      .filter((item) => !used.has(item.id))
      // The same figure read twice (once per read, or for a period that
      // differs only in its last day) is stated once.
      .filter((item, index, items) => {
        const key = statedKey(item);
        return (
          !stated.has(key) &&
          items.findIndex((other) => statedKey(other) === key) === index
        );
      })
      .slice(0, MAX_PER_REQUIREMENT)
      .map((item) => {
        // Only a figure that is shown is used; one past this requirement's
        // limit stays available to a later requirement.
        used.add(item.id);
        stated.add(statedKey(item));
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
  // A question that asks where the most goes leads with the ranking;
  // otherwise the net flow leads.
  const rankingFirst = brief.requirements
    .find((item) => item.essential)
    ?.evidenceNeeded.includes("money.category_ranking");
  const ordered = rankingFirst
    ? [...rankingClaims, ...netClaims, ...claims]
    : [...netClaims, ...rankingClaims, ...claims];
  return {
    version: "2" as const,
    directAnswerClaimIds: ordered.slice(0, 1).map((claim) => claim.id),
    claims: ordered,
    sections: [],
    table: null,
  };
}
