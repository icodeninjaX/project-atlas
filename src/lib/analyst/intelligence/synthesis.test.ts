import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUN_BUDGETS, RunLedger } from "./budgets";
import { contribution } from "./calculations";
import type { AnalysisBrief, DraftClaim, EvidenceV2 } from "./contracts";
import { PERIODS } from "./evaluation/fixtures";
import {
  SPENDING_IDS,
  V2_NOW,
  categoryBreakdown,
  legacySpendingV2,
  wholeExpenseTotal,
} from "./evaluation/v2-fixtures";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { reviewerAgreement } from "./review";
import { createStageCaller } from "./stages";
import { synthesizeAnswer, type SynthesisInput } from "./synthesis";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/pool-meter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/pool-meter")>()),
  meteredOpenAIFetch: (
    url: string,
    init: RequestInit,
    options: { fetch?: typeof fetch },
  ) => (options.fetch ?? globalThis.fetch)(url, init),
}));

const priorKey = process.env.OPENAI_API_KEY;
beforeEach(() => {
  process.env.OPENAI_API_KEY = "sk-synthetic";
});
afterEach(() => {
  process.env.OPENAI_API_KEY = priorKey;
});

const now = categoryBreakdown("current", PERIODS.currentMonthToDate);
const before = categoryBreakdown("previous", PERIODS.previousAligned);
const totals = [
  wholeExpenseTotal("total.current", PERIODS.currentMonthToDate),
  wholeExpenseTotal("total.previous", PERIODS.previousAligned),
];
const evidence: EvidenceV2[] = [
  ...legacySpendingV2(),
  ...now,
  ...before,
  ...totals,
];
const derived = [
  contribution("contrib", {
    totalCurrent: totals[0]!,
    totalPrevious: totals[1]!,
    current: now,
    previous: before,
  }),
];
const cohort = "cohort:expense_by_category";

function brief(
  requirements: Array<[string, boolean]>,
  extra: Partial<AnalysisBrief> = {},
): AnalysisBrief {
  return {
    version: "1",
    intent: "explain_change",
    language: "en",
    responseStyle: "standard",
    question:
      "Why did my recorded expenses rise this month, and what should I review?",
    resolvedEntities: [],
    periods: [],
    requirements: requirements.map(([id, essential]) => ({
      id,
      question: `Requirement ${id}`,
      essential,
      evidenceNeeded: [],
    })),
    assumptions: [
      {
        id: "a1",
        text: "The user wants to keep dining spending near last month's level.",
        origin: "user_stated",
      },
    ],
    unresolvedReferences: [],
    ...extra,
  };
}

const claim = (
  id: string,
  text: string,
  extra: Partial<DraftClaim> = {},
): DraftClaim => ({
  id,
  kind: "fact",
  text,
  answersRequirementIds: ["total"],
  evidenceIds: [],
  derivedFactIds: [],
  assumptionIds: [],
  scopeId: "whole_domain:expense",
  comparison: null,
  recommendation: null,
  ...extra,
});
const draft = (claims: DraftClaim[], direct = [claims[0]!.id]) => ({
  version: "2",
  directAnswerClaimIds: direct,
  claims,
  sections: [],
  table: null,
});
const total = claim("c1", "Recorded expenses were ₱11,000.00 this month.", {
  evidenceIds: [SPENDING_IDS.current],
});
const tie = claim(
  "c2",
  "Groceries and dining tied for the largest increase, ₱1,000.00 each.",
  {
    kind: "calculation",
    derivedFactIds: ["contrib"],
    scopeId: cohort,
    answersRequirementIds: ["why"],
  },
);
const recommendation = claim(
  "c3",
  "If you want dining back near last month, consider reviewing this month's dining transactions first.",
  {
    kind: "recommendation",
    derivedFactIds: ["contrib"],
    scopeId: cohort,
    assumptionIds: ["a1"],
    answersRequirementIds: ["next"],
    recommendation: {
      objectiveRequirementId: "next",
      constraints: ["Only recorded transactions are known"],
      tradeoff:
        "Reviewing dining first leaves groceries, which rose by the same amount, for later.",
      nextAction: { label: "Open transactions", href: "/money/transactions" },
      conditional: true,
    },
  },
);
const verdict = (
  claimId: string,
  value: "supported" | "qualified" | "unsupported",
  cites: string[] = [],
  issues: string[] = [],
) => ({ claimId, verdict: value, issues, citesEvidenceIds: cites });
const reviewOf = (
  claims: unknown[],
  requirements: Array<[string, boolean, string[]]>,
  extra: Record<string, unknown> = {},
) => ({
  claims,
  requirements: requirements.map(([requirementId, answered, byClaimIds]) => ({
    requirementId,
    answered,
    byClaimIds,
  })),
  contradictions: [],
  repairInstructions: [],
  ...extra,
});

type Script = { atlas_answer_v2: unknown[]; atlas_answer_review: unknown[] };
function provider(script: Script) {
  const bodies: Array<{ name: string; body: string }> = [];
  const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = String(init?.body);
    const name = JSON.parse(body).response_format.json_schema
      .name as keyof Script;
    bodies.push({ name, body });
    const next = script[name].shift();
    if (next === "error") return new Response("{}", { status: 500 });
    return Response.json({
      model: JSON.parse(body).model,
      usage: { prompt_tokens: 900, completion_tokens: 300 },
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(next) } },
      ],
    });
  });
  return { fetch, bodies };
}

function run(
  script: Script,
  input: Partial<SynthesisInput> & { budget?: typeof RUN_BUDGETS.deep } = {},
) {
  const { fetch, bodies } = provider(script);
  const ledger = new RunLedger(input.budget ?? RUN_BUDGETS.deep, () => 0);
  const call = createStageCaller({
    ledger,
    consent: legacyEquivalentConsent("2026-09-24T00:00:00.000Z"),
    route: SHARED_ROUTE,
    fetch: fetch as typeof globalThis.fetch,
  });
  const result = synthesizeAnswer({
    brief: brief([["total", true]]),
    evidence,
    derived,
    labels: [],
    history: [],
    path: "simple",
    knownReasons: new Map(),
    limitations: [],
    now: V2_NOW,
    models: {
      writer: "gpt-4o-mini-2024-07-18",
      reviewer: "gpt-5.4-mini-2026-03-17",
    },
    call,
    ...input,
  });
  return { result, bodies, ledger };
}

const stages = (result: Awaited<ReturnType<typeof synthesizeAnswer>>) =>
  result.stages.map((item) => `${item.stage}:${item.status}`);
const shipped = (result: Awaited<ReturnType<typeof synthesizeAnswer>>) =>
  result.answer.claims
    .filter(
      (item) =>
        item.verification.deterministic === "passed" &&
        item.verification.semantic !== "unsupported" &&
        item.verification.semantic !== "qualified",
    )
    .map((item) => item.id);

describe("answer synthesis", () => {
  it("answers a facts-only lookup without a review call", async () => {
    const { result } = run({
      atlas_answer_v2: [draft([total])],
      atlas_answer_review: [],
    });
    const answer = await result;
    expect(answer.answer.status).toBe("answered");
    expect(stages(answer)).toEqual(["writer:ok"]);
    expect(answer.review).toBe("not_required");
  });

  it("ships a supported ranking and a conditional recommendation with its trade-off", async () => {
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, tie, recommendation])],
        atlas_answer_review: [
          reviewOf(
            [
              verdict("c1", "supported", [SPENDING_IDS.current]),
              verdict("c2", "supported", ["contrib"]),
              verdict("c3", "supported", ["contrib"]),
            ],
            [
              ["total", true, ["c1"]],
              ["why", true, ["c2"]],
              ["next", true, ["c3"]],
            ],
          ),
        ],
      },
      {
        brief: brief([
          ["total", true],
          ["why", true],
          ["next", true],
        ]),
        path: "deep",
      },
    );
    const answer = await result;
    expect(answer.answer.status).toBe("answered");
    expect(stages(answer)).toEqual(["writer:ok", "critic:ok"]);
    expect(answer.answer.verification.semanticReview).toBe("completed");
    const rec = answer.answer.claims.find((item) => item.id === "c3");
    expect(rec?.verification).toMatchObject({
      deterministic: "passed",
      semantic: "supported",
    });
    expect(rec?.recommendation?.tradeoff).toMatch(/groceries/);
    expect(
      answer.answer.coverage.every((item) => item.semantic === "confirmed"),
    ).toBe(true);
  });

  it("rejects an unsupported interpretation and repairs the missing answer", async () => {
    const overreach = claim(
      "c2",
      "The rise may mean dining habits are out of control.",
      {
        kind: "interpretation",
        derivedFactIds: ["contrib"],
        scopeId: cohort,
        answersRequirementIds: ["why"],
      },
    );
    const hedged = claim(
      "c1",
      "The increase may reflect higher recorded dining and groceries spending, tied at ₱1,000.00 each.",
      {
        kind: "interpretation",
        derivedFactIds: ["contrib"],
        scopeId: cohort,
        answersRequirementIds: ["why"],
      },
    );
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, overreach]), draft([hedged])],
        atlas_answer_review: [
          reviewOf(
            [
              verdict("c1", "supported", [SPENDING_IDS.current]),
              verdict(
                "c2",
                "unsupported",
                ["contrib"],
                ["overstated_certainty"],
              ),
            ],
            [
              ["total", true, ["c1"]],
              ["why", false, []],
            ],
          ),
          reviewOf(
            [verdict("c1", "supported", ["contrib"])],
            [["why", true, ["c1"]]],
          ),
        ],
      },
      {
        brief: brief([
          ["total", true],
          ["why", true],
        ]),
        path: "deep",
      },
    );
    const answer = await result;
    expect(stages(answer)).toEqual([
      "writer:ok",
      "critic:ok",
      "repair:ok",
      "critic:ok",
    ]);
    expect(answer.answer.status).toBe("answered");
    expect(answer.answer.claims.map((item) => item.text)).not.toContain(
      overreach.text,
    );
    expect(
      answer.answer.claims.find((item) => item.text === hedged.text)?.id,
    ).toBe("c2");
  });

  it("repairs a wrong-scope claim and rechecks the repair deterministically", async () => {
    const wrongScope = { ...total, scopeId: "goal:someone" };
    const { result } = run({
      atlas_answer_v2: [draft([wrongScope]), draft([total])],
      atlas_answer_review: [],
    });
    const answer = await result;
    expect(stages(answer)).toEqual(["writer:ok", "repair:ok"]);
    expect(answer.answer.status).toBe("answered");
    expect(
      answer.answer.claims.filter(
        (item) => item.verification.deterministic === "passed",
      ),
    ).toHaveLength(1);
  });

  it("does not trust a repaired claim that fails the same checks", async () => {
    const wrongScope = { ...total, scopeId: "goal:someone" };
    const badFigure = {
      ...total,
      text: "Recorded expenses were ₱99,999.00 this month.",
    };
    const { result } = run({
      atlas_answer_v2: [draft([wrongScope]), draft([badFigure])],
      atlas_answer_review: [],
    });
    const answer = await result;
    expect(answer.answer.status).not.toBe("answered");
    expect(shipped(answer)).toEqual([]);
  });

  it("qualifies contradicting claims until a repair resolves them", async () => {
    const other = claim(
      "c2",
      "Recorded expenses of ₱11,000.00 were higher than ₱9,100.00 in the comparison period.",
      {
        evidenceIds: [SPENDING_IDS.current, SPENDING_IDS.previous],
        comparison: {
          subjectId: SPENDING_IDS.current,
          referenceId: SPENDING_IDS.previous,
          direction: "higher",
        },
      },
    );
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, other]), draft([total])],
        atlas_answer_review: [
          reviewOf(
            [verdict("c1", "supported"), verdict("c2", "supported")],
            [["total", true, ["c1"]]],
            { contradictions: [{ claimIds: ["c1", "c2"] }] },
          ),
          reviewOf([verdict("c1", "supported")], [["total", true, ["c1"]]]),
        ],
      },
      { path: "deep" },
    );
    const answer = await result;
    expect(stages(answer)).toContain("repair:ok");
    expect(
      answer.answer.claims
        .filter((item) => item.text === other.text)
        .every((item) => item.verification.semantic === "unsupported"),
    ).toBe(true);
  });

  it("rejects generic or objective-free recommendations", async () => {
    const generic = {
      ...recommendation,
      text: "Consider staying focused and keep it up with your spending this month.",
    };
    const noObjective = {
      ...recommendation,
      id: "c4",
      recommendation: {
        ...recommendation.recommendation!,
        objectiveRequirementId: "unknown",
      },
    };
    const unstated = { ...recommendation, id: "c5", assumptionIds: [] };
    const { result } = run(
      {
        atlas_answer_v2: [
          draft([total, generic, noObjective, unstated]),
          "error",
        ],
        atlas_answer_review: [reviewOf([], [])],
      },
      {
        brief: brief([
          ["total", true],
          ["next", false],
        ]),
      },
    );
    const answer = await result;
    const reasons = (id: string) =>
      answer.answer.claims.find((item) => item.id === id)?.verification.reasons;
    expect(reasons("c3")).toContain("generic_recommendation");
    expect(reasons("c4")).toContain("recommendation_without_objective");
    expect(reasons("c5")).toContain("unstated_assumption");
  });

  it("returns only validated findings as partial when repair is unaffordable", async () => {
    const budget = {
      ...RUN_BUDGETS.deep,
      providerCalls: 2,
      reserve: { ...RUN_BUDGETS.deep.reserve, providerCalls: 2 },
    };
    const broken = {
      ...tie,
      text: "Groceries had the largest increase at ₱1,000.00.",
    };
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, broken])],
        atlas_answer_review: [
          reviewOf([verdict("c1", "supported")], [["total", true, ["c1"]]]),
        ],
      },
      {
        brief: brief([
          ["total", true],
          ["why", true],
        ]),
        path: "deep",
        budget,
      },
    );
    const answer = await result;
    expect(stages(answer)).toEqual(["writer:ok", "critic:ok", "repair:error"]);
    expect(answer.stages.at(-1)?.code).toBe("provider_calls");
    expect(answer.answer.status).toBe("partial_answer");
    expect(answer.answer.unresolved).toEqual([
      { requirementId: "why", reason: "claim_rejected" },
    ]);
    expect(shipped(answer)).toEqual(["c1"]);
  });

  it("withholds interpretations when review is unavailable and keeps facts", async () => {
    const hedged = claim(
      "c2",
      "The increase may reflect higher recorded dining and groceries spending.",
      {
        kind: "interpretation",
        derivedFactIds: ["contrib"],
        scopeId: cohort,
        answersRequirementIds: ["why"],
      },
    );
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, hedged]), "error"],
        atlas_answer_review: ["error"],
      },
      {
        brief: brief([
          ["total", true],
          ["why", false],
        ]),
        path: "deep",
      },
    );
    const answer = await result;
    expect(answer.review).toBe("unavailable");
    expect(shipped(answer)).toEqual(["c1"]);
    expect(answer.answer.status).toBe("answered");
  });

  it("ignores a review that adds evidence the claim does not cite", async () => {
    const hedged = claim(
      "c2",
      "The increase may reflect higher recorded dining and groceries spending.",
      {
        kind: "interpretation",
        derivedFactIds: ["contrib"],
        scopeId: cohort,
        answersRequirementIds: ["why"],
      },
    );
    const { result } = run(
      {
        atlas_answer_v2: [draft([total, hedged]), "error"],
        atlas_answer_review: [
          reviewOf(
            [
              verdict("c1", "supported"),
              verdict("c2", "supported", [SPENDING_IDS.previous]),
            ],
            [
              ["total", true, ["c1"]],
              ["why", true, ["c2"]],
            ],
          ),
        ],
      },
      {
        brief: brief([
          ["total", true],
          ["why", false],
        ]),
        path: "deep",
      },
    );
    const answer = await result;
    expect(
      answer.answer.claims.find((item) => item.id === "c2")?.verification,
    ).toMatchObject({ semantic: "unsupported" });
  });

  it("falls back to checked ATLAS figures when the writer fails", async () => {
    const { result } = run(
      { atlas_answer_v2: ["error"], atlas_answer_review: [] },
      { byRequirement: { total: ["total.current", "total.previous"] } },
    );
    const answer = (await result).answer;
    expect(answer.status).toBe("fallback_facts");
    const shipped = answer.claims.filter(
      (item) => item.verification.deterministic === "passed",
    );
    // Every figure shown passed the same checks a written claim would.
    expect(shipped.map((item) => item.evidenceIds)).toEqual([
      ["total.current"],
      ["total.previous"],
    ]);
    expect(shipped.every((item) => item.kind === "fact")).toBe(true);
    expect(answer.limitations.join(" ")).toMatch(
      /only checked ATLAS figures are shown/,
    );
  });

  it("reports an operational error, not empty records, when nothing can be shown", async () => {
    const { result } = run({
      atlas_answer_v2: ["error"],
      atlas_answer_review: [],
    });
    const answer = (await result).answer;
    expect(answer.status).toBe("error");
    expect(answer.claims.filter((item) => item.kind === "fact")).toEqual([]);
    expect(answer.limitations.join(" ")).toMatch(
      /does not mean your records are empty/,
    );
  });

  it("sends neither owner labels nor private text on the shared route", async () => {
    const excerpt = {
      ...evidence[0]!,
      id: "private",
      kind: "text_excerpt",
      text: "A private reflection about money.",
      attributedTo: "user",
      sharing: { route: "sensitive_narrative", allowedFields: [] },
    } as unknown as EvidenceV2;
    const { result, bodies } = run(
      { atlas_answer_v2: [draft([total])], atlas_answer_review: [] },
      {
        labels: [
          { handle: "category:x", domain: "money", text: "Groceries-Label" },
        ],
        evidence: [...evidence, excerpt],
      },
    );
    await result;
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.body).not.toContain("Groceries-Label");
    expect(bodies[0]!.body).not.toContain("A private reflection");
  });
});

describe("reviewer evaluation", () => {
  it("counts false approvals and false rejections separately", () => {
    const seeds = [
      { claimId: "good-1", expected: "supported" as const },
      { claimId: "good-2", expected: "supported" as const },
      { claimId: "bad-1", expected: "unsupported" as const },
      { claimId: "bad-2", expected: "qualified" as const },
    ];
    const verdicts = new Map<
      string,
      "supported" | "qualified" | "unsupported" | undefined
    >([
      ["good-1", "supported"],
      ["good-2", "unsupported"],
      ["bad-1", "supported"],
      ["bad-2", "qualified"],
    ]);
    expect(reviewerAgreement(seeds, verdicts)).toEqual({
      cases: 4,
      agreed: 2,
      falseApprovals: 1,
      falseRejections: 1,
    });
  });
});
