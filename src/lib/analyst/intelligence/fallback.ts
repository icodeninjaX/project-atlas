import type { AnalysisBrief, DerivedFact, EvidenceV2 } from "./contracts";
import { formatMoney } from "./language";
import type { ProviderLabel } from "./policy";

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

/**
 * The leading member of a complete ATLAS ranking, named by its owner label,
 * for a requirement that asks where the most goes. A tie names every tied
 * member. Returns null without a defined, complete ranking or a label.
 */
function rankingText(
  fact: DerivedFact,
  labels: ReadonlyMap<string, string>,
  kind: string,
) {
  if (fact.output.status !== "defined" || !fact.complete || !fact.top?.length)
    return null;
  const names = fact.top.map((member) =>
    member === "uncategorized" ? "Uncategorized" : labels.get(member),
  );
  if (names.some((name) => !name)) return null;
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
  ranked: { derived: DerivedFact[]; labels: ProviderLabel[] } = {
    derived: [],
    labels: [],
  },
) {
  const labels = new Map(
    ranked.labels.map((label) => [label.handle, label.text]),
  );
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const used = new Set<string>();
  let next = 0;
  // A ranking question is answered first, from ATLAS's own ranking.
  const rankingClaims = brief.requirements.flatMap((requirement) => {
    if (!requirement.evidenceNeeded.includes("money.category_ranking"))
      return [];
    const selected = new Set(byRequirement[requirement.id] ?? []);
    const fact = ranked.derived.find(
      (item) =>
        item.operation === "rank" &&
        item.operands.some((id) => selected.has(id)),
    );
    const kind = /\bincome\b/i.test(requirement.question)
      ? "income"
      : "expense";
    const text = fact && rankingText(fact, labels, kind);
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
    directAnswerClaimIds: [...rankingClaims, ...claims]
      .slice(0, 1)
      .map((claim) => claim.id),
    claims: [...rankingClaims, ...claims],
    sections: [],
    table: null,
  };
}
