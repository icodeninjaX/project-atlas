import { describe, expect, it } from "vitest";
import { buildDigestBody, isInQuietHours } from "./digest";

describe("notification digest", () => {
  it("handles quiet hours that cross midnight", () => {
    expect(isInQuietHours("23:30", "22:00", "07:00")).toBe(true);
    expect(isInQuietHours("06:59", "22:00", "07:00")).toBe(true);
    expect(isInQuietHours("08:00", "22:00", "07:00")).toBe(false);
  });

  it("only includes actionable enabled counts", () => {
    expect(
      buildDigestBody({ tasks: 2, debts: 1, payday: true, review: false }),
    ).toBe("2 tasks due · 1 debt payment due soon · Payday today");
    expect(
      buildDigestBody({ tasks: 0, debts: 0, payday: false, review: false }),
    ).toBe("");
  });
});
