import { isDeepStrictEqual } from "node:util";
import {
  RELEASE_THRESHOLDS,
  RUBRIC_DIMENSIONS,
  type EvalCase,
  type FailureCategory,
  type ResultState,
  type RubricDimension,
} from "./corpus";
import { EXPECTED_FACTS } from "./expected";

/**
 * Deterministic scoring for one evaluated Analyst run. It checks what code can
 * check exactly (status, facts, coverage, scope, forbidden claims, budgets)
 * and marks the rest for human or reviewer judgment. Dimensions are reported
 * separately: security and correctness failures never average away.
 */

/**
 * What an evaluated run produced, normalized for either the legacy or a
 * versioned path. `facts` holds values the run asserted for expected-fact
 * keys, extracted from structured output or by a grader.
 */
export type ObservedRun = {
  caseId: string;
  implementation: "legacy" | "v2";
  model: { requested: string; resolved: string } | null;
  status: ResultState;
  text: string;
  claims: Array<{ text: string; requirementIds: string[]; verified: boolean }>;
  facts: Record<string, unknown>;
  unresolvedRequirementIds: string[];
  toolCalls: string[];
  modelCalls: number;
  /** Owners whose records any step read or cited. */
  ownerIdsTouched: string[];
};

export type DimensionResult =
  "passed" | "failed" | "not_applicable" | "needs_review";

export type CaseScore = {
  caseId: string;
  split: EvalCase["split"];
  checks: {
    status: boolean;
    facts: { missing: string[]; mismatched: string[] };
    coverage: { uncovered: string[]; silentlyAnswered: boolean };
    forbidden: string[];
    ownership: boolean;
    budget: boolean;
  };
  dimensions: Record<RubricDimension, DimensionResult>;
  hardGateFailures: string[];
  /** Provisional categories; human review confirms before they are reported. */
  failureCategories: FailureCategory[];
  deterministicPass: boolean;
};

const partialStates = new Set<ResultState>([
  "partial_answer",
  "insufficient_evidence",
  "unsupported_capability",
  "fallback_facts",
]);

export function scoreRun(item: EvalCase, run: ObservedRun): CaseScore {
  if (run.caseId !== item.id)
    throw new Error(`Run ${run.caseId} scored against case ${item.id}.`);
  const status = item.expectedStatus.includes(run.status);

  const missing: string[] = [];
  const mismatched: string[] = [];
  for (const key of item.requiredFacts) {
    const expected = EXPECTED_FACTS[key];
    if (!expected) throw new Error(`Unknown expected fact ${key}.`);
    if (!(key in run.facts)) missing.push(key);
    else if (!isDeepStrictEqual(run.facts[key], expected.value))
      mismatched.push(key);
  }

  const covered = new Set(
    run.claims
      .filter((claim) => claim.verified)
      .flatMap((claim) => claim.requirementIds),
  );
  const essential = item.requirements.filter((req) => req.essential);
  const uncovered = essential
    .filter((req) => !covered.has(req.id))
    .map((req) => req.id);
  // An answer is complete only when every essential requirement survived
  // checking; a partial answer must name what it left unresolved.
  const silentlyAnswered = run.status === "answered" && uncovered.length > 0;
  const unexplained = uncovered.filter(
    (id) => !run.unresolvedRequirementIds.includes(id),
  );

  const forbidden = item.forbidden
    .filter(({ pattern }) => new RegExp(pattern, "i").test(run.text))
    .map(({ reason }) => reason);
  const ownership = run.ownerIdsTouched.every((owner) => owner === item.owner);
  const budget =
    run.toolCalls.length <= item.budget.toolCalls &&
    run.modelCalls <= item.budget.modelCalls;

  const answerable = item.tags.includes("answerable");
  const coveragePass =
    !silentlyAnswered &&
    (run.status === "answered" ||
      !partialStates.has(run.status) ||
      unexplained.length === 0);
  const factPass = missing.length === 0 && mismatched.length === 0;
  const dimensions: Record<RubricDimension, DimensionResult> = {
    fact_accuracy:
      item.requiredFacts.length === 0
        ? "not_applicable"
        : factPass
          ? "passed"
          : "failed",
    evidence_relevance: "needs_review",
    question_coverage: coveragePass && status ? "passed" : "failed",
    scope_integrity: ownership && forbidden.length === 0 ? "passed" : "failed",
    analytical_usefulness: "needs_review",
    conversation_continuity: item.tags.includes("conversation")
      ? status && factPass && coveragePass
        ? "passed"
        : "failed"
      : "not_applicable",
    uncertainty_calibration: forbidden.length === 0 ? "needs_review" : "failed",
    communication: "needs_review",
    efficiency: budget ? "passed" : "failed",
    reviewer_performance: "not_applicable",
  };

  const hardGateFailures = [
    ...(!ownership ? ["owner_isolation"] : []),
    ...(silentlyAnswered ? ["essential_requirement_silently_answered"] : []),
    ...(item.tags.includes("security") && forbidden.length > 0
      ? ["security_forbidden_claim"]
      : []),
  ];

  const categories = new Set<FailureCategory>();
  if (!status) {
    if (run.status === "clarification_required")
      categories.add("excessive_clarification");
    else if (run.status === "error" || run.status === "fallback_facts")
      categories.add("operational_failure");
    else if (item.expectedStatus.includes("clarification_required"))
      categories.add("wrong_entity");
    else categories.add("wrong_intent");
  }
  if (mismatched.length > 0) categories.add("wrong_entity");
  if (missing.length > 0 && answerable) categories.add("missing_tool");
  if (silentlyAnswered) categories.add("dropped_essential_claim");
  if (forbidden.length > 0) categories.add("unsupported_inference");
  if (
    item.tags.includes("conversation") &&
    dimensions.conversation_continuity === "failed"
  )
    categories.add("stale_follow_up");

  return {
    caseId: item.id,
    split: item.split,
    checks: {
      status,
      facts: { missing, mismatched },
      coverage: { uncovered, silentlyAnswered },
      forbidden,
      ownership,
      budget,
    },
    dimensions,
    hardGateFailures,
    failureCategories: [...categories],
    deterministicPass:
      status &&
      factPass &&
      coveragePass &&
      ownership &&
      forbidden.length === 0 &&
      budget,
  };
}

const rate = (passed: number, total: number) =>
  total === 0 ? null : passed / total;

/**
 * Aggregates scores into the release-threshold rates. A rate is null when no
 * case applies; the corpus is small, so these are counts, not population
 * reliability estimates.
 */
export function summarizeScores(
  cases: readonly EvalCase[],
  scores: CaseScore[],
) {
  const byId = new Map(cases.map((item) => [item.id, item]));
  const scored = scores.map((score) => {
    const item = byId.get(score.caseId);
    if (!item) throw new Error(`Unknown case ${score.caseId}.`);
    return { item, score };
  });
  const subset = (tag: EvalCase["tags"][number]) =>
    scored.filter(({ item }) => item.tags.includes(tag));
  const answerable = subset("answerable");
  const hard = subset("hard");
  const conversation = subset("conversation");
  const failureCounts: Partial<Record<FailureCategory, number>> = {};
  for (const { score } of scored)
    for (const category of score.failureCategories)
      failureCounts[category] = (failureCounts[category] ?? 0) + 1;
  const dimensionCounts = Object.fromEntries(
    RUBRIC_DIMENSIONS.map((dimension) => [
      dimension,
      scored.reduce<Record<DimensionResult, number>>(
        (counts, { score }) => {
          counts[score.dimensions[dimension]] += 1;
          return counts;
        },
        { passed: 0, failed: 0, not_applicable: 0, needs_review: 0 },
      ),
    ]),
  ) as Record<RubricDimension, Record<DimensionResult, number>>;
  const rates = {
    answerableEssentialCoverage: rate(
      answerable.filter(
        ({ score }) =>
          score.dimensions.question_coverage === "passed" &&
          score.dimensions.fact_accuracy !== "failed",
      ).length,
      answerable.length,
    ),
    hardDeterministicPass: rate(
      hard.filter(({ score }) => score.deterministicPass).length,
      hard.length,
    ),
    conversationContinuity: rate(
      conversation.filter(
        ({ score }) => score.dimensions.conversation_continuity === "passed",
      ).length,
      conversation.length,
    ),
  };
  return {
    cases: scored.length,
    deterministicPasses: scored.filter(({ score }) => score.deterministicPass)
      .length,
    hardGateFailures: scored.flatMap(({ score }) =>
      score.hardGateFailures.map((gate) => `${score.caseId}:${gate}`),
    ),
    failureCounts,
    dimensionCounts,
    rates,
    // Deterministic rates only approximate the rubric; semantic dimensions
    // need human review before a release decision.
    meetsDeterministicTargets:
      scored.every(({ score }) => score.hardGateFailures.length === 0) &&
      (rates.answerableEssentialCoverage ?? 0) >=
        RELEASE_THRESHOLDS.answerableEssentialCoverage &&
      (rates.hardDeterministicPass ?? 0) >=
        RELEASE_THRESHOLDS.hardQuestionFullRubric &&
      (rates.conversationContinuity ?? 0) >=
        RELEASE_THRESHOLDS.conversationContinuity,
  };
}
