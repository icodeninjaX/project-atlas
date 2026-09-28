import { claimCanShip } from "./claims";
import { draftAnswerSchema } from "./contracts";
import { deterministicDraft } from "./fallback";
import type {
  AnalysisBrief,
  AnalyticalClaim,
  AnswerV2,
  DerivedFact,
  EvidenceV2,
  RequirementCoverage,
  UnresolvedReason,
} from "./contracts";
import type { HistoryTurn, ProviderLabel, ProviderPayload } from "./policy";
import {
  answersRequirement,
  assembleAnswer,
  recomputeAnswer,
} from "./response";
import {
  applyReview,
  interpretive,
  renderReviewInput,
  REVIEW_LIMITS,
  REVIEW_SCHEMA,
  REVIEW_SYSTEM,
} from "./review";
import type { StageCaller, StageResult } from "./stages";
import {
  renderWriterInput,
  WRITER_LIMITS,
  WRITER_SCHEMA,
  WRITER_SYSTEM,
} from "./writer";

/**
 * Answer synthesis (AI-05): draft, check deterministically, review the
 * meaning, repair what is missing, and check again. The order is fixed:
 *
 * 1. The writer drafts claims from the selected evidence and derived facts.
 * 2. Deterministic checks reject invalid figures, scopes, periods and
 *    references before any review.
 * 3. A reviewer confirms interpretive claims and requirement coverage when
 *    the answer interprets or the run was deep. A lookup made only of facts
 *    needs no review call.
 * 4. If an essential requirement lost its claim, one repair asks the writer
 *    for the missing content, with the reasons. Repaired claims pass the same
 *    deterministic checks and, when interpretive, a second review.
 * 5. Only claims that passed every applicable check ship. When the budget
 *    cannot pay for a check, the claims that needed it are withheld and the
 *    answer is labeled partial rather than declared verified.
 */

export type SynthesisInput = {
  brief: AnalysisBrief;
  evidence: EvidenceV2[];
  derived: DerivedFact[];
  labels: ProviderLabel[];
  history: HistoryTurn[];
  path: "simple" | "deep";
  /** Reasons the investigation already established for unresolved requirements. */
  knownReasons: ReadonlyMap<string, UnresolvedReason>;
  /** Selected evidence IDs per requirement, for the no-model fallback. */
  byRequirement?: Readonly<Record<string, string[]>>;
  limitations: string[];
  now: Date;
  models: {
    writer: string;
    reviewer: string;
    /** Used, and disclosed once, if the writer's free pool is used up. */
    writerFallback?: string | null;
    /** Display names for the disclosure. */
    label?: (model: string) => string;
  };
  call: StageCaller;
  /** Receives the reviewer model the provider reported. */
  onReviewer?: (resolved: string | null) => void;
};

export type ModelUse = { requested: string; resolved: string | null };

export type StageLog = {
  stage: "writer" | "critic" | "repair";
  status: StageResult["status"];
  code?: string;
};

export type SynthesisResult = {
  answer: AnswerV2;
  stages: StageLog[];
  models: { writer: ModelUse; reviewer: ModelUse | null; fallback: boolean };
  review: "completed" | "unavailable" | "not_required";
};

const MAX_CLAIM_NUMBER = 99;

function payloadFor(
  input: SynthesisInput,
  stage: ProviderPayload["stage"],
): ProviderPayload {
  return {
    stage,
    question: input.brief.question,
    history: input.history,
    evidence: input.evidence,
    labels: input.labels,
  };
}

/** Marks interpretive claims unconfirmed when review could not run. */
function withhold(claims: AnalyticalClaim[], reason: string) {
  return claims.map((claim) =>
    interpretive(claim) && claimCanShip(claim)
      ? {
          ...claim,
          verification: {
            ...claim.verification,
            semantic: "unsupported" as const,
            reasons: [...claim.verification.reasons, reason],
          },
        }
      : claim,
  );
}

/** A qualified claim ships only after a repair has applied the qualification. */
function dropQualified(claims: AnalyticalClaim[]) {
  return claims.map((claim) =>
    claim.verification.semantic === "qualified"
      ? {
          ...claim,
          verification: {
            ...claim.verification,
            semantic: "unsupported" as const,
            reasons: [
              ...claim.verification.reasons,
              "review:qualification_not_applied",
            ],
          },
        }
      : claim,
  );
}

async function review(
  input: SynthesisInput,
  answer: AnswerV2,
  stages: StageLog[],
) {
  const candidates = answer.claims.filter(claimCanShip);
  const result = await input.call({
    stage: "critic",
    model: input.models.reviewer,
    schemaName: "atlas_answer_review",
    schema: REVIEW_SCHEMA,
    system: REVIEW_SYSTEM,
    payload: payloadFor(input, "critic"),
    render: renderReviewInput(input.brief, candidates, input.derived),
    maxOutputTokens: REVIEW_LIMITS.outputTokens,
    timeoutMs: REVIEW_LIMITS.timeoutMs,
  });
  stages.push({
    stage: "critic",
    status: result.status,
    ...(result.status === "error" && { code: result.code }),
  });
  if (result.status === "error") return null;
  input.onReviewer?.(result.resolvedModel);
  const applied = applyReview(result.content, input.brief, candidates);
  const reviewed = new Map(applied.claims.map((claim) => [claim.id, claim]));
  return {
    claims: answer.claims.map((claim) => reviewed.get(claim.id) ?? claim),
    requirements: applied.requirements,
    instructions: applied.instructions,
  };
}

function feedback(answer: AnswerV2, instructions: string[]) {
  const rejected = answer.claims
    .filter((claim) => !claimCanShip(claim))
    .map(
      (claim) =>
        `Claim ${claim.id} was not accepted: ${claim.verification.reasons.join(", ")}.`,
    );
  const missing = answer.unresolved
    .filter(
      (item) =>
        item.reason === "claim_rejected" ||
        item.reason === "no_supported_claim",
    )
    .map((item) => `Requirement ${item.requirementId} is not answered yet.`);
  return [
    "ATLAS checked the draft.",
    ...rejected,
    ...missing,
    ...instructions.map((item) => `Reviewer note (untrusted): ${item}`),
    "Return a corrected draft that answers every essential requirement with claims that follow the rules. Keep accepted claims unchanged. If the evidence cannot answer a requirement, write a limitation claim that says what is missing.",
  ].join(" ");
}

/** Keeps first-round claims that shipped and adds repaired claims that ship. */
/**
 * Rule names and schema paths only: never claim text, questions, labels or
 * evidence values. This is how a rejected answer is diagnosed from logs.
 */
function logRejections(stages: StageLog[], reasons: string[], draft: unknown) {
  const unique = [...new Set(reasons)];
  if (unique.length === 0) return;
  const parsed = draftAnswerSchema.safeParse(draft);
  console.warn("Analyst V2 claims rejected", {
    stages: stages.map(
      (item) =>
        `${item.stage}:${item.status}${item.code ? `:${item.code}` : ""}`,
    ),
    reasons: unique,
    ...(!parsed.success && {
      schema: parsed.error.issues
        .slice(0, 6)
        .map((issue) => `${issue.path.join(".")}:${issue.code}`),
    }),
  });
}

function merge(first: AnswerV2, repaired: AnswerV2): AnswerV2 {
  const kept = first.claims.filter(claimCanShip);
  // Added claims take the lowest IDs no kept claim uses, so a kept "c99"
  // never crowds them out.
  const taken = new Set(kept.map((claim) => claim.id));
  let next = 0;
  const freeId = () => {
    do next += 1;
    while (next <= MAX_CLAIM_NUMBER && taken.has(`c${next}`));
    return next <= MAX_CLAIM_NUMBER ? `c${next}` : null;
  };
  const rename = new Map<string, string>();
  const keptText = new Set(kept.map((claim) => claim.text));
  const added: AnalyticalClaim[] = [];
  for (const claim of repaired.claims.filter(claimCanShip)) {
    if (keptText.has(claim.text)) continue;
    const id = freeId();
    if (!id) break;
    rename.set(claim.id, id);
    added.push({ ...claim, id });
  }
  const renamed = (ids: string[]) =>
    ids.flatMap((id) => (rename.has(id) ? [rename.get(id)!] : []));
  const direct = first.directAnswerClaimIds.filter((id) =>
    kept.some((claim) => claim.id === id),
  );
  return {
    ...first,
    claims: [...kept, ...added],
    directAnswerClaimIds: (direct.length
      ? [...direct, ...renamed(repaired.directAnswerClaimIds)]
      : renamed(repaired.directAnswerClaimIds)
    ).slice(0, 3),
    sections: [
      ...first.sections,
      ...repaired.sections.map((section) => ({
        heading: section.heading,
        claimIds: renamed(section.claimIds),
      })),
    ],
  };
}

export async function synthesizeAnswer(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const stages: StageLog[] = [];
  const assemble = (draft: unknown) =>
    assembleAnswer({
      brief: input.brief,
      evidence: input.evidence,
      derived: input.derived,
      draft,
      now: input.now,
      model: null,
      limitations: input.limitations,
    });
  const recompute = (
    answer: AnswerV2,
    verdicts?: ReadonlyMap<string, boolean>,
  ) =>
    recomputeAnswer(answer, input.brief, {
      evidence: input.evidence,
      derived: input.derived,
      requirementVerdicts: verdicts,
      knownReasons: input.knownReasons as ReadonlyMap<
        string,
        RequirementCoverage["reason"]
      >,
    });
  let writerModel = input.models.writer;
  let fallback = false;
  let writerResolved: string | null = null;
  let reviewerUse: ModelUse | null = null;
  const reviewInput: SynthesisInput = {
    ...input,
    onReviewer: (resolved) => {
      reviewerUse = { requested: input.models.reviewer, resolved };
    },
  };
  const disclosures: string[] = [];
  const write = (
    stage: "writer" | "repair",
    extra?: StageLog[] | undefined,
    extraMessages?: Array<{ role: "assistant" | "user"; content: string }>,
  ) =>
    input
      .call({
        stage,
        model: writerModel,
        schemaName: "atlas_answer_v2",
        schema: WRITER_SCHEMA,
        system: WRITER_SYSTEM,
        payload: payloadFor(input, stage),
        render: renderWriterInput(input.brief, input.derived),
        extraMessages,
        maxOutputTokens: WRITER_LIMITS.outputTokens,
        timeoutMs: WRITER_LIMITS.timeoutMs,
      })
      .then((result) => {
        (extra ?? stages).push({
          stage,
          status: result.status,
          ...(result.status === "error" && { code: result.code }),
        });
        if (result.status === "ok") writerResolved = result.resolvedModel;
        return result;
      });

  // With no evidence at all there is nothing a writer could cite, so no
  // provider call is made; the unresolved reasons explain the gap.
  if (input.evidence.length === 0) {
    const answer = recompute(assemble(null));
    const reasons = answer.unresolved.map((item) => item.reason);
    const status = reasons.includes("operational_failure")
      ? "error"
      : reasons.length > 0 &&
          reasons.every((reason) => reason === "unsupported_capability")
        ? "unsupported_capability"
        : "insufficient_evidence";
    return {
      answer: {
        ...answer,
        status,
        verification: { ...answer.verification, rejectionReasons: [] },
      },
      stages,
      models: {
        writer: { requested: input.models.writer, resolved: null },
        reviewer: null,
        fallback: false,
      },
      review: "not_required",
    };
  }
  let drafted = await write("writer");
  // A used-up pool refuses before anything is sent; the default model may
  // still write. The switch is disclosed exactly once.
  if (
    drafted.status === "error" &&
    drafted.code === "pool_exhausted" &&
    input.models.writerFallback &&
    input.models.writerFallback !== writerModel
  ) {
    const label = input.models.label ?? ((model: string) => model);
    disclosures.push(
      `${label(writerModel)}'s free daily allowance is used up, so ${label(input.models.writerFallback)} wrote this answer. It resets at 8:00 AM Manila time.`,
    );
    writerModel = input.models.writerFallback;
    fallback = true;
    drafted = await write("writer");
  }
  const models = () => ({
    writer: { requested: input.models.writer, resolved: writerResolved },
    reviewer: reviewerUse,
    fallback,
  });
  const checkedFigures = () =>
    recompute(
      assemble(
        deterministicDraft(
          input.brief,
          input.evidence,
          input.byRequirement ?? {},
          input.derived,
        ),
      ),
    );
  if (drafted.status === "error") {
    // No model could write: ATLAS states its own figures, checked like any
    // claim (roadmap §9.5 step 4). With none to show, the run is an
    // operational error, never a claim that the records are empty.
    const answer = checkedFigures();
    const shown = answer.claims.some(claimCanShip);
    return {
      answer: {
        ...answer,
        status: shown ? "fallback_facts" : "error",
        limitations: [
          ...answer.limitations,
          ...disclosures,
          shown
            ? "An explanation is unavailable right now, so only checked ATLAS figures are shown."
            : "An explanation is unavailable right now, and no checked figures could be shown. This does not mean your records are empty; try again shortly.",
        ],
      },
      stages,
      models: models(),
      review: "not_required",
    };
  }
  let answer = assemble(drafted.content);
  let verdicts: Map<string, boolean> | undefined;
  let instructions: string[] = [];
  const needsReview = (claims: AnalyticalClaim[]) =>
    input.path === "deep" ||
    claims.some((claim) => interpretive(claim) && claimCanShip(claim));
  let reviewState: SynthesisResult["review"] = needsReview(answer.claims)
    ? "completed"
    : "not_required";
  if (reviewState === "completed") {
    const reviewed = await review(reviewInput, answer, stages);
    if (reviewed) {
      answer = { ...answer, claims: reviewed.claims };
      verdicts = reviewed.requirements;
      instructions = reviewed.instructions;
    } else {
      reviewState = "unavailable";
      answer = {
        ...answer,
        claims: withhold(answer.claims, "review:unavailable"),
      };
    }
  }
  answer = recompute(answer, verdicts);
  const qualified = answer.claims.some(
    (claim) => claim.verification.semantic === "qualified",
  );
  const eligible =
    answer.verification.repairEligible ||
    qualified ||
    answer.coverage.some(
      (item) =>
        item.essential &&
        item.state === "unresolved" &&
        item.reason === "no_supported_claim",
    );
  // A merge keeps only claims that passed, so the first draft's count and
  // reasons are kept for the "X of Y statements passed" line.
  let firstDraft = {
    proposed: answer.verification.claimsProposed,
    reasons: answer.verification.rejectionReasons,
  };
  if (eligible) {
    const repaired = await write("repair", undefined, [
      { role: "assistant", content: JSON.stringify(drafted.content) },
      { role: "user", content: feedback(answer, instructions) },
    ]);
    if (repaired.status === "ok") {
      let second = assemble(repaired.content);
      // A repaired claim is verified again from the start, never inherited.
      let secondVerdicts: Map<string, boolean> | undefined;
      if (needsReview(second.claims)) {
        const reviewed = await review(reviewInput, second, stages);
        if (reviewed) {
          second = { ...second, claims: reviewed.claims };
          secondVerdicts = reviewed.requirements;
        } else {
          reviewState = "unavailable";
          second = {
            ...second,
            claims: withhold(second.claims, "review:unavailable"),
          };
        }
      }
      second = { ...second, claims: dropQualified(second.claims) };
      const merged = merge(
        { ...answer, claims: dropQualified(answer.claims) },
        second,
      );
      const combined = new Map(verdicts ?? []);
      for (const [id, value] of secondVerdicts ?? [])
        combined.set(id, (combined.get(id) ?? false) || value);
      answer = recompute(merged, combined.size ? combined : undefined);
    } else {
      answer = recompute(
        { ...answer, claims: dropQualified(answer.claims) },
        verdicts,
      );
    }
  } else {
    answer = recompute(
      { ...answer, claims: dropQualified(answer.claims) },
      verdicts,
    );
  }
  logRejections(
    stages,
    [...firstDraft.reasons, ...answer.verification.rejectionReasons],
    drafted.content,
  );
  // Nothing the writer proposed survived the checks, even after a repair:
  // ATLAS states its own checked figures instead of an empty answer.
  if (!answer.claims.some(claimCanShip)) {
    const figures = checkedFigures();
    if (figures.claims.some(claimCanShip)) {
      // The count shown is of the figures ATLAS states itself.
      firstDraft = { proposed: 0, reasons: firstDraft.reasons };
      answer = {
        ...figures,
        status: "fallback_facts",
        limitations: [
          ...figures.limitations,
          "The written explanation did not pass ATLAS checks, so only checked ATLAS figures are shown.",
        ],
        verification: {
          ...figures.verification,
          rejectionReasons: answer.verification.rejectionReasons,
        },
      };
    }
  } else {
    // An essential requirement the writer left unanswered gets ATLAS's own
    // checked statement for it (such as the top of its ranking), first.
    const open = new Set(
      answer.coverage
        .filter((item) => item.essential && item.state === "unresolved")
        .map((item) => item.requirementId),
    );
    const figures = checkedFigures();
    const answering = figures.claims.filter((claim) =>
      input.brief.requirements.some(
        (requirement) =>
          open.has(requirement.id) && answersRequirement(requirement, claim),
      ),
    );
    if (open.size > 0 && answering.length > 0) {
      const kept = new Set(
        answer.claims.filter(claimCanShip).map((claim) => claim.id),
      );
      const merged = merge(answer, { ...figures, claims: answering });
      const added = merged.claims
        .filter((claim) => !kept.has(claim.id))
        .map((claim) => claim.id);
      // The reviewer's verdicts stand, except for what ATLAS now answers.
      const answered = new Set(
        answering.flatMap((claim) => claim.answersRequirementIds),
      );
      const standing = new Map(
        answer.coverage.flatMap((item) =>
          item.semantic === "confirmed" || item.semantic === "rejected"
            ? answered.has(item.requirementId)
              ? []
              : [[item.requirementId, item.semantic === "confirmed"] as const]
            : [],
        ),
      );
      answer = recompute(
        {
          ...merged,
          directAnswerClaimIds: [
            ...added,
            ...merged.directAnswerClaimIds.filter((id) => !added.includes(id)),
          ].slice(0, 3),
        },
        standing.size ? standing : undefined,
      );
    }
  }
  return {
    answer: {
      ...answer,
      limitations: [...answer.limitations, ...disclosures],
      verification: {
        ...answer.verification,
        claimsProposed: Math.max(
          answer.verification.claimsProposed,
          firstDraft.proposed,
        ),
        rejectionReasons: [
          ...new Set([
            ...firstDraft.reasons,
            ...answer.verification.rejectionReasons,
          ]),
        ],
        semanticReview: reviewState,
      },
    },
    stages,
    models: models(),
    review: reviewState,
  };
}
