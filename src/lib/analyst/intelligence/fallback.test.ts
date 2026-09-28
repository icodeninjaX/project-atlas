import { describe, expect, it } from "vitest";
import { PERIODS } from "./evaluation/fixtures";
import { brief, wholeExpenseTotal } from "./evaluation/v2-fixtures";
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
});
