import { describe, expect, it } from "vitest";
import { CalculationError, perDay } from "./calculations";
import { checkClaim, claimCanShip, type ClaimCheckContext } from "./claims";
import type { DraftClaim, EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { brief, metricEvidence } from "./evaluation/v2-fixtures";

// The production case: transactions start on 18 August, and September so
// far is set against the same days of August.
const expenseScope = {
  id: "whole_domain:expense",
  type: "whole_domain" as const,
  description: "All of the owner's recorded expenses",
};
const september = metricEvidence({
  id: "expense.sep",
  metricKey: "expense_centavos",
  value: 5_171_000,
  period: { from: "2026-09-01", through: "2026-09-29" },
  scope: expenseScope,
});
const august = metricEvidence({
  id: "expense.aug",
  metricKey: "expense_centavos",
  value: 388_500,
  period: { from: "2026-08-01", through: "2026-08-29" },
  scope: expenseScope,
});
const inventory = metricEvidence({
  id: "getDataInventory.inventory.transactions",
  metricKey: "inventory_transactions",
  value: 40,
  period: { from: "2026-08-18", through: "2026-09-29" },
  scope: {
    id: "inventory:transactions",
    type: "whole_domain",
    description: "Transactions",
  },
});
const evidence: EvidenceV2[] = [september, august, inventory];
const derived = autoDerive(evidence, { today: "2026-09-29" });
const find = (prefix: string) =>
  derived.find((item) => item.id.startsWith(prefix));

describe("pace per recorded day", () => {
  it("counts only the days since the first record", () => {
    const pace = perDay("x", august, {
      day: "2026-08-18",
      evidenceId: inventory.id,
    });
    expect(pace).toMatchObject({
      operation: "per_day",
      operands: [august.id, inventory.id],
      periods: [{ from: "2026-08-18", through: "2026-08-29" }],
      output: { status: "defined", value: 32_375, unit: "centavos" },
    });
    expect(() =>
      perDay("x", august, { day: "2026-09-01", evidenceId: inventory.id }),
    ).toThrow(CalculationError);
  });

  it("compares paces, not totals, when a period starts before the records", () => {
    expect(find("derived.change.")).toBeUndefined();
    expect(find("derived.percent.")).toBeUndefined();
    expect(find("derived.pace_change.")).toMatchObject({
      operation: "difference",
      output: { status: "defined", value: 178_310 - 32_375 },
    });
    expect(
      derived.find(
        (item) =>
          item.id.startsWith("derived.pace_change.") &&
          item.operation === "percent_change",
      )?.output,
    ).toEqual({ status: "defined", value: 450.8, unit: "percent" });
  });

  it("keeps the change in totals when the records cover both periods", () => {
    const covered = autoDerive([september, august]);
    expect(covered.some((item) => item.id.startsWith("derived.change."))).toBe(
      true,
    );
  });

  it("projects the month in progress at its pace", () => {
    expect(find("derived.projection.")).toMatchObject({
      operation: "projection",
      periods: [{ from: "2026-09-01", through: "2026-09-30" }],
      output: { status: "defined", value: 5_171_000 + 178_310 },
    });
    // August is not covered from its first day, so it has no projection.
    expect(
      derived.filter((item) => item.operation === "projection"),
    ).toHaveLength(1);

    // A past month, or no known date, is never projected.
    for (const today of ["2026-10-02", undefined])
      expect(
        autoDerive(evidence, { today }).some(
          (item) => item.operation === "projection",
        ),
      ).toBe(false);
  });
});

describe("pace and projection claims", () => {
  const ctx: ClaimCheckContext = {
    brief: brief([["r_money", true]]),
    evidence: new Map(evidence.map((item) => [item.id, item])),
    derived: new Map(derived.map((item) => [item.id, item])),
    now: new Date("2026-09-30T02:00:00.000Z"),
  };
  const requirement = ctx.brief.requirements[0]!.id;
  const claim = (extra: Partial<DraftClaim>): DraftClaim => ({
    id: "c1",
    kind: "calculation",
    text: "",
    answersRequirementIds: [requirement],
    evidenceIds: [],
    derivedFactIds: [],
    assumptionIds: [],
    scopeId: "whole_domain:expense",
    comparison: null,
    recommendation: null,
    ...extra,
  });
  const paceIds = derived
    .filter(
      (item) =>
        item.operation === "per_day" ||
        (item.id.startsWith("derived.pace_change.") &&
          item.operation === "difference"),
    )
    .map((item) => item.id);

  it("ships a pace comparison that names the days and the first record", () => {
    const checked = checkClaim(
      claim({
        text: "You spent ₱1,783.10 per day over 29 days in September, up from ₱323.75 per day over the 12 days since your records began on August 18.",
        derivedFactIds: paceIds,
      }),
      ctx,
    );
    expect(checked.verification.reasons).toEqual([]);
    expect(claimCanShip(checked)).toBe(true);
  });

  it("needs a projection to read as an estimate", () => {
    const projection = find("derived.projection.")!.id;
    const certain = checkClaim(
      claim({
        text: "September spending ends at ₱53,493.10.",
        derivedFactIds: [projection],
      }),
      ctx,
    );
    expect(certain.verification.reasons).toContain("projection_wording");
    const hedged = checkClaim(
      claim({
        text: "At this pace, September spending would end near ₱53,493.10.",
        derivedFactIds: [projection],
      }),
      ctx,
    );
    expect(hedged.verification.reasons).toEqual([]);
  });
});
