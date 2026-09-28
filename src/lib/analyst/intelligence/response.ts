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

/** Capabilities whose requirement only a cited ATLAS ranking answers. */
const RANKING_CAPABILITIES = new Set(["money.category_ranking"]);
const rankingFact = /^derived\.(?:rank|contribution)\./;

/**
 * Whether a claim answers a requirement: it is attached, ships and is not a
 * limitation, and a ranking question is answered by a claim that cites the
 * ranking, never by a total alone.
 */
export function answersRequirement(
  requirement: AnalysisBrief["requirements"][number],
  claim: AnalyticalClaim,
) {
  const ranked = requirement.evidenceNeeded.some((id) =>
    RANKING_CAPABILITIES.has(id),
  );
  return (
    claim.answersRequirementIds.includes(requirement.id) &&
    claimCanShip(claim) &&
    claim.kind !== "limitation" &&
    (!ranked || claim.derivedFactIds.some((id) => rankingFact.test(id)))
  );
}

/** Requirement coverage from the claims that survived checking. */
export function evaluateCoverage(
  brief: AnalysisBrief,
  claims: AnalyticalClaim[],
): RequirementCoverage[] {
  return brief.requirements.map((requirement) => {
    const attached = claims.filter((claim) =>
      claim.answersRequirementIds.includes(requirement.id),
    );
    const answering = attached.filter((claim) =>
      answersRequirement(requirement, claim),
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
      // A rejected answer is the gap even when a caveat shipped beside it;
      // it is never reported as missing records.
      reason: rejected
        ? "claim_rejected"
        : explained
          ? "insufficient_evidence"
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
  if (
    shipped.some((claim) => claim.kind === "limitation") &&
    !essential.some((item) => item.reason === "claim_rejected")
  )
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

/**
 * Recomputes an answer after its claims changed (semantic review, repair or a
 * merge). Coverage, status, unresolved reasons, sources, the direct answer
 * and sections are derived again from the claims that can ship. A reviewer's
 * "not answered" overrides an attached claim, and a reason already known
 * from the investigation (unsupported, excluded, missing data) replaces a
 * generic one.
 */
export function recomputeAnswer(
  answer: AnswerV2,
  brief: AnalysisBrief,
  options: {
    evidence: EvidenceV2[];
    derived: DerivedFact[];
    requirementVerdicts?: ReadonlyMap<string, boolean>;
    knownReasons?: ReadonlyMap<string, RequirementCoverage["reason"]>;
  },
): AnswerV2 {
  const coverage = evaluateCoverage(brief, answer.claims).map((item) => {
    const verdict = options.requirementVerdicts?.get(item.requirementId);
    let next: RequirementCoverage =
      verdict === undefined
        ? item
        : { ...item, semantic: verdict ? "confirmed" : "rejected" };
    if (verdict === false && next.state === "answered")
      next = {
        ...next,
        state: "unresolved",
        reason: "claim_rejected",
        claimIds: [],
      };
    const known = options.knownReasons?.get(item.requirementId);
    if (
      next.state === "unresolved" &&
      known &&
      next.reason !== "claim_rejected"
    )
      next = { ...next, reason: known };
    return next;
  });
  const shipped = answer.claims.filter(claimCanShip);
  const shippedIds = new Set(shipped.map((claim) => claim.id));
  const byEvidence = new Map(options.evidence.map((item) => [item.id, item]));
  const byDerived = new Map(options.derived.map((item) => [item.id, item]));
  const sources = new Map<string, string>();
  for (const claim of shipped) {
    const ids = [
      ...claim.evidenceIds,
      ...claim.derivedFactIds.flatMap(
        (id) => byDerived.get(id)?.operands ?? [],
      ),
    ];
    for (const id of ids)
      for (const ref of byEvidence.get(id)?.provenance.sourceRefs ?? [])
        sources.set(ref.handle, ref.href);
  }
  const unresolved = coverage.flatMap((item) =>
    item.state === "unresolved" && item.reason
      ? [{ requirementId: item.requirementId, reason: item.reason }]
      : [],
  );
  return {
    ...answer,
    status: resultStatus(coverage, shipped),
    directAnswerClaimIds: answer.directAnswerClaimIds.filter((id) =>
      shippedIds.has(id),
    ),
    sections: answer.sections
      .map((section) => ({
        ...section,
        claimIds: section.claimIds.filter((id) => shippedIds.has(id)),
      }))
      .filter((section) => section.claimIds.length > 0),
    table:
      answer.table && shippedIds.has(answer.table.captionClaimId)
        ? answer.table
        : null,
    sources: [...sources].map(([handle, href]) => ({ handle, href })),
    coverage,
    unresolved,
    verification: {
      ...answer.verification,
      claimsProposed: answer.claims.length,
      claimsPassed: shipped.length,
      rejectionReasons: [
        ...new Set(
          answer.claims.flatMap((claim) =>
            claimCanShip(claim) ? [] : claim.verification.reasons,
          ),
        ),
      ],
      repairEligible: coverage.some(
        (item) =>
          item.essential &&
          item.state === "unresolved" &&
          item.reason === "claim_rejected",
      ),
    },
  };
}
