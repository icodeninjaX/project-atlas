import { describe, expect, it } from "vitest";
import { contribution, percentChange, rank } from "./calculations";
import { checkClaim, claimCanShip, type ClaimCheckContext } from "./claims";
import {
  draftClaimSchema,
  type DraftClaim,
  type EvidenceV2,
} from "./contracts";
import { EVALUATION_CORPUS } from "./evaluation/corpus";
import { OWNER_A, PERIODS, ownerDataset } from "./evaluation/fixtures";
import { observeAnswerV2 } from "./evaluation/observe";
import { scoreRun } from "./evaluation/scoring";
import {
  SPENDING_IDS,
  V2_NOW,
  brief,
  categoryBreakdown,
  legacySpendingV2,
  metricEvidence,
  sampledBreakdown,
  wholeExpenseTotal,
} from "./evaluation/v2-fixtures";
import { assembleAnswer } from "./response";

const current = PERIODS.currentMonthToDate;
const previous = PERIODS.previousAligned;
const breakdownNow = categoryBreakdown("current", current);
const breakdownBefore = categoryBreakdown("previous", previous);
const health = (items: EvidenceV2[]) =>
  items.find((item) => item.scope.cohort?.member === "cat-a-health")!;
const activity = {
  id: "whole_domain:activity",
  type: "whole_domain" as const,
  description: "Activity",
};

const evidence: EvidenceV2[] = [
  ...legacySpendingV2(),
  ...breakdownNow,
  ...breakdownBefore,
  wholeExpenseTotal("total.current", current),
  wholeExpenseTotal("total.previous", previous),
  metricEvidence({
    id: "tasks",
    metricKey: "task_completions",
    value: 5,
    period: current,
    scope: activity,
  }),
  metricEvidence({
    id: "reviews",
    metricKey: "knowledge_reviews",
    value: 6,
    period: current,
    scope: activity,
  }),
  ...sampledBreakdown(),
];
const derived = [
  contribution("contrib", {
    totalCurrent: evidence.find((item) => item.id === "total.current")!,
    totalPrevious: evidence.find((item) => item.id === "total.previous")!,
    current: breakdownNow,
    previous: breakdownBefore,
  }),
  percentChange("health.pct", health(breakdownNow), health(breakdownBefore)),
  rank("sampled.rank", sampledBreakdown()),
  rank(
    "bulk.rank",
    categoryBreakdown("bulk", current, ownerDataset("bulk", OWNER_A)),
  ),
];
const ctx = (
  requirements: Array<[string, boolean]> = [["answer", true]],
): ClaimCheckContext => ({
  brief: brief(requirements),
  evidence: new Map(evidence.map((item) => [item.id, item])),
  derived: new Map(derived.map((item) => [item.id, item])),
  now: V2_NOW,
});

let next = 0;
const claim = (text: string, refs: Partial<DraftClaim> = {}): DraftClaim => ({
  id: `c${(next = (next % 90) + 1)}`,
  kind: "fact",
  text,
  answersRequirementIds: ["answer"],
  evidenceIds: [],
  derivedFactIds: [],
  assumptionIds: [],
  scopeId: "whole_domain:expense",
  comparison: null,
  ...refs,
});
const reasons = (draft: DraftClaim, context = ctx()) =>
  checkClaim(draft, context).verification.reasons;
const cohort = "cohort:expense_by_category";

describe("Analyst V2 claim checks", () => {
  it("rejects a correct value attached to the wrong month (B02)", () => {
    expect(
      reasons(
        claim("Recorded expenses in August were ₱11,000.00.", {
          evidenceIds: [SPENDING_IDS.current],
        }),
      ),
    ).toContain("month");
    expect(
      reasons(
        claim(
          "Recorded expenses from 2026-09-01 to 2026-09-24 were ₱11,000.00.",
          { evidenceIds: [SPENDING_IDS.current] },
        ),
      ),
    ).toEqual([]);
    expect(
      reasons(
        claim("Recorded expenses were ₱11,000.00 this month.", {
          evidenceIds: [SPENDING_IDS.current],
        }),
      ),
    ).toEqual([]);
  });

  it("rejects a correct value attached to the wrong metric (B03)", () => {
    expect(
      reasons(
        claim("Recorded income this month was ₱11,000.00.", {
          evidenceIds: [SPENDING_IDS.current],
        }),
      ),
    ).toContain("metric_mismatch");
  });

  it("rejects two unrelated counts presented as one population (B04)", () => {
    expect(
      reasons(
        claim(
          "Task completions were lower than knowledge reviews this month.",
          {
            evidenceIds: ["tasks", "reviews"],
            scopeId: activity.id,
            comparison: {
              subjectId: "tasks",
              referenceId: "reviews",
              direction: "lower",
            },
          },
        ),
      ),
    ).toContain("incompatible_comparison");
  });

  it("accepts a supported tie ranking and requires the tie to be disclosed (B05)", () => {
    const tied = claim(
      "Groceries and dining tied for the largest increase, ₱1,000.00 each.",
      {
        derivedFactIds: ["contrib"],
        scopeId: cohort,
      },
    );
    expect(reasons(tied)).toEqual([]);
    expect(
      reasons({
        ...tied,
        text: "Groceries had the largest increase at ₱1,000.00.",
      }),
    ).toContain("tie_not_disclosed");
  });

  it("rejects a ranking from a sampled page and accepts the full one", () => {
    expect(
      reasons(
        claim("Transport was the largest expense category this month.", {
          derivedFactIds: ["sampled.rank"],
          scopeId: cohort,
        }),
      ),
    ).toEqual(
      expect.arrayContaining(["unsupported_superlative", "undefined_result"]),
    );
    expect(
      reasons(
        claim(
          "Groceries was the largest expense category this month at ₱150,150.00.",
          {
            derivedFactIds: ["bulk.rank"],
            scopeId: cohort,
          },
        ),
      ),
    ).toEqual([]);
    // Without a ranking, a superlative is unsupported even for a true value.
    expect(
      reasons(
        claim("Recorded expenses of ₱11,000.00 were the highest this month.", {
          evidenceIds: [SPENDING_IDS.current],
        }),
      ),
    ).toContain("unsupported_superlative");
  });

  it("rejects figures derived from unrelated cited values (B07)", () => {
    expect(
      reasons(
        claim("Recorded expenses show a change of 810% this month.", {
          evidenceIds: [SPENDING_IDS.previous, SPENDING_IDS.current],
        }),
      ),
    ).toContain("figure");
  });

  it("checks Taglish direction words against the values (B08)", () => {
    const refs = { evidenceIds: [SPENDING_IDS.current, SPENDING_IDS.previous] };
    const text = (word: string) =>
      `${word} ang naitalang gastos ngayong buwan na ₱11,000.00 kaysa ₱9,100.00 noong nakaraang buwan.`;
    expect(reasons(claim(text("Mas maliit"), refs))).toContain("comparison");
    const comparison = {
      subjectId: SPENDING_IDS.current,
      referenceId: SPENDING_IDS.previous,
      direction: "higher" as const,
    };
    expect(
      reasons(claim(text("Mas maliit"), { ...refs, comparison })),
    ).toContain("comparison");
    expect(reasons(claim(text("Mas malaki"), { ...refs, comparison }))).toEqual(
      [],
    );
  });

  it("states a zero-baseline percent change as undefined, never as a figure", () => {
    const now = health(breakdownNow).id;
    const before = health(breakdownBefore).id;
    const base = {
      kind: "calculation" as const,
      evidenceIds: [now, before],
      derivedFactIds: ["health.pct"],
      scopeId: cohort,
      comparison: {
        subjectId: now,
        referenceId: before,
        direction: "higher" as const,
      },
    };
    expect(
      reasons(
        claim(
          "Health spending rose from ₱0.00 to ₱450.00, so its percent change is undefined.",
          base,
        ),
      ),
    ).toEqual([]);
    expect(
      reasons(claim("Health spending rose 100% this month.", base)),
    ).toEqual(expect.arrayContaining(["figure", "undefined_result"]));
  });

  it("keeps causal and certainty bans and requires hedged interpretations", () => {
    const refs = { evidenceIds: [SPENDING_IDS.change] };
    expect(
      reasons(claim("Recorded expenses rose because of dining.", refs)),
    ).toContain("causal_wording");
    expect(
      reasons(claim("Tumaas ang gastos dahil sa kainan.", refs)),
    ).toContain("causal_wording");
    expect(
      reasons(claim("Recorded expenses will keep rising.", refs)),
    ).toContain("certainty_wording");
    expect(
      reasons(
        claim("The rise leaves less room for savings.", {
          ...refs,
          kind: "interpretation",
        }),
      ),
    ).toContain("unhedged_interpretation");
  });

  it("keeps each claim inside one scope", () => {
    expect(
      reasons(
        claim("Recorded expenses were ₱11,000.00 this month.", {
          evidenceIds: [SPENDING_IDS.current],
          scopeId: "goal:goal-a-career",
        }),
      ),
    ).toContain("scope_mismatch");
  });

  it("never lets the writer supply its own verdict", () => {
    const withVerdict = {
      ...claim("Recorded expenses were ₱11,000.00 this month.", {
        evidenceIds: [SPENDING_IDS.current],
      }),
      verification: {
        structural: "passed",
        deterministic: "passed",
        semantic: "supported",
        reasons: [],
      },
    };
    expect(draftClaimSchema.safeParse(withVerdict).success).toBe(false);
  });
});

describe("Analyst V2 answer assembly", () => {
  const q57 = EVALUATION_CORPUS.find((item) => item.id === "Q57")!;
  const total = claim("Recorded expenses were ₱11,000.00 this month.", {
    id: "c1",
    evidenceIds: [SPENDING_IDS.current],
    answersRequirementIds: ["total"],
  });
  const category = claim(
    "Groceries and dining tied for the largest increase, ₱1,000.00 each.",
    {
      id: "c2",
      derivedFactIds: ["contrib"],
      scopeId: cohort,
      answersRequirementIds: ["category"],
    },
  );
  const assemble = (
    claims: DraftClaim[],
    extra: Record<string, unknown> = {},
  ) =>
    assembleAnswer({
      brief: brief([
        ["total", true],
        ["category", true],
      ]),
      evidence,
      derived,
      now: V2_NOW,
      draft: {
        version: "2",
        directAnswerClaimIds: claims.map((c) => c.id),
        claims,
        sections: [],
        table: null,
        ...extra,
      },
      model: { requested: "model-a", resolved: "model-a" },
    });

  it("answers when every essential requirement survives checking", () => {
    const answer = assemble([total, category]);
    expect(answer.status).toBe("answered");
    expect(answer.unresolved).toEqual([]);
    expect(answer.sources.length).toBeGreaterThan(0);
  });

  it("turns a dropped essential claim into a partial answer eligible for repair (B01, Q57)", () => {
    const broken = {
      ...category,
      text: "Groceries had the largest increase at ₱1,000.00.",
    };
    const answer = assemble([total, broken]);
    expect(answer.status).toBe("partial_answer");
    expect(answer.unresolved).toEqual([
      { requirementId: "category", reason: "claim_rejected" },
    ]);
    expect(answer.verification.repairEligible).toBe(true);
    expect(answer.directAnswerClaimIds).toEqual(["c1"]);
    const score = scoreRun(
      q57,
      observeAnswerV2("Q57", answer, {
        facts: {},
        toolCalls: ["getSpendingChange"],
        modelCalls: 1,
        ownerIdsTouched: [OWNER_A],
      }),
    );
    expect(score.hardGateFailures).toEqual([]);
    expect(score.dimensions.question_coverage).toBe("passed");
  });

  it("reports an explained gap as insufficient evidence, not an answer", () => {
    const limitation = claim(
      "ATLAS has no complete category ranking for this period.",
      {
        id: "c3",
        kind: "limitation",
        answersRequirementIds: ["category"],
      },
    );
    const answer = assemble([limitation]);
    expect(answer.status).toBe("insufficient_evidence");
    expect(answer.unresolved).toEqual(
      expect.arrayContaining([
        { requirementId: "category", reason: "insufficient_evidence" },
        { requirementId: "total", reason: "no_supported_claim" },
      ]),
    );
  });

  it("does not let a table show values its caption does not cite", () => {
    const table = {
      captionClaimId: "c1",
      columns: ["Period", "Recorded expenses"],
      rows: [
        [{ label: "Current" }, { ref: SPENDING_IDS.current }],
        [{ label: "Previous" }, { ref: SPENDING_IDS.previous }],
      ],
    };
    const answer = assemble([total, category], { table });
    expect(answer.table).toBeNull();
    expect(
      answer.claims.find((c) => c.id === "c1")?.verification.reasons,
    ).toContain("table_reference");
    expect(answer.status).toBe("partial_answer");
    const cited = {
      ...total,
      evidenceIds: [SPENDING_IDS.current, SPENDING_IDS.previous],
      text: "Recorded expenses were ₱11,000.00 this month and ₱9,100.00 last month.",
    };
    expect(assemble([cited, category], { table }).table).not.toBeNull();
  });

  it("drops rejected claims from sections and falls back on an invalid draft", () => {
    const broken = { ...category, text: "Groceries rose because of prices." };
    const answer = assemble([total, broken], {
      sections: [{ heading: "Categories", claimIds: ["c2"] }],
    });
    expect(answer.sections).toEqual([]);
    expect(answer.claims.filter(claimCanShip).map((c) => c.id)).toEqual(["c1"]);
    const invalid = assembleAnswer({
      brief: brief([["total", true]]),
      evidence,
      derived,
      now: V2_NOW,
      draft: { version: "2", claims: [] },
    });
    expect(invalid.status).toBe("fallback_facts");
    expect(invalid.verification.rejectionReasons).toEqual(["schema"]);
  });

  it("rejects section labels that carry figures", () => {
    const answer = assemble([total, category], {
      sections: [{ heading: "₱11,000 total", claimIds: ["c1"] }],
    });
    expect(answer.status).toBe("fallback_facts");
  });
});
