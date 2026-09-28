import { z } from "zod";
import { validTimelineDate } from "@/lib/timeline/timeline";

/**
 * Versioned Analyst intelligence contracts (AI-01). Zod schemas are the one
 * authority; TypeScript types are inferred from them. Strict structured output
 * is a formatting boundary, not proof of semantic correctness: every claim is
 * still checked by `claims.ts` against typed evidence and derived facts.
 */

const day = z.string().refine((value) => validTimelineDate(value) !== null, {
  message: "Use an ISO calendar date.",
});
export const periodSchema = z
  .object({ from: day, through: day })
  .strict()
  .refine((value) => value.from <= value.through, "Use an ordered period.");
export type Period = z.infer<typeof periodSchema>;

const handle = z.string().trim().min(1).max(160);
const shortText = z.string().trim().min(1).max(400);

export const RESULT_STATUSES = [
  "answered",
  "partial_answer",
  "clarification_required",
  "insufficient_evidence",
  "unsupported_capability",
  "fallback_facts",
  "error",
] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

// ——— Analysis brief (roadmap §5.1) ———

export const analysisBriefSchema = z
  .object({
    version: z.literal("1"),
    intent: z.enum([
      "lookup",
      "compare",
      "explain_change",
      "prioritize",
      "scenario",
      "relationship",
      "review_decision",
      "follow_up",
    ]),
    language: z.string().trim().min(2).max(16),
    responseStyle: z.enum(["concise", "standard", "detailed", "table"]),
    question: z.string().trim().min(1).max(4000),
    resolvedEntities: z
      .array(
        z
          .object({
            handle,
            type: z.string().trim().min(1).max(40),
            resolution: z.enum([
              "selected",
              "exact_match",
              "confirmed",
              "context",
            ]),
          })
          .strict(),
      )
      .max(20),
    periods: z
      .array(
        z
          .object({
            id: handle,
            from: day,
            through: day,
            timeZone: z.literal("Asia/Manila"),
            basis: z.enum(["explicit", "context", "disclosed_default"]),
          })
          .strict(),
      )
      .max(8),
    requirements: z
      .array(
        z
          .object({
            id: handle,
            question: shortText,
            essential: z.boolean(),
            evidenceNeeded: z.array(handle).max(12),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    assumptions: z
      .array(
        z
          .object({
            id: handle,
            text: shortText,
            origin: z.enum([
              "user_stated",
              "user_confirmed",
              "disclosed_default",
            ]),
          })
          .strict(),
      )
      .max(12),
    unresolvedReferences: z.array(shortText).max(8),
  })
  .strict()
  .superRefine((brief, ctx) => {
    const ids = [
      ...brief.requirements.map((item) => item.id),
      ...brief.periods.map((item) => item.id),
      ...brief.assumptions.map((item) => item.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Brief IDs must be unique." });
    if (brief.periods.some((item) => item.from > item.through))
      ctx.addIssue({ code: "custom", message: "Use ordered periods." });
    if (!brief.requirements.some((item) => item.essential))
      ctx.addIssue({
        code: "custom",
        message: "A brief needs at least one essential requirement.",
      });
  });
export type AnalysisBrief = z.infer<typeof analysisBriefSchema>;

// ——— Evidence V2 (roadmap §5.2) ———

export const evidenceUnitSchema = z.enum([
  "centavos",
  "count",
  "percent",
  "score",
  "months",
  "correlation",
  "stage",
  "severity",
  "priority",
  "event",
  "relationship",
  "text",
  "boolean",
]);
export type EvidenceUnit = z.infer<typeof evidenceUnitSchema>;

export const evidenceScopeSchema = z
  .object({
    id: handle,
    type: z.enum([
      "whole_domain",
      "entity",
      "cohort",
      "relationship",
      "scenario",
    ]),
    description: shortText,
    entity: z.object({ type: handle, handle }).strict().optional(),
    /**
     * Membership in a defined set (a category among all categories, say).
     * Rankings and totals over the set require every member and a complete set.
     */
    cohort: z
      .object({
        setId: handle,
        member: handle,
        setSize: z.number().int().min(1).max(10_000),
        setComplete: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type EvidenceScope = z.infer<typeof evidenceScopeSchema>;

export const evidenceCoverageSchema = z
  .object({
    /** Did the query include every matching stored record? */
    query: z.enum(["complete", "partial", "unknown", "not_applicable"]),
    /** Is it known whether the user logged the real-world activity? */
    recording: z.enum(["complete", "partial", "unknown", "not_applicable"]),
    /** Is the window complete and aligned? */
    period: z.enum(["complete", "partial", "unknown", "not_applicable"]),
    /** Are links known, and current or historically recorded? */
    relationship: z.enum([
      "historical",
      "current_only",
      "unknown",
      "not_applicable",
    ]),
    recordsConsidered: z.number().int().min(0).nullable(),
    truncated: z.boolean(),
    missingPeriods: z.array(periodSchema).max(24),
  })
  .strict();
export type EvidenceCoverage = z.infer<typeof evidenceCoverageSchema>;

/**
 * The user-data domain an item comes from. Consent and provider policy are
 * decided per domain and field profile, so every item must name one.
 */
export const CONSENT_DOMAINS = [
  "money",
  "debts",
  "tasks",
  "goals",
  "career",
  "reviews",
  "knowledge",
  "decisions",
  "signals",
  "graph",
  "runway",
  "history",
  "timeline",
] as const;
export type ConsentDomain = (typeof CONSENT_DOMAINS)[number];

const evidenceBase = {
  version: z.literal("2"),
  id: handle,
  sourceType: handle,
  domain: z.enum(CONSENT_DOMAINS),
  calculationVersion: z.string().trim().min(1).max(16),
  semantics: z
    .object({
      /** Registry key from `semantics.ts`; never free text. */
      metricKey: handle,
      definition: shortText,
      aggregation: z.enum([
        "sum",
        "count",
        "mean",
        "difference",
        "percent",
        "coefficient",
        "latest",
        "estimate",
        "value",
      ]),
      /** Only items in the same group may be compared or combined. */
      comparableGroup: handle,
      currency: z.literal("PHP").optional(),
    })
    .strict(),
  scope: evidenceScopeSchema,
  time: z
    .object({
      period: periodSchema,
      timeZone: z.literal("Asia/Manila"),
      basis: z.enum(["event_date", "snapshot", "window", "assumption"]),
      retrievedAt: z.iso.datetime(),
      asOf: z.string().max(64).nullable(),
    })
    .strict(),
  coverage: evidenceCoverageSchema,
  provenance: z
    .object({
      tool: handle,
      sourceRefs: z
        .array(z.object({ handle, href: z.string().max(300) }).strict())
        .max(20),
      inputs: z.array(handle).max(20),
      legacyId: handle.nullable(),
    })
    .strict(),
  sharing: z
    .object({
      route: z.enum(["aggregate", "basic_context", "sensitive_narrative"]),
      allowedFields: z.array(handle).max(20),
    })
    .strict(),
  limitations: z.array(shortText).max(8),
};

export const evidenceV2Schema = z.discriminatedUnion("kind", [
  z
    .object({
      ...evidenceBase,
      kind: z.literal("metric"),
      value: z.number(),
      unit: evidenceUnitSchema,
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("record_fact"),
      value: z.union([z.string().max(200), z.number(), z.boolean()]),
      unit: evidenceUnitSchema,
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("text_excerpt"),
      text: z.string().max(600),
      attributedTo: z.enum(["user", "system"]),
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("graph_path"),
      path: z
        .array(z.object({ type: handle, handle }).strict())
        .min(2)
        .max(4),
      origin: z.enum(["native", "manual", "derived"]),
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("scenario_output"),
      value: z.number(),
      unit: evidenceUnitSchema,
      assumptions: z.array(shortText).max(8),
    })
    .strict(),
]);
export type EvidenceV2 = z.infer<typeof evidenceV2Schema>;
export type NumericEvidence = Extract<
  EvidenceV2,
  { kind: "metric" | "scenario_output" }
>;

// ——— Derived facts (roadmap §5.3) ———

export const DERIVED_OPERATIONS = [
  "sum",
  "difference",
  "ratio",
  "percent_change",
  "rank",
  "contribution",
] as const;
export type DerivedOperation = (typeof DERIVED_OPERATIONS)[number];

export const derivedFactSchema = z
  .object({
    version: z.literal("1"),
    id: handle,
    operation: z.enum(DERIVED_OPERATIONS),
    operationVersion: z.literal("1"),
    operands: z.array(handle).min(1).max(200),
    metricKey: handle,
    comparableGroup: handle,
    scopeId: handle,
    periods: z.array(periodSchema).min(1).max(4),
    rounding: z.enum(["none", "half_away_from_zero_tenths"]),
    denominatorRule: z.enum(["not_applicable", "nonzero_required"]),
    output: z.discriminatedUnion("status", [
      z
        .object({
          status: z.literal("defined"),
          value: z.number(),
          unit: evidenceUnitSchema,
        })
        .strict(),
      z
        .object({
          status: z.literal("undefined"),
          reason: z.enum(["zero_denominator", "incomplete_set"]),
        })
        .strict(),
    ]),
    ranking: z
      .array(
        z
          .object({
            member: handle,
            evidenceId: handle,
            value: z.number(),
            rank: z.number().int().min(1),
          })
          .strict(),
      )
      .max(200)
      .nullable(),
    top: z.array(handle).max(200).nullable(),
    tie: z.boolean().nullable(),
    reconciled: z.boolean().nullable(),
    complete: z.boolean(),
  })
  .strict();
export type DerivedFact = z.infer<typeof derivedFactSchema>;

// ——— Claim ledger (roadmap §5.4) ———

export const CLAIM_KINDS = [
  "fact",
  "calculation",
  "association",
  "interpretation",
  "hypothesis",
  "recommendation",
  "limitation",
] as const;

const comparisonSchema = z
  .object({
    subjectId: handle,
    referenceId: handle,
    direction: z.enum(["higher", "lower", "same"]),
  })
  .strict();

/** What a writer may propose. It never carries a verification verdict. */
export const draftClaimSchema = z
  .object({
    id: z.string().regex(/^c[1-9][0-9]?$/),
    kind: z.enum(CLAIM_KINDS),
    text: z.string().trim().min(8).max(600),
    answersRequirementIds: z.array(handle).max(6),
    evidenceIds: z.array(handle).max(8),
    derivedFactIds: z.array(handle).max(6),
    assumptionIds: z.array(handle).max(6),
    scopeId: handle,
    comparison: comparisonSchema.nullable(),
  })
  .strict();
export type DraftClaim = z.infer<typeof draftClaimSchema>;

export const claimVerificationSchema = z
  .object({
    structural: z.enum(["pending", "passed", "failed"]),
    deterministic: z.enum(["pending", "passed", "failed", "not_applicable"]),
    semantic: z.enum([
      "pending",
      "supported",
      "qualified",
      "unsupported",
      "not_required",
    ]),
    reasons: z.array(z.string().max(80)).max(12),
  })
  .strict();
export type ClaimVerification = z.infer<typeof claimVerificationSchema>;

export type AnalyticalClaim = DraftClaim & { verification: ClaimVerification };

// ——— Draft answer and final answer (roadmap §5.5) ———

const sectionHeading = z
  .string()
  .trim()
  .min(1)
  .max(60)
  // Labels carry no figures; figures belong in checked claims.
  .refine(
    (value) => !/\d/.test(value),
    "Section labels cannot contain figures.",
  );

/** A table whose cells are references; ATLAS renders every value itself. */
export const answerTableSchema = z
  .object({
    captionClaimId: draftClaimSchema.shape.id,
    columns: z.array(sectionHeading).min(1).max(6),
    rows: z
      .array(
        z
          .array(
            z.union([
              z.object({ ref: handle }).strict(),
              z.object({ label: sectionHeading }).strict(),
            ]),
          )
          .min(1)
          .max(6),
      )
      .min(1)
      .max(24),
  })
  .strict()
  .refine(
    (table) => table.rows.every((row) => row.length === table.columns.length),
    "Every row needs one cell per column.",
  );
export type AnswerTable = z.infer<typeof answerTableSchema>;

export const draftAnswerSchema = z
  .object({
    version: z.literal("2"),
    directAnswerClaimIds: z.array(draftClaimSchema.shape.id).min(1).max(3),
    claims: z.array(draftClaimSchema).min(1).max(16),
    sections: z
      .array(
        z
          .object({
            heading: sectionHeading,
            claimIds: z.array(draftClaimSchema.shape.id).min(1).max(8),
          })
          .strict(),
      )
      .max(6),
    table: answerTableSchema.nullable(),
  })
  .strict()
  .superRefine((draft, ctx) => {
    const ids = draft.claims.map((claim) => claim.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Claim IDs must be unique." });
    const known = new Set(ids);
    const referenced = [
      ...draft.directAnswerClaimIds,
      ...draft.sections.flatMap((section) => section.claimIds),
      ...(draft.table ? [draft.table.captionClaimId] : []),
    ];
    if (referenced.some((id) => !known.has(id)))
      ctx.addIssue({ code: "custom", message: "Unknown claim reference." });
  });
export type DraftAnswer = z.infer<typeof draftAnswerSchema>;

export const UNRESOLVED_REASONS = [
  "no_supported_claim",
  "claim_rejected",
  "insufficient_evidence",
  "unsupported_capability",
  "excluded_by_consent",
  "operational_failure",
] as const;
export type UnresolvedReason = (typeof UNRESOLVED_REASONS)[number];

export const requirementCoverageSchema = z
  .object({
    requirementId: handle,
    essential: z.boolean(),
    state: z.enum(["answered", "unresolved", "not_applicable"]),
    claimIds: z.array(handle).max(16),
    reason: z.enum(UNRESOLVED_REASONS).nullable(),
    /** AI-05 confirms that attached claims actually answer the requirement. */
    semantic: z.enum(["pending", "confirmed", "rejected"]),
  })
  .strict();
export type RequirementCoverage = z.infer<typeof requirementCoverageSchema>;

export type AnswerV2 = {
  version: "2";
  status: ResultStatus;
  directAnswerClaimIds: string[];
  claims: AnalyticalClaim[];
  sections: Array<{ heading: string; claimIds: string[] }>;
  table: AnswerTable | null;
  sources: Array<{ handle: string; href: string }>;
  coverage: RequirementCoverage[];
  unresolved: Array<{ requirementId: string; reason: UnresolvedReason }>;
  limitations: string[];
  assumptions: AnalysisBrief["assumptions"];
  model: { requested: string; resolved: string } | null;
  verification: {
    claimsProposed: number;
    claimsPassed: number;
    rejectionReasons: string[];
    semanticReview: "not_run";
    repairEligible: boolean;
  };
  /** AI-03 attaches the next-turn context reference. */
  nextTurnContext: null;
};
