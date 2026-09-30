import { describe, expect, it } from "vitest";
import { sortLimitations } from "./presentation";
import { failedChecksNote } from "./synthesis";

describe("limitations shown with an answer", () => {
  it("leads with why the answer looks as it does and folds away retrieval notes", () => {
    // The limitations from the production screenshot of 30 September.
    const { limitations, limitationDetails } = sortLimitations([
      "Transfers are excluded. Zero recorded activity is not proof of no real activity.",
      "Totals come from a database aggregate over every matching surviving record. Category names are owner-only labels.",
      "Current debt balances are authoritative. Reduction from original principal is not a historical month-by-month balance or payoff forecast.",
      "Current surviving records only; edits, deletion and missing entries limit historical claims. Source IDs are a bounded sample, not the complete contributing set.",
      "No records means zero recorded activity, not proof of no real activity. Deleted or unrecorded entries are unavailable. Source IDs show at most 20 contributors.",
      "Payments are recorded amounts, not reconstructed historical debt balances.",
      "Surviving expense transactions by transaction date; transfers excluded",
      "Request-time aggregation uses surviving owner records. Deleted, unrecorded and pre-first-record activity cannot be reconstructed. A zero means zero recorded events in a covered period, not proof of no real activity.",
      "One or more periods have insufficient history and were omitted.",
      "Sources were read one after another, not as one snapshot; each keeps its own retrieval time.",
      "Payments are recorded amounts, not reconstructed historical debt balances.",
      failedChecksNote(["figure", "comparison", "figure"]),
    ]);
    expect(limitations).toEqual([
      "The written explanation did not pass ATLAS checks (a figure did not match its source; a comparison did not match the figures), so only checked ATLAS figures are shown.",
      "Transfers are excluded. Zero recorded activity is not proof of no real activity.",
      "Payments are recorded amounts, not reconstructed historical debt balances.",
      "One or more periods have insufficient history and were omitted.",
    ]);
    expect(limitationDetails).toHaveLength(7);
    expect(limitationDetails).toContain(
      "Sources were read one after another, not as one snapshot; each keeps its own retrieval time.",
    );
  });

  it("says why checks failed only in words it knows", () => {
    expect(failedChecksNote(["schema"])).toContain(
      "the written answer was incomplete",
    );
    expect(failedChecksNote(["some_new_rule"])).toBe(
      "The written explanation did not pass ATLAS checks, so only checked ATLAS figures are shown.",
    );
  });
});
