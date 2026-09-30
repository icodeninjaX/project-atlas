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
    // Four different figures, so none is a repeat of another.
    const totals = ["a", "b", "c", "d"].map((id, index) => ({
      ...wholeExpenseTotal(`total.${id}`, PERIODS.currentMonthToDate),
      value: 100_000 * (index + 1),
    }));
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

  it("states a figure read twice only once, and hides retrieval counts", () => {
    const total = wholeExpenseTotal("total.a", PERIODS.currentMonthToDate);
    const again = { ...total, id: "total.again" };
    const longer = {
      ...total,
      id: "total.longer",
      time: {
        ...total.time,
        period: { ...total.time.period, through: "2026-09-30" },
      },
    };
    const records = {
      ...total,
      id: "records",
      value: 2,
      unit: "count" as const,
      semantics: {
        ...total.semantics,
        metricKey: "records_count",
        definition: "Number of stored records a query included",
        aggregation: "count" as const,
      },
    };
    const draft = deterministicDraft(
      brief([["r_money", true]]),
      [total, again, longer, records],
      { r_money: ["total.a", "total.again", "total.longer", "records"] },
    );
    expect(draft.claims.map((claim) => claim.evidenceIds[0])).toEqual([
      "total.a",
    ]);
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
