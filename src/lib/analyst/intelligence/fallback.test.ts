import { describe, expect, it } from "vitest";
import { PERIODS } from "./evaluation/fixtures";
import { rank } from "./calculations";
import {
  brief,
  categoryBreakdown,
  wholeExpenseTotal,
} from "./evaluation/v2-fixtures";
import { deterministicDraft } from "./fallback";

describe("deterministic fallback draft", () => {
  it("leaves a figure past one requirement's limit for a later requirement", () => {
    const totals = ["a", "b", "c", "d"].map((id) =>
      wholeExpenseTotal(`total.${id}`, PERIODS.currentMonthToDate),
    );
    const draft = deterministicDraft(
      brief([
        ["first", true],
        ["second", true],
      ]),
      totals,
      {
        first: totals.map((item) => item.id),
        second: ["total.d"],
      },
    );
    expect(
      draft.claims.map((claim) => [
        claim.answersRequirementIds[0],
        claim.evidenceIds[0],
      ]),
    ).toEqual([
      ["first", "total.a"],
      ["first", "total.b"],
      ["first", "total.c"],
      ["second", "total.d"],
    ]);
    // A figure already shown is not repeated for another requirement.
    expect(new Set(draft.claims.map((claim) => claim.id)).size).toBe(4);
  });

  it("answers a ranking requirement with the top of ATLAS's ranking", () => {
    const members = categoryBreakdown("current", PERIODS.currentMonthToDate);
    const fact = rank("derived.rank.test", members);
    const base = brief([["r_money", true]]);
    const ranked = {
      ...base,
      requirements: base.requirements.map((item) => ({
        ...item,
        question: "Which expense categories hold the most recorded spending",
        evidenceNeeded: ["money.category_ranking"],
      })),
    };
    const draft = deterministicDraft(
      ranked,
      members,
      { r_money: members.map((item) => item.id) },
      [fact],
    );
    expect(draft.claims[0]).toMatchObject({
      id: "c1",
      derivedFactIds: ["derived.rank.test"],
      scopeId: fact.scopeId,
    });
    // The category is a mention; the owner sees its label at presentation.
    expect(draft.claims[0]!.text).toMatch(
      /^(?:Largest|Tied for the largest) recorded expense category: \{\{[^{}]+\}\},/,
    );
    expect(draft.directAnswerClaimIds).toEqual(["c1"]);
  });
});
