import { checkClaim, claimCanShip, type ClaimCheckContext } from "./claims";
import {
  draftAnswerSchema,
  type AnalysisBrief,
  type AnalyticalClaim,
  type AnswerV2,
  type DerivedFact,
  type EvidenceV2,
  type RequirementCoverage,
  type ResultStatus,
} from "./contracts";

/**
 * Validated AnswerV2 assembly. Every visible element maps to a checked claim
 * or a server-rendered reference: the direct answer and sections list claim
 * IDs, table cells are evidence or derived-fact references, and a table's
 * caption claim must cite every value in it. Coverage is computed after
 * rejected claims are removed, so a surviving trivial claim cannot make an
 * incomplete answer look complete.
 */

/** Requirement coverage from the claims that survived checking. */
export function evaluateCoverage(
  brief: AnalysisBrief,
  claims: AnalyticalClaim[],
): RequirementCoverage[] {
  return brief.requirements.map((requirement) => {
    const attached = claims.filter((claim) =>
      claim.answersRequirementIds.includes(requirement.id),
    );
    const answering = attached.filter(
      (claim) => claimCanShip(claim) && claim.kind !== "limitation",
    );
    if (answering.length > 0)
      return {
        requirementId: requirement.id,
        essential: requirement.essential,
        state: "answered",
        claimIds: answering.map((claim) => claim.id),
        reason: null,
        semantic: "pending",
      };
    const explained = attached.some(
      (claim) => claimCanShip(claim) && claim.kind === "limitation",
    );
    const rejected = attached.some((claim) => !claimCanShip(claim));
    return {
      requirementId: requirement.id,
      essential: requirement.essential,
      state: "unresolved",
      claimIds: attached.filter(claimCanShip).map((claim) => claim.id),
      reason: explained
        ? "insufficient_evidence"
        : rejected
          ? "claim_rejected"
          : "no_supported_claim",
      semantic: "pending",
    };
  });
}

export function resultStatus(
  coverage: RequirementCoverage[],
  shipped: AnalyticalClaim[],
): ResultStatus {
  const essential = coverage.filter((item) => item.essential);
  if (essential.every((item) => item.state === "answered")) return "answered";
  if (coverage.some((item) => item.state === "answered"))
    return "partial_answer";
  if (shipped.some((claim) => claim.kind === "limitation"))
    return "insufficient_evidence";
  return "fallback_facts";
}

export type AssembleInput = {
  brief: AnalysisBrief;
  evidence: EvidenceV2[];
  derived: DerivedFact[];
  draft: unknown;
  now: Date;
  model?: { requested: string; resolved: string } | null;
  /** Operational limitations from retrieval, shown with the answer. */
  limitations?: string[];
};

export function assembleAnswer(input: AssembleInput): AnswerV2 {
  const ctx: ClaimCheckContext = {
    brief: input.brief,
    evidence: new Map(input.evidence.map((item) => [item.id, item])),
    derived: new Map(input.derived.map((item) => [item.id, item])),
    now: input.now,
  };
  const parsed = draftAnswerSchema.safeParse(input.draft);
  const base = {
    version: "2" as const,
    assumptions: input.brief.assumptions,
    model: input.model ?? null,
    nextTurnContext: null,
  };
  if (!parsed.success) {
    const coverage = evaluateCoverage(input.brief, []);
    return {
      ...base,
      status: "fallback_facts",
      directAnswerClaimIds: [],
      claims: [],
      sections: [],
      table: null,
      sources: [],
      coverage,
      unresolved: unresolvedOf(coverage),
      limitations: input.limitations ?? [],
      verification: {
        claimsProposed: 0,
        claimsPassed: 0,
        rejectionReasons: ["schema"],
        semanticReview: "not_run",
        repairEligible: true,
      },
    };
  }
  const draft = parsed.data;
  const checked = draft.claims.map((claim) => checkClaim(claim, ctx));
  // A table caption must cite every value shown in its table.
  if (draft.table) {
    const caption = checked.find(
      (claim) => claim.id === draft.table!.captionClaimId,
    )!;
    const cited = new Set([...caption.evidenceIds, ...caption.derivedFactIds]);
    const refs = draft.table.rows
      .flat()
      .flatMap((cell) => ("ref" in cell ? [cell.ref] : []));
    if (refs.some((ref) => !cited.has(ref))) {
      caption.verification.deterministic = "failed";
      caption.verification.reasons.push("table_reference");
    }
  }
  const shipped = checked.filter(claimCanShip);
  const shippedIds = new Set(shipped.map((claim) => claim.id));
  const coverage = evaluateCoverage(input.brief, checked);
  const status = resultStatus(coverage, shipped);
  const table =
    draft.table && shippedIds.has(draft.table.captionClaimId)
      ? draft.table
      : null;
  const sourceRefs = new Map<string, string>();
  const derivedById = ctx.derived;
  const addEvidence = (id: string) => {
    for (const ref of ctx.evidence.get(id)?.provenance.sourceRefs ?? [])
      sourceRefs.set(ref.handle, ref.href);
  };
  for (const claim of shipped) {
    claim.evidenceIds.forEach(addEvidence);
    for (const id of claim.derivedFactIds)
      for (const operand of derivedById.get(id)?.operands ?? [])
        addEvidence(operand);
  }
  const unresolved = unresolvedOf(coverage);
  return {
    ...base,
    status,
    directAnswerClaimIds: draft.directAnswerClaimIds.filter((id) =>
      shippedIds.has(id),
    ),
    claims: checked,
    sections: draft.sections
      .map((section) => ({
        heading: section.heading,
        claimIds: section.claimIds.filter((id) => shippedIds.has(id)),
      }))
      .filter((section) => section.claimIds.length > 0),
    table,
    sources: [...sourceRefs].map(([handle, href]) => ({ handle, href })),
    coverage,
    unresolved,
    limitations: input.limitations ?? [],
    verification: {
      claimsProposed: checked.length,
      claimsPassed: shipped.length,
      rejectionReasons: [
        ...new Set(
          checked.flatMap((claim) =>
            claimCanShip(claim) ? [] : claim.verification.reasons,
          ),
        ),
      ],
      semanticReview: "not_run",
      // A repair can help only when an essential requirement lost its claim.
      repairEligible: coverage.some(
        (item) =>
          item.essential &&
          item.state === "unresolved" &&
          item.reason === "claim_rejected",
      ),
    },
  };
}

function unresolvedOf(coverage: RequirementCoverage[]) {
  return coverage.flatMap((item) =>
    item.state === "unresolved" && item.reason
      ? [{ requirementId: item.requirementId, reason: item.reason }]
      : [],
  );
}
