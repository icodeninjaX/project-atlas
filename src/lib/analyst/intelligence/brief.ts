import {
  analystCapabilities,
  CAPABILITY_MANIFEST,
  PROCESS_CAPABILITIES,
  type CapabilityStatus,
} from "./capabilities";
import {
  analysisBriefSchema,
  type AnalysisBrief,
  type UnresolvedReason,
} from "./contracts";
import type { RunPath } from "./budgets";
import type { AnalystConsent, ProviderRoute } from "./policy";

/**
 * Validates an AnalysisBrief before any substantive analysis (AI-04) and
 * checks each requirement against the capability manifest, so a missing
 * capability, excluded data and a temporary outage are told apart before
 * retrieval starts. Resolved entities must already be authorized handles:
 * from re-authorized context or from this run's resolution.
 */

export type RequirementReadiness = {
  requirementId: string;
  essential: boolean;
  state:
    "supported" | "unsupported" | "not_authorized" | "temporarily_unavailable";
  reason: UnresolvedReason | null;
  capabilities: Array<{ id: string; status: CapabilityStatus | "unknown" }>;
};

export type BriefCheck =
  | {
      ok: true;
      brief: AnalysisBrief;
      readiness: RequirementReadiness[];
      path: RunPath;
    }
  | {
      ok: false;
      reason: "invalid_brief" | "unauthorized_entity" | "unknown_capability";
    };

const deepCapabilities = new Set([
  // A payment scenario resolves the debt, then compares options.
  "debt.scenario",
  "graph.paths",
  "decision.context",
  "decision.text",
  "task.detail",
  "money.category_breakdown",
  // A query on a named category resolves the category, then reads.
  "money.query",
  "goal.linked_activity",
]);
const deepIntents = new Set<AnalysisBrief["intent"]>([
  "explain_change",
  "prioritize",
  "relationship",
  "review_decision",
]);

/**
 * The simple path answers one lookup from one round; the deep path may
 * investigate. A single lookup never takes the deep path; a brief with more
 * than one requirement always does.
 */
export function choosePath(brief: AnalysisBrief): RunPath {
  const essential = brief.requirements.filter((item) => item.essential);
  const needs = new Set(
    brief.requirements.flatMap((item) => item.evidenceNeeded),
  );
  if (essential.length > 1) return "deep";
  // A planned investigation reads several areas, which one round cannot.
  if (brief.requirements.length > 1) return "deep";
  if (deepIntents.has(brief.intent)) return "deep";
  if ([...needs].some((item) => deepCapabilities.has(item))) return "deep";
  return "simple";
}

export function checkBrief(
  raw: unknown,
  options: {
    consent: AnalystConsent | null;
    route: ProviderRoute;
    authorizedHandles: ReadonlySet<string>;
    unavailableTools?: ReadonlySet<string>;
  },
): BriefCheck {
  const parsed = analysisBriefSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid_brief" };
  const brief = parsed.data;
  if (
    brief.resolvedEntities.some(
      (item) => !options.authorizedHandles.has(item.handle),
    )
  )
    return { ok: false, reason: "unauthorized_entity" };
  const known = new Set([
    ...CAPABILITY_MANIFEST.map((item) => item.id),
    ...Object.keys(PROCESS_CAPABILITIES),
  ]);
  if (
    brief.requirements.some((item) =>
      item.evidenceNeeded.some((id) => !known.has(id)),
    )
  )
    return { ok: false, reason: "unknown_capability" };
  const statuses = new Map<string, CapabilityStatus>(
    analystCapabilities({
      consent: options.consent,
      route: options.route,
      unavailableTools: options.unavailableTools,
    }).map((item) => [item.id, item.status]),
  );
  for (const [id, status] of Object.entries(PROCESS_CAPABILITIES))
    statuses.set(id, status);
  const readiness = brief.requirements.map(
    (requirement): RequirementReadiness => {
      const capabilities = requirement.evidenceNeeded.map((id) => ({
        id,
        status: statuses.get(id) ?? ("unknown" as const),
      }));
      const has = (status: CapabilityStatus) =>
        capabilities.some((item) => item.status === status);
      const state = has("not_authorized")
        ? "not_authorized"
        : has("unsupported")
          ? "unsupported"
          : has("temporarily_unavailable")
            ? "temporarily_unavailable"
            : "supported";
      return {
        requirementId: requirement.id,
        essential: requirement.essential,
        state,
        reason:
          state === "not_authorized"
            ? "excluded_by_consent"
            : state === "unsupported"
              ? "unsupported_capability"
              : state === "temporarily_unavailable"
                ? "operational_failure"
                : null,
        capabilities,
      };
    },
  );
  return { ok: true, brief, readiness, path: choosePath(brief) };
}
