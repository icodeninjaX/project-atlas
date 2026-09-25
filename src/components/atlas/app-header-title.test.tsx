import { describe, expect, it } from "vitest";
import { pageTitleFor } from "./app-header-title";

describe("pageTitleFor", () => {
  it("names the current destination, preferring the most specific route", () => {
    expect(pageTitleFor("/dashboard")).toBe("Today");
    expect(pageTitleFor("/money/transactions")).toBe("Transactions");
    expect(pageTitleFor("/money/runway/details")).toBe("Runway");
    expect(pageTitleFor("/goals/abc")).toBe("Goals");
  });

  it("falls back to the product name for unknown routes", () => {
    expect(pageTitleFor("/goalsX")).toBe("ATLAS");
    expect(pageTitleFor(null)).toBe("ATLAS");
  });
});
