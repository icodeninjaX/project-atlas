import { describe, expect, it } from "vitest";
import { CalculationError, NET_FLOW_SCOPE, netFlow } from "./calculations";
import { checkClaim, claimCanShip, type ClaimCheckContext } from "./claims";
import type { DraftClaim, EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { deterministicDraft } from "./fallback";
import { PERIODS } from "./evaluation/fixtures";
import { V2_NOW, brief, metricEvidence } from "./evaluation/v2-fixtures";

const period = PERIODS.currentMonthToDate;
const scope = (kind: string) => ({
  id: `whole_domain:${kind}`,
  type: "whole_domain" as const,
  description: `All of the owner's recorded ${kind}`,
});
const income = metricEvidence({
  id: "income.total",
  metricKey: "income_centavos",
  value: 5_050_000,
  period,
  scope: scope("income"),
});
const expense = metricEvidence({
  id: "expense.total",
  metricKey: "expense_centavos",
  value: 5_171_000,
  period,
  scope: scope("expense"),
});
const tasks = metricEvidence({
  id: "tasks",
  metricKey: "task_completions",
  value: 5,
  period,
  scope: scope("activity"),
});
const evidence: EvidenceV2[] = [income, expense, tasks];
const derived = autoDerive(evidence);
const net = derived.find((item) => item.scopeId === NET_FLOW_SCOPE)!;

const ctx: ClaimCheckContext = {
  brief: brief([["r_money", true]]),
  evidence: new Map(evidence.map((item) => [item.id, item])),
  derived: new Map(derived.map((item) => [item.id, item])),
  now: V2_NOW,
};
const requirement = ctx.brief.requirements[0]!.id;
const claim = (extra: Partial<DraftClaim>): DraftClaim => ({
  id: "c1",
  kind: "fact",
  text: "Recorded expenses of ₱51,710.00 were higher than recorded income of ₱50,500.00, a gap of ₱1,210.00.",
  answersRequirementIds: [requirement],
  evidenceIds: [expense.id, income.id],
  derivedFactIds: [net.id],
  assumptionIds: [],
  scopeId: NET_FLOW_SCOPE,
  comparison: {
    subjectId: expense.id,
    referenceId: income.id,
    direction: "higher",
  },
  recommendation: null,
  ...extra,
});

describe("income against spending", () => {
  it("derives recorded income less expenses for a shared period", () => {
    expect(net).toMatchObject({
      operation: "difference",
      operands: [income.id, expense.id],
      output: { status: "defined", value: -121_000, unit: "centavos" },
      complete: true,
    });
  });

  it("refuses to net anything but whole-domain income and expenses", () => {
    expect(() => netFlow("x", expense, income)).toThrow(CalculationError);
    expect(() =>
      netFlow("x", income, {
        ...expense,
        time: {
          ...expense.time,
          period: PERIODS.previousAligned,
        },
      }),
    ).toThrow(CalculationError);
  });

  it("ships a claim that sets expenses against income with all three amounts", () => {
    const checked = checkClaim(claim({}), ctx);
    expect(checked.verification.reasons).toEqual([]);
    expect(claimCanShip(checked)).toBe(true);
  });

  it("rejects the wrong direction", () => {
    const checked = checkClaim(
      claim({
        text: "Recorded expenses of ₱51,710.00 were lower than recorded income of ₱50,500.00.",
        comparison: {
          subjectId: expense.id,
          referenceId: income.id,
          direction: "lower",
        },
      }),
      ctx,
    );
    expect(checked.verification.reasons).toContain("comparison");
  });

  it("still keeps other areas out of a money-flow claim", () => {
    const checked = checkClaim(
      claim({
        text: "Recorded expenses were ₱51,710.00 and 5 tasks were completed.",
        evidenceIds: [expense.id, tasks.id],
        derivedFactIds: [],
        comparison: null,
      }),
      ctx,
    );
    expect(checked.verification.reasons).toContain("scope_mismatch");
  });
});

describe("facts-only fallback", () => {
  it("leads with income less expenses, which passes the checks", () => {
    const draft = deterministicDraft(
      ctx.brief,
      evidence,
      { r_money: [income.id, expense.id] },
      derived,
    );
    const [first] = draft.claims;
    expect(first?.text).toBe(
      `Recorded income less recorded expenses: -₱1,210.00 from ${period.from} to ${period.through}.`,
    );
    expect(draft.directAnswerClaimIds).toEqual([first!.id]);
    expect(claimCanShip(checkClaim(first!, ctx))).toBe(true);
  });
});

describe("wording about the analysis itself", () => {
  it("rejects talk of what the model received or read", () => {
    for (const text of [
      "Recorded expenses were ₱51,710.00; the newly read monthly figures were not included in the evidence I received.",
      "Derived facts show recorded expenses of ₱51,710.00.",
    ]) {
      const checked = checkClaim(
        claim({
          text,
          evidenceIds: [expense.id],
          derivedFactIds: [],
          scopeId: "whole_domain:expense",
          comparison: null,
        }),
        ctx,
      );
      expect(checked.verification.reasons, text).toContain("process_wording");
    }
    // Plain statements about the records pass.
    const plain = checkClaim(
      claim({
        text: "Recorded expenses were ₱51,710.00 this month.",
        evidenceIds: [expense.id],
        derivedFactIds: [],
        scopeId: "whole_domain:expense",
        comparison: null,
      }),
      ctx,
    );
    expect(plain.verification.reasons).toEqual([]);
  });
});
