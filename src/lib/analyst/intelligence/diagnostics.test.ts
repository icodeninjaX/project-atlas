import { describe, expect, it } from "vitest";
import { cleanDiagnostics } from "./diagnostics";

const record = {
  status: "fallback_facts",
  outcome: "insufficient",
  path: "deep",
  planner: "ok" as const,
  stopReason: "sufficient",
  reads: [
    {
      tool: "getMoneyBreakdown",
      round: 1,
      status: "ready",
      error: null,
      evidence: 9,
    },
  ],
  stages: [{ stage: "writer", status: "ok", code: null }],
  rejections: ["review:shallow", "figure", "figure"],
  review: "completed",
  claims: { proposed: 4, passed: 0 },
  providerCalls: 4,
  durationMs: 21_000,
};

describe("answer diagnostics", () => {
  it("keeps codes, counts and timings, once each", () => {
    expect(cleanDiagnostics(record)).toMatchObject({
      rejections: ["review:shallow", "figure"],
      claims: { proposed: 4, passed: 0 },
    });
  });

  it("turns anything that is not a code into 'other', so no text is kept", () => {
    const cleaned = cleanDiagnostics({
      ...record,
      rejections: ["I'm saving for a laptop"],
      stages: [{ stage: "writer", status: "ok", code: "₱51,885.00 spent" }],
    })!;
    expect(cleaned.rejections).toEqual(["other"]);
    expect(cleaned.stages[0]!.code).toBe("other");
  });

  it("refuses a record that does not fit the shape", () => {
    expect(cleanDiagnostics({ ...record, planner: "maybe" })).toBeNull();
    expect(cleanDiagnostics(null)).toBeNull();
  });
});
