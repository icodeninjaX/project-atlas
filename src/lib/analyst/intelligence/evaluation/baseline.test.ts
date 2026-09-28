import { describe, expect, it, vi } from "vitest";
import { spendingEvidence } from "@/lib/analyst/evidence";
import {
  ANSWER_LIMITS,
  reviewGroundedAnswer,
} from "@/lib/analyst/freeform/answer";
import { resolveMentionedEntity } from "@/lib/analyst/freeform/mentions";
import {
  PLANNER_LIMITS,
  validateExecutablePlan,
} from "@/lib/analyst/planner/contracts";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { EVALUATION_CORPUS } from "./corpus";
import { EXPECTED_FACTS } from "./expected";
import {
  FIXTURE_CLOCK,
  OWNER_A,
  OWNER_B,
  ownerDataset,
  type FixtureVariant,
} from "./fixtures";
import { scoreRun } from "./scoring";

/**
 * AI-00 baseline characterization of the existing (legacy) Analyst path.
 * Each test reproduces current behavior against the synthetic fixtures so a
 * diagnosis rests on executed code, not on reading it. Tests named "gap"
 * record a weakness the new path must fix without weakening the legacy path;
 * tests named "safeguard" record behavior every later phase must preserve.
 * See docs/analyst-intelligence-baseline.md for the finding register.
 */

vi.mock("server-only", () => ({}));

const clock = new Date(FIXTURE_CLOCK);

/** Owner A's spending evidence as the legacy tool builds it. */
function legacySpending(variant: FixtureVariant = "rich", truncated = false) {
  const data = ownerDataset(variant, OWNER_A);
  const rows = data.transactions
    .filter((row) => row.kind === "expense")
    .map((row) => ({
      id: row.id,
      category_id: row.categoryId ?? "uncategorized",
      amount_centavos: row.amountCentavos,
      transaction_date: row.date,
    }));
  const names = new Map(data.categories.map((item) => [item.id, item.name]));
  return spendingEvidence(rows, names, clock, truncated);
}

const asTool = (
  item: Omit<ToolEvidence, "claimType" | "provenance">,
  tool: ToolEvidence["provenance"]["tool"] = "getSpendingChange",
): ToolEvidence => ({
  ...item,
  claimType: "FACT",
  provenance: {
    tool,
    calculationVersion: "1",
    retrievedAt: FIXTURE_CLOCK,
    textTrust: "untrusted_data",
  },
});

const toolEvidence = () =>
  legacySpending().evidence.map((item) => asTool(item));

const count = (id: string, metric: string, value: number): ToolEvidence =>
  asTool(
    {
      id,
      metric,
      value,
      unit: "count",
      period: { from: "2026-09-01", through: "2026-09-24" },
      comparisonBasis: "Synthetic recorded activity",
      completeness: "complete",
      source: { description: "Synthetic", recordIds: [], href: "/tasks" },
    },
    "getHistoricalMetricSeries",
  );

const claim = (
  text: string,
  evidenceIds: string[],
  kind = "observation",
  comparison: unknown = null,
) => ({ kind, text, evidenceIds, comparison });

describe("legacy Analyst baseline (AI-00)", () => {
  it("B01 gap: a trivial claim survives when the essential one is dropped (Q57)", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          // The essential claim uses a banned superlative and is dropped.
          claim(
            "Groceries and dining tied for the largest category increase this month.",
            ["spending.change"],
          ),
          claim(
            "This may be worth a closer look at recorded expenses.",
            ["spending.current"],
            "interpretation",
          ),
        ],
      },
      toolEvidence(),
    );
    expect(review?.rejections.map((item) => item.reason)).toEqual(["wording"]);
    expect(review?.claims).toHaveLength(1);
    // The route ships any surviving claim as "answered"; the harness flags it.
    const q57 = EVALUATION_CORPUS.find((item) => item.id === "Q57")!;
    const score = scoreRun(q57, {
      caseId: "Q57",
      implementation: "legacy",
      model: null,
      status: "answered",
      text: review!.claims.map((item) => item.text).join(" "),
      claims: review!.claims.map((item) => ({
        text: item.text,
        requirementIds: [],
        verified: true,
      })),
      facts: {},
      unresolvedRequirementIds: [],
      toolCalls: ["getSpendingChange"],
      modelCalls: 2,
      ownerIdsTouched: [OWNER_A],
    });
    expect(score.hardGateFailures).toContain(
      "essential_requirement_silently_answered",
    );
    expect(score.failureCategories).toContain("dropped_essential_claim");
  });

  it("B02 gap: a correct figure attached to the wrong month passes (Q02)", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim("Recorded spending in August was ₱11,000.00.", [
            "spending.current",
          ]),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toHaveLength(1);
    expect(EXPECTED_FACTS["expense.current"]!.value).toBe(1_100_000);
  });

  it("B03 gap: a correct figure attached to the wrong metric passes (Q05)", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim("Recorded income this month was ₱11,000.00.", [
            "spending.current",
          ]),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toHaveLength(1);
  });

  it("B04 gap: two unrelated counts compare as one population (Q20)", () => {
    const evidence = [
      count("tasks", "Task completions", 5),
      count("reviews", "Knowledge reviews", 6),
    ];
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim(
            "Task completions were lower than knowledge reviews this month.",
            ["tasks", "reviews"],
            "observation",
            {
              subjectId: "tasks",
              referenceId: "reviews",
              direction: "lower",
            },
          ),
        ],
      },
      evidence,
    );
    expect(review?.claims).toHaveLength(1);
  });

  it("B05 gap: a supported tie ranking is rejected by the word ban (Q03)", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim(
            "Groceries and dining tied for the highest increase, each ₱1,000.00.",
            ["spending.change"],
          ),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toEqual([]);
    expect(review?.rejections[0]?.reason).toBe("wording");
    expect(EXPECTED_FACTS["expense.largest_increase"]!.value).toEqual({
      top: ["cat-a-dining", "cat-a-groceries"],
      tie: true,
    });
  });

  it("B06 gap: category evidence is a top-five slice that cannot reconcile (Q03)", () => {
    const result = legacySpending();
    const change = result.evidence.find(
      (item) => item.id === "spending.change",
    )!.value;
    const categories = result.evidence.filter((item) =>
      item.id.startsWith("spending.category."),
    );
    expect(change).toBe(EXPECTED_FACTS["expense.change"]!.value);
    expect(categories).toHaveLength(5);
    const sum = categories.reduce(
      (total, item) => total + (item.value as number),
      0,
    );
    expect(sum).toBe(175_000);
    expect(sum).not.toBe(change);
    // Tied categories carry no tie marker; order alone decides.
    expect(categories.slice(0, 2).map((item) => item.value)).toEqual([
      100_000, 100_000,
    ]);
  });

  it("B07 gap: a percent derived from unrelated cited values passes (Q08)", () => {
    // (₱9,100.00 − ₱1,000.00) / ₱1,000.00 = 810%, a meaningless operation.
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim("Groceries spending shows a change of 810% this month.", [
            "spending.previous",
            "spending.category.cat-a-groceries",
          ]),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toHaveLength(1);
  });

  it("B08 gap: a Taglish direction bypasses the English-only comparison check (Q49)", () => {
    // "Smaller this month than last month" is false: spending rose.
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim(
            "Mas maliit ang naitalang gastos ngayong buwan na ₱11,000.00 kaysa ₱9,100.00 noong nakaraang buwan.",
            ["spending.current", "spending.previous"],
          ),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toHaveLength(1);
    // The English equivalent with a false direction is rejected.
    const english = reviewGroundedAnswer(
      {
        claims: [
          claim(
            "Recorded spending of ₱11,000.00 was lower than ₱9,100.00 last month.",
            ["spending.current", "spending.previous"],
            "observation",
            {
              subjectId: "spending.current",
              referenceId: "spending.previous",
              direction: "lower",
            },
          ),
        ],
      },
      toolEvidence(),
    );
    expect(english?.claims).toEqual([]);
  });

  it("B09 safeguard: a correct direction and cited figures pass", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim(
            "Recorded spending of ₱11,000.00 was higher than ₱9,100.00 in the comparison period.",
            ["spending.current", "spending.previous"],
            "observation",
            {
              subjectId: "spending.current",
              referenceId: "spending.previous",
              direction: "higher",
            },
          ),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toHaveLength(1);
  });

  it("B10 safeguard: causal and certainty wording stays rejected", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          claim("Recorded spending rose because of dining.", [
            "spending.change",
          ]),
          claim("Recorded spending will definitely keep rising.", [
            "spending.change",
          ]),
        ],
      },
      toolEvidence(),
    );
    expect(review?.claims).toEqual([]);
  });

  it("B11 safeguard: a truncated month withholds totals (Q60)", () => {
    const result = legacySpending("bulk", true);
    expect(result.status).toBe("partial");
    expect(result.evidence.map((item) => item.id)).toEqual([
      "spending.records_inspected",
    ]);
  });

  it("B12 context cap: answers hold at most four claims and sixteen evidence items", () => {
    expect(ANSWER_LIMITS).toMatchObject({
      evidenceItems: 16,
      outputTokens: 700,
    });
    const five = Array.from({ length: 5 }, (_, i) =>
      claim(`Recorded spending item ${i} is shown in the evidence.`, [
        "spending.current",
      ]),
    );
    expect(reviewGroundedAnswer({ claims: five }, toolEvidence())).toBeNull();
    const long = claim(`Recorded spending ${"is shown ".repeat(40)}`, [
      "spending.current",
    ]);
    expect(reviewGroundedAnswer({ claims: [long] }, toolEvidence())).toBeNull();
  });

  it("B13 context cap: one plan holds at most four independent calls", () => {
    expect(PLANNER_LIMITS.toolCalls).toBe(4);
    const call = (n: number) => ({
      id: `call_${n}`,
      tool: "getMoneySummary",
      input: {
        from: `2026-0${n}-01`,
        through: `2026-0${n}-28`,
        kind: "expense",
      },
    });
    const plan = (calls: unknown[]) => ({
      version: "1",
      outcome: "plan",
      clarification: null,
      unsupportedReason: null,
      missingCapabilities: [],
      calls,
    });
    expect(
      validateExecutablePlan(plan([1, 2, 3, 4].map(call))).calls,
    ).toHaveLength(4);
    expect(() =>
      validateExecutablePlan(plan([1, 2, 3, 4, 5].map(call))),
    ).toThrow();
  });

  it("B14 safeguard: an ambiguous 'main goal' is never guessed (Q15)", () => {
    const goals = ownerDataset("rich", OWNER_A).goals.map((goal) => ({
      id: goal.id,
      name: goal.title,
    }));
    const options = { goals, debts: [], allowGoal: true, allowDebt: false };
    expect(
      resolveMentionedEntity("How is my main goal going?", options),
    ).toBeNull();
    expect(
      resolveMentionedEntity(
        "How are Build emergency fund and Japan trip going?",
        options,
      ),
    ).toBeNull();
    expect(
      resolveMentionedEntity("How is my Japan trip going?", options),
    ).toMatchObject({ id: "goal-a-trip" });
  });

  it("B15 safeguard: name resolution only sees the requesting owner's records (Q51)", () => {
    const goals = ownerDataset("rich", OWNER_B).goals.map((goal) => ({
      id: goal.id,
      name: goal.title,
    }));
    expect(
      resolveMentionedEntity("How is my Land a developer job goal going?", {
        goals,
        debts: [],
        allowGoal: true,
        allowDebt: false,
      }),
    ).toMatchObject({ id: "goal-b-career" });
  });

  it("B16 gap: legacy mention resolution covers only goals and debts (Q25)", () => {
    // Two roles at one company need a candidate choice; there is no
    // application resolver, so the planner receives no candidates.
    const applications = ownerDataset("rich", OWNER_A).applications.filter(
      (item) => item.company === "Acme Synthetic",
    );
    expect(applications).toHaveLength(2);
    expect(
      resolveMentionedEntity(
        "What is the status of my Acme Synthetic application?",
        {
          goals: [],
          debts: [],
          allowGoal: true,
          allowDebt: true,
        },
      ),
    ).toBeNull();
  });
});
