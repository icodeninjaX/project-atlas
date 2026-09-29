import { z } from "zod";
import {
  CONSENT_DOMAINS,
  type ConsentDomain,
  type EvidenceV2,
} from "./contracts";

/**
 * Analyst V2 data policy (AI-02A). Three separate questions decide whether a
 * value may reach an AI provider, and the answer applies to the complete
 * payload of every stage (planner, writer, critic, repair and history):
 *
 * 1. Did the user consent, under the current consent version, to this domain
 *    and this field profile?
 * 2. Is the provider route the request would use eligible for that profile?
 *    The current route is assumed to share traffic with OpenAI for model
 *    improvement, so only aggregates are eligible on it.
 * 3. Did the value survive this filter? `assertProviderPayload` runs again
 *    just before sending, as defense in depth.
 *
 * A local consent flag never claims to change a provider project's sharing
 * setting, and consent to use Analyst is not consent to every field.
 */

/** What kind of content a value is; evidence carries it in `sharing.route`. */
export const FIELD_PROFILES = [
  // Figures, counts, dates and periods with no record text.
  "aggregate",
  // Record names and titles: goal and task titles, category names.
  "basic_context",
  // Private narrative: reflections, notes, decision text, career notes.
  "sensitive_narrative",
] as const;
export type FieldProfile = (typeof FIELD_PROFILES)[number];

export const CONSENT_VERSION = "2" as const;

export const analystConsentSchema = z
  .object({
    version: z.literal(CONSENT_VERSION),
    /** The user acknowledged that Analyst sends eligible data to an AI provider. */
    providerProcessing: z.literal(true),
    domains: z.array(z.enum(CONSENT_DOMAINS)).max(CONSENT_DOMAINS.length),
    profiles: z.array(z.enum(FIELD_PROFILES)).min(1).max(3),
    grantedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (value) => value.profiles.includes("aggregate"),
    "Aggregates are the minimum Analyst needs.",
  );
export type AnalystConsent = z.infer<typeof analystConsentSchema>;

/**
 * Parses stored consent. An earlier version, a malformed value or a missing
 * value is no consent: the user must choose again.
 */
export function parseConsent(value: unknown): AnalystConsent | null {
  const parsed = analystConsentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The consent a user gave under the legacy one-choice notice (aggregates only). */
export function legacyEquivalentConsent(grantedAt: string): AnalystConsent {
  return {
    version: CONSENT_VERSION,
    providerProcessing: true,
    domains: [...CONSENT_DOMAINS],
    profiles: ["aggregate"],
    grantedAt,
  };
}

/**
 * Stable fingerprint of what consent allows. Cached conversation context
 * records the fingerprint it was built under and is discarded when the
 * current fingerprint differs, so a revocation also invalidates context that
 * included the revoked fields.
 */
export function consentFingerprint(consent: AnalystConsent | null) {
  if (!consent) return "none";
  const allowed = {
    version: consent.version,
    domains: [...new Set(consent.domains)].sort(),
    profiles: [...new Set(consent.profiles)].sort(),
  };
  return (
    fnv(JSON.stringify(allowed), 0x811c9dc5) +
    fnv(JSON.stringify(allowed), 0x01000193)
  );
}

/**
 * FNV-1a, 32 bits. The fingerprint only has to change when consent changes;
 * it is stored inside the sealed context, so it needs no secrecy, and a pure
 * function keeps this module usable in the browser.
 */
function fnv(text: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function contextValidFor(
  contextFingerprint: string,
  consent: AnalystConsent | null,
) {
  return consent !== null && contextFingerprint === consentFingerprint(consent);
}

export type ProviderRoute = {
  id: "openai_shared" | "openai_non_sharing";
  /** How the provider project handles traffic, and whether that is verified. */
  sharing: "model_improvement_assumed" | "non_sharing_verified";
  profiles: readonly FieldProfile[];
};

/**
 * The only route today. Its project is documented as sharing traffic with
 * OpenAI for complimentary tokens (docs/openai-free-pools.md), which ATLAS
 * has not verified, so it is treated as sharing.
 */
export const SHARED_ROUTE: ProviderRoute = {
  id: "openai_shared",
  sharing: "model_improvement_assumed",
  profiles: ["aggregate"],
};

/**
 * A non-sharing route exists only when an operator has verified the project
 * configuration and approved its spending, recorded by setting
 * `ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED=1` with a separate key. Neither
 * exists today; this never enables the route by itself.
 */
export function availableRoutes(
  env: Record<string, string | undefined> = process.env,
): ProviderRoute[] {
  const verified =
    env.ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED === "1" &&
    Boolean(env.OPENAI_NON_SHARING_API_KEY);
  return verified
    ? [
        SHARED_ROUTE,
        {
          id: "openai_non_sharing",
          sharing: "non_sharing_verified",
          profiles: ["aggregate", "basic_context", "sensitive_narrative"],
        },
      ]
    : [SHARED_ROUTE];
}

export type ExclusionReason =
  | "no_consent"
  | "domain_not_consented"
  | "profile_not_consented"
  | "route_ineligible";

/** Whether one domain and profile may reach a provider on a route. */
export function eligibility(
  domain: ConsentDomain,
  profile: FieldProfile,
  consent: AnalystConsent | null,
  route: ProviderRoute,
): ExclusionReason | null {
  if (!consent) return "no_consent";
  if (!consent.domains.includes(domain)) return "domain_not_consented";
  if (!consent.profiles.includes(profile)) return "profile_not_consented";
  if (!route.profiles.includes(profile)) return "route_ineligible";
  return null;
}

export type ProviderStage = "planner" | "writer" | "critic" | "repair";

/**
 * A prior turn, tagged with what its answer drew on. `question` and
 * `answer` are free text: the person's words, and model prose that may
 * repeat them. `facts` restates the answer from the aggregate values it
 * cited, and is what a route without private text receives instead.
 */
export type HistoryTurn = {
  question: string;
  answer: string;
  domains: ConsentDomain[];
  profiles: FieldProfile[];
  /** The cited aggregate values, as text; empty when none were numeric. */
  facts?: string;
  /** Set once the free text was replaced by `facts`. */
  aggregateOnly?: boolean;
};

/** An owner-only label (a title or name) that a stage wants to show a model. */
export type ProviderLabel = {
  handle: string;
  domain: ConsentDomain;
  text: string;
};

/** Everything one provider call would receive. */
export type ProviderPayload = {
  stage: ProviderStage;
  question: string;
  history: HistoryTurn[];
  evidence: EvidenceV2[];
  labels: ProviderLabel[];
};

export type PayloadExclusion = {
  kind: "evidence" | "label" | "history";
  ref: string;
  reason: ExclusionReason;
};

/**
 * Removes everything the consent and route do not allow from a payload.
 * The question is the user's own text for this turn; everything else must be
 * eligible. A history turn is dropped whole if any of its content is no
 * longer allowed, since its prose may repeat that content.
 */
export function filterProviderPayload(
  payload: ProviderPayload,
  consent: AnalystConsent | null,
  route: ProviderRoute,
): { payload: ProviderPayload; excluded: PayloadExclusion[] } {
  const excluded: PayloadExclusion[] = [];
  const evidence = payload.evidence.filter((item) => {
    const reason = eligibility(item.domain, item.sharing.route, consent, route);
    if (reason) excluded.push({ kind: "evidence", ref: item.id, reason });
    return !reason;
  });
  const labels = payload.labels.filter((label) => {
    const reason = eligibility(label.domain, "basic_context", consent, route);
    if (reason) excluded.push({ kind: "label", ref: label.handle, reason });
    return !reason;
  });
  const history = payload.history.flatMap((turn, index) => {
    const reason =
      turn.domains
        .flatMap((domain) =>
          turn.profiles.map((profile) =>
            eligibility(domain, profile, consent, route),
          ),
        )
        .find((item) => item !== null) ?? (consent ? null : "no_consent");
    if (reason) {
      excluded.push({ kind: "history", ref: `turn:${index}`, reason });
      return [];
    }
    // An earlier question is the person's free text, and its answer's prose
    // may repeat that text (a record name, a private remark) whatever the
    // answer's evidence was. Both travel only where the most sensitive
    // profile may; elsewhere the turn is restated from its cited aggregates.
    if (turn.aggregateOnly) return [turn];
    const withheld = freeTextEligibility(turn.domains, consent, route);
    if (!withheld) return [turn];
    excluded.push({
      kind: "history",
      ref: `turn:${index}:text`,
      reason: withheld,
    });
    return turn.facts
      ? [
          {
            ...turn,
            question: "",
            answer: turn.facts,
            facts: turn.facts,
            aggregateOnly: true,
          },
        ]
      : [];
  });
  return { payload: { ...payload, evidence, labels, history }, excluded };
}

/** Whether an earlier turn's free text may reach a provider. */
function freeTextEligibility(
  domains: ConsentDomain[],
  consent: AnalystConsent | null,
  route: ProviderRoute,
): ExclusionReason | null {
  if (!consent) return "no_consent";
  if (!consent.profiles.includes("sensitive_narrative"))
    return "profile_not_consented";
  if (!route.profiles.includes("sensitive_narrative"))
    return "route_ineligible";
  return (
    domains
      .map((domain) =>
        eligibility(domain, "sensitive_narrative", consent, route),
      )
      .find((item) => item !== null) ?? null
  );
}

export class ProviderPolicyViolation extends Error {
  constructor(public readonly exclusions: PayloadExclusion[]) {
    super("The provider payload contains data this request may not send.");
    this.name = "ProviderPolicyViolation";
  }
}

/**
 * Throws unless every part of the payload is eligible. Call it immediately
 * before any provider request, after all prompt assembly.
 */
export function assertProviderPayload(
  payload: ProviderPayload,
  consent: AnalystConsent | null,
  route: ProviderRoute,
) {
  if (!consent) throw new ProviderPolicyViolation([]);
  const { excluded } = filterProviderPayload(payload, consent, route);
  if (excluded.length > 0) throw new ProviderPolicyViolation(excluded);
}

/** Plain-language disclosure of what a consent allows, for the consent UI. */
export function describeConsent(
  consent: AnalystConsent | null,
  route: ProviderRoute = SHARED_ROUTE,
) {
  if (!consent) return ["Analyst sends nothing to an AI provider."];
  const lines = [
    `Analyst may send figures, counts and dates from: ${consent.domains.join(", ") || "no areas"}.`,
  ];
  for (const profile of ["basic_context", "sensitive_narrative"] as const) {
    const label =
      profile === "basic_context"
        ? "record names and titles"
        : "private notes, reflections and decision text";
    if (!consent.profiles.includes(profile))
      lines.push(`It never sends ${label}.`);
    else if (!route.profiles.includes(profile))
      lines.push(
        `You allowed ${label}, but they stay in ATLAS until a provider route that does not share data for model training is verified.`,
      );
    else lines.push(`It may send ${label}.`);
  }
  if (route.sharing === "model_improvement_assumed")
    lines.push(
      "ATLAS's AI provider project shares traffic with OpenAI for free daily usage, so OpenAI may use what it receives to improve its models.",
    );
  return lines;
}
