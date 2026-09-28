import { describe, expect, it, vi } from "vitest";
import { RUN_BUDGETS, RunLedger } from "./budgets";
import { contribution } from "./calculations";
import { checkClaim } from "./claims";
import type { AnalysisBrief, DraftClaim } from "./contracts";
import { PERIODS } from "./evaluation/fixtures";
import {
  SPENDING_IDS,
  V2_NOW,
  categoryBreakdown,
  legacySpendingV2,
  wholeExpenseTotal,
} from "./evaluation/v2-fixtures";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import {
  REVIEW_LIMITS,
  REVIEW_SCHEMA,
  REVIEW_SYSTEM,
  applyReview,
  renderReviewInput,
  reviewerAgreement,
} from "./review";
import { createStageCaller } from "./stages";

/**
 * Opt-in live evaluation of the semantic reviewer on seeded synthetic claims
 * whose correct verdicts are known. It sends one metered request with
 * synthetic aggregates only. Run it only with explicit approval:
 * ATLAS_ANALYST_V2_LIVE_EVALS=1 and a configured OpenAI key and pool meter.
 * It reports false approvals and false rejections; it asserts no accuracy
 * threshold, since a single run is not a reliability estimate.
 */

vi.mock("server-only", () => ({}));
const enabled =
  process.env.ATLAS_ANALYST_V2_LIVE_EVALS === "1" &&
  Boolean(process.env.OPENAI_API_KEY);
const suite = enabled ? describe : describe.skip;

const now = categoryBreakdown("current", PERIODS.currentMonthToDate);
const before = categoryBreakdown("previous", PERIODS.previousAligned);
const totals = [
  wholeExpenseTotal("total.current", PERIODS.currentMonthToDate),
  wholeExpenseTotal("total.previous", PERIODS.previousAligned),
];
const evidence = [...legacySpendingV2(), ...now, ...before, ...totals];
const derived = [
  contribution("contrib", {
    totalCurrent: totals[0]!,
    totalPrevious: totals[1]!,
    current: now,
    previous: before,
  }),
];
const brief: AnalysisBrief = {
  version: "1",
  intent: "explain_change",
  language: "en",
  responseStyle: "standard",
  question: "Why did my recorded expenses rise this month?",
  resolvedEntities: [],
  periods: [],
  requirements: [
    {
      id: "why",
      question: "Which categories account for the rise",
      essential: true,
      evidenceNeeded: [],
    },
  ],
  assumptions: [],
  unresolvedReferences: [],
};
const cohort = "cohort:expense_by_category";
const seed = (
  id: string,
  text: string,
  kind: DraftClaim["kind"],
  refs: Partial<DraftClaim>,
): DraftClaim => ({
  id,
  kind,
  text,
  answersRequirementIds: ["why"],
  evidenceIds: [],
  derivedFactIds: ["contrib"],
  assumptionIds: [],
  scopeId: cohort,
  comparison: null,
  recommendation: null,
  ...refs,
});

const seeds: Array<{
  claim: DraftClaim;
  expected: "supported" | "qualified" | "unsupported";
}> = [
  {
    claim: seed("c1", "Recorded expenses were ₱11,000.00 this month.", "fact", {
      derivedFactIds: [],
      evidenceIds: [SPENDING_IDS.current],
      scopeId: "whole_domain:expense",
    }),
    expected: "supported",
  },
  {
    claim: seed(
      "c2",
      "Groceries and dining tied for the largest increase, ₱1,000.00 each.",
      "calculation",
      {},
    ),
    expected: "supported",
  },
  {
    claim: seed(
      "c3",
      "The increase may reflect higher recorded dining and groceries spending.",
      "interpretation",
      {},
    ),
    expected: "supported",
  },
  {
    claim: seed(
      "c4",
      "The increase may come mostly from health spending.",
      "interpretation",
      {},
    ),
    expected: "unsupported",
  },
  {
    claim: seed(
      "c5",
      "This may show that the user lacks self-control with food.",
      "interpretation",
      {},
    ),
    expected: "unsupported",
  },
  {
    claim: seed(
      "c6",
      "Recorded spending may keep rising every month from now on.",
      "interpretation",
      {},
    ),
    expected: "unsupported",
  },
];

suite("live semantic reviewer evaluation (opt-in)", () => {
  it("reports agreement on seeded claims", async () => {
    const ctx = {
      brief,
      evidence: new Map(evidence.map((item) => [item.id, item])),
      derived: new Map(derived.map((item) => [item.id, item])),
      now: V2_NOW,
    };
    const claims = seeds.map((item) => checkClaim(item.claim, ctx));
    // Only claims that pass deterministic checks reach the reviewer.
    expect(
      claims.every((item) => item.verification.deterministic === "passed"),
    ).toBe(true);
    const ledger = new RunLedger(RUN_BUDGETS.deep, Date.now);
    const call = createStageCaller({
      ledger,
      consent: legacyEquivalentConsent(new Date().toISOString()),
      route: SHARED_ROUTE,
    });
    const result = await call({
      stage: "critic",
      model: "gpt-5.4-mini-2026-03-17",
      schemaName: "atlas_answer_review",
      schema: REVIEW_SCHEMA,
      system: REVIEW_SYSTEM,
      payload: {
        stage: "critic",
        question: brief.question,
        history: [],
        evidence,
        labels: [],
      },
      render: renderReviewInput(brief, claims, derived),
      maxOutputTokens: REVIEW_LIMITS.outputTokens,
      timeoutMs: REVIEW_LIMITS.timeoutMs,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const applied = applyReview(result.content, brief, claims);
    const verdicts = new Map(
      applied.claims.map(
        (item) =>
          [
            item.id,
            item.verification.semantic === "not_required"
              ? "supported"
              : item.verification.semantic,
          ] as const,
      ),
    ) as Map<string, "supported" | "qualified" | "unsupported" | undefined>;
    const agreement = reviewerAgreement(
      seeds.map((item) => ({
        claimId: item.claim.id,
        expected: item.expected,
      })),
      verdicts,
    );
    console.info("Reviewer agreement", agreement, "usage", ledger.usage);
    expect(agreement.cases).toBe(seeds.length);
  }, 30_000);
});
