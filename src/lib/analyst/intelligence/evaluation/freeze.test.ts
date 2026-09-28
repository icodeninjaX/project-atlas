import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CORPUS_VERSION,
  EVALUATION_CORPUS,
  HOLDOUT_CASES,
  RELEASE_THRESHOLDS,
} from "./corpus";
import { EXPECTED_FACTS } from "./expected";
import { FIXTURE_DATASETS, FIXTURE_VERSION } from "./fixtures";
import {
  RUNWAY_FIXTURE_VERSION,
  RUNWAY_SUPPLEMENTS,
  runwayBudgetItems,
} from "./runway-fixtures";
import { OWNER_A } from "./fixtures";

/**
 * AI-07 corpus freeze. The release corpus, its holdout split, the expected
 * facts, the fixtures and the thresholds are pinned by fingerprint before any
 * final tuning. A change fails here on purpose: record the reason in
 * docs/analyst-intelligence-release.md and bump the version, never rewrite a
 * holdout expectation to make a new answer pass.
 */

const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const FROZEN = {
  corpusVersion: "2026-09-28.1",
  fixtureVersion: "2026-09-28.1",
  holdout: [
    "Q03",
    "Q06",
    "Q09",
    "Q12",
    "Q15",
    "Q18",
    "Q21",
    "Q24",
    "Q27",
    "Q30",
    "Q33",
    "Q36",
    "Q39",
    "Q42",
    "Q45",
    "Q48",
    "Q51",
    "Q54",
    "Q57",
    "Q60",
  ],
  corpus: "9b85c46b7e658b78a795be784d74af7257538de5330694b41eb209d889cc269e",
  expected: "5757704a170b3e665f8d9fd5e266515e3efa428264877cb8400bf22ac73c1dc5",
  fixtures: "c17416b3fa84f14f59d34bbb2206e0abb7bd0041dfd0ac9a7709fdc9411a4f5e",
  thresholds:
    "2d5bdb924845e6f915db09f9801dc4b10dd59b50ab76d2ef16668973765ff76a",
};

describe("frozen release corpus", () => {
  it("matches the fingerprints recorded at the freeze", () => {
    const actual = {
      corpusVersion: CORPUS_VERSION,
      fixtureVersion: FIXTURE_VERSION,
      holdout: HOLDOUT_CASES.map((item) => item.id),
      corpus: fingerprint(EVALUATION_CORPUS),
      expected: fingerprint(EXPECTED_FACTS),
      fixtures: fingerprint(FIXTURE_DATASETS),
      thresholds: fingerprint(RELEASE_THRESHOLDS),
    };
    expect(actual).toEqual(FROZEN);
  });

  // A versioned supplement added after the freeze, pinned separately so the
  // original fingerprints above never move. See the release report.
  it("pins the runway supplement", () => {
    expect({
      version: RUNWAY_FIXTURE_VERSION,
      supplement: fingerprint({
        supplements: RUNWAY_SUPPLEMENTS,
        budgetItems: runwayBudgetItems(OWNER_A),
      }),
    }).toEqual({
      version: "2026-09-28.1",
      supplement:
        "e2ef41731305ef92165246308512f60922eaee804b3a71ddd3a64bd04092e5d8",
    });
  });
});
