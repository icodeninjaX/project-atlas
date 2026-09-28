import { describe, expect, it } from "vitest";
import type { AnalyticalClaim, AnswerV2 } from "./contracts";
import { presentAnswer } from "./presentation";

const handle = "category:f3ee7a14-4324-48de-8d87-34fbec069aa3";

describe("answer presentation", () => {
  it("shows the owner's label for mentions in every recommendation field", () => {
    const claim = {
      id: "c1",
      kind: "recommendation",
      text: `Review {{${handle}}} before adding new spending.`,
      answersRequirementIds: ["r_money"],
      evidenceIds: [],
      derivedFactIds: [],
      assumptionIds: [],
      scopeId: "cohort:expense_by_category",
      comparison: null,
      recommendation: {
        objectiveRequirementId: "r_money",
        constraints: [`Keep {{${handle}}} within last month's level`],
        tradeoff: `Less room for {{${handle}}} purchases.`,
        nextAction: { label: `Open {{${handle}}}`, href: "/money" },
        conditional: false,
      },
      verification: {
        structural: "passed",
        deterministic: "passed",
        semantic: "supported",
        reasons: [],
      },
    } as AnalyticalClaim;
    const answer = {
      version: "2",
      status: "answered",
      directAnswerClaimIds: ["c1"],
      claims: [claim],
      sections: [],
      table: null,
      sources: [],
      coverage: [],
      unresolved: [],
      limitations: [],
      assumptions: [],
      model: null,
      nextTurnContext: null,
      verification: {
        claimsProposed: 1,
        claimsPassed: 1,
        rejectionReasons: [],
        semanticReview: "completed",
        repairEligible: false,
      },
    } as unknown as AnswerV2;
    const presented = presentAnswer(answer, {
      language: "en",
      style: { style: "concise", maxSentences: null },
      requirementText: (id) => id,
      asOf: null,
      labels: new Map([[handle, "Groceries"]]),
    });
    const shown = JSON.stringify(presented);
    expect(shown).not.toContain("{{");
    expect(presented.direct[0]).toMatchObject({
      text: "Review Groceries before adding new spending.",
      recommendation: {
        constraints: ["Keep Groceries within last month's level"],
        tradeoff: "Less room for Groceries purchases.",
        nextAction: { label: "Open Groceries", href: "/money" },
      },
    });
  });
});
