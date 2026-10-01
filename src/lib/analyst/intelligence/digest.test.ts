import { describe, expect, it } from "vitest";
import {
  DIGEST_QUESTION,
  digestBody,
  digestConsentKey,
  digestCurrent,
} from "./digest";
import { deterministicBrief } from "./planning";
import { NON_SHARING_ROUTE, SHARED_ROUTE, type AnalystConsent } from "./policy";

const now = new Date("2026-09-24T04:00:00.000Z");
const consent: AnalystConsent = {
  version: "2",
  providerProcessing: true,
  domains: ["money", "debts"],
  profiles: ["basic_context", "aggregate"],
  grantedAt: "2026-09-24T00:00:00.000Z",
};

describe("the month's summary", () => {
  it("asks why spending changed, this month so far against the same days of last month", () => {
    const brief = deterministicBrief({
      question: DIGEST_QUESTION,
      plan: null,
      now,
    });
    expect(brief.intent).toBe("explain_change");
    expect(
      brief.periods.map(({ from, through }) => ({ from, through })),
    ).toEqual([
      { from: "2026-09-01", through: "2026-09-24" },
      { from: "2026-08-01", through: "2026-08-24" },
    ]);
    expect(
      brief.requirements.some((item) =>
        item.evidenceNeeded.includes("money.change_drivers"),
      ),
    ).toBe(true);
  });

  it("keys a summary by route and consent, in the stored shape", () => {
    expect(digestConsentKey(consent, SHARED_ROUTE)).toBe(
      "openai_shared:debts,money:aggregate,basic_context",
    );
    const key = digestConsentKey(consent, NON_SHARING_ROUTE);
    // The migration's check on consent_key.
    expect(key).toMatch(/^[a-z_,:]+$/);
    expect(key.length).toBeLessThanOrEqual(400);
    expect(
      digestCurrent(
        { day: "2026-09-24", consent_key: key, state: "ready", body: {} },
        "2026-09-24",
        key,
      ),
    ).toBe(true);
    expect(
      digestCurrent(
        { day: "2026-09-23", consent_key: key, state: "ready", body: {} },
        "2026-09-24",
        key,
      ),
    ).toBe(false);
  });

  it("keeps no conversation token or memory offer", () => {
    const kept = digestBody({
      status: "answered",
      context: "sealed",
      contextNotice: "note",
      memorySuggestion: "Saving for a laptop",
    });
    expect(kept).toEqual({ status: "answered" });
  });
});
