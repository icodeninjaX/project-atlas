import { describe, expect, it } from "vitest";
import { resolveMentionedEntity } from "./mentions";

const goals = [
  { id: "g1", name: "Emergency Fund" },
  { id: "g2", name: "Car" },
  { id: "g3", name: "Car upgrade" },
];
const debts = [{ id: "d1", name: "BPI Loan" }];
const options = { goals, debts, allowGoal: true, allowDebt: true };

describe("resolveMentionedEntity", () => {
  it("resolves one whole-phrase goal mention", () => {
    expect(
      resolveMentionedEntity("Is my emergency-fund goal on track?", options),
    ).toEqual({ type: "goal", id: "g1", name: "Emergency Fund" });
  });
  it("prefers the longest overlapping name", () => {
    expect(
      resolveMentionedEntity("How is my car upgrade going?", options),
    ).toMatchObject({ id: "g3" });
  });
  it("treats two separate names as ambiguous", () => {
    expect(
      resolveMentionedEntity(
        "Compare my Emergency Fund and Car goals",
        options,
      ),
    ).toBeNull();
  });
  it("ignores partial words and disallowed kinds", () => {
    expect(resolveMentionedEntity("Any careers news?", options)).toBeNull();
    expect(
      resolveMentionedEntity("Extra monthly on my BPI loan?", {
        ...options,
        allowDebt: false,
      }),
    ).toBeNull();
  });
  it("does not guess when a goal and a debt are both named", () => {
    expect(
      resolveMentionedEntity("Emergency fund vs BPI loan monthly", options),
    ).toBeNull();
  });
});
