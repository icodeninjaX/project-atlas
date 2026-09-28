import { contribution } from "../calculations";
import type { DraftClaim } from "../contracts";
import { assembleAnswer } from "../response";
import { PERIODS } from "./fixtures";
import {
  SPENDING_IDS,
  V2_NOW,
  brief,
  categoryBreakdown,
  legacySpendingV2,
  wholeExpenseTotal,
} from "./v2-fixtures";

/**
 * Fixture answers for inspecting the AnswerV2 renderer. The drafts are fixed
 * synthetic text standing in for a writer; no model is called.
 */
export function previewAnswers() {
  const current = PERIODS.currentMonthToDate;
  const previous = PERIODS.previousAligned;
  const now = categoryBreakdown("current", current);
  const before = categoryBreakdown("previous", previous);
  const totals = [
    wholeExpenseTotal("total.current", current),
    wholeExpenseTotal("total.previous", previous),
  ];
  const evidence = [...legacySpendingV2(), ...now, ...before, ...totals];
  const derived = [
    contribution("contribution", {
      totalCurrent: totals[0]!,
      totalPrevious: totals[1]!,
      current: now,
      previous: before,
    }),
  ];
  const claim = (
    id: string,
    text: string,
    extra: Partial<DraftClaim>,
  ): DraftClaim => ({
    id,
    kind: "fact",
    text,
    answersRequirementIds: [],
    evidenceIds: [],
    derivedFactIds: [],
    assumptionIds: [],
    scopeId: "whole_domain:expense",
    comparison: null,
    ...extra,
  });
  const change = claim(
    "c1",
    "Recorded expenses were ₱11,000.00 this month, higher than ₱9,100.00 over the same days last month.",
    {
      evidenceIds: [SPENDING_IDS.current, SPENDING_IDS.previous],
      answersRequirementIds: ["total"],
      comparison: {
        subjectId: SPENDING_IDS.current,
        referenceId: SPENDING_IDS.previous,
        direction: "higher",
      },
    },
  );
  const tie = claim(
    "c2",
    "Groceries and dining tied for the largest increase, ₱1,000.00 each.",
    {
      kind: "calculation",
      derivedFactIds: ["contribution"],
      scopeId: "cohort:expense_by_category",
      answersRequirementIds: ["category"],
    },
  );
  const caveat = claim(
    "c3",
    "These are accounting contributions to the change in recorded expenses, not a reason for it.",
    {
      kind: "limitation",
      derivedFactIds: ["contribution"],
      scopeId: "cohort:expense_by_category",
    },
  );
  const requirements = brief([
    ["total", true],
    ["category", true],
  ]);
  const scenario = (title: string, claims: DraftClaim[]) => ({
    title,
    brief: requirements,
    evidence,
    derived,
    answer: assembleAnswer({
      brief: requirements,
      evidence,
      derived,
      now: V2_NOW,
      draft: {
        version: "2",
        directAnswerClaimIds: [claims[0]!.id],
        claims,
        sections: [
          {
            heading: "Where the change came from",
            claimIds: claims.slice(1).map((item) => item.id),
          },
        ],
        table: null,
      },
      model: null,
    }),
  });
  return [
    scenario("Complete answer with a disclosed tie", [change, tie, caveat]),
    scenario("Essential claim rejected: partial answer", [
      change,
      { ...tie, text: "Groceries had the largest increase at ₱1,000.00." },
      caveat,
    ]),
  ];
}
