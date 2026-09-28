import { describe, expect, it } from "vitest";
import { debtScenario, referencePhrase, vagueIncomeDrop } from "./references";

describe("reference phrases", () => {
  it("finds the phrase that names one record", () => {
    expect(
      referencePhrase(
        "What changed after my decision to study part-time?",
        "decision",
      ),
    ).toBe("study part-time");
    expect(
      referencePhrase(
        "What did I originally assume when I decided to study part-time?",
        "decision",
      ),
    ).toBe("study part-time");
    expect(
      referencePhrase(
        "Was my part-time study decision successful?",
        "decision",
      ),
    ).toBe("part-time study");
    expect(
      referencePhrase("Was studying part-time the right call?", "decision"),
    ).toBe("studying part-time");
    // Question grammar after the name is not part of it.
    expect(
      referencePhrase(
        "Was my decision to study part-time the right call?",
        "decision",
      ),
    ).toBe("study part-time");
    expect(
      referencePhrase(
        "Was my decision to study part-time successful?",
        "decision",
      ),
    ).toBe("study part-time");
    expect(
      referencePhrase(
        "How is my Land a developer job goal going this month?",
        "goal",
      ),
    ).toBe("Land a developer job");
    expect(
      referencePhrase(
        "Compare paying an extra ₱2,000 monthly on my Synthetic Card debt.",
        "debt",
      ),
    ).toBe("Synthetic");
  });

  it("returns null when nothing specific is named", () => {
    expect(referencePhrase("How is my main goal going?", "goal")).toBeNull();
    expect(
      referencePhrase(
        "Which of my goals should get my limited attention this week?",
        "goal",
      ),
    ).toBeNull();
    expect(
      referencePhrase(
        "Which job applications need a follow-up?",
        "job_application",
      ),
    ).toBeNull();
    expect(
      referencePhrase("How much did I spend this month?", "decision"),
    ).toBeNull();
  });
});

describe("vague income drops", () => {
  it("asks for an amount only when none is stated", () => {
    expect(vagueIncomeDrop("What if my income drops?")).toBe(true);
    // A year is not an amount.
    expect(vagueIncomeDrop("What if my income drops in 2027?")).toBe(true);
    expect(vagueIncomeDrop("What if my income drops by 10%?")).toBe(false);
    expect(vagueIncomeDrop("What if my income drops by ₱5,000?")).toBe(false);
    expect(vagueIncomeDrop("What if my income drops 10 percent?")).toBe(false);
    expect(vagueIncomeDrop("How much did I spend this month?")).toBe(false);
  });
});

describe("debt scenarios", () => {
  it("reads extra monthly payments as alternatives", () => {
    expect(
      debtScenario(
        "Compare paying an extra ₱2,000 monthly versus ₱4,000 monthly on my Synthetic Card debt.",
      ),
    ).toEqual({
      extraMonthlyPesos: ["2000", "4000"],
      incomeChangePercent: null,
      oneTimePayoff: false,
    });
  });

  it("reads a monthly cadence anywhere in an extra-payment question", () => {
    expect(
      debtScenario("What if I pay an extra ₱2,000 toward my card each month?"),
    ).toMatchObject({ extraMonthlyPesos: ["2000"] });
    expect(
      debtScenario(
        "Compare ₱2,000 versus ₱4,000 in extra monthly payments on my card.",
      ),
    ).toMatchObject({ extraMonthlyPesos: ["2000", "4000"] });
    // An income amount is never read as a payment.
    expect(
      debtScenario(
        "What if my monthly income is ₱50,000 and I pay an extra ₱2,000 on my card?",
      ),
    ).toMatchObject({ extraMonthlyPesos: ["2000"] });
  });

  it("reads an income change with an extra payment", () => {
    expect(
      debtScenario(
        "What if my monthly income falls by 20% while I pay an extra ₱2,000 monthly on my card?",
      ),
    ).toEqual({
      extraMonthlyPesos: ["2000"],
      incomeChangePercent: -20,
      oneTimePayoff: false,
    });
  });

  it("flags a one-time payoff, which the runway engine does not model", () => {
    expect(
      debtScenario(
        "What if I pay off my card with a one-time ₱40,000 payment?",
      ),
    ).toMatchObject({ extraMonthlyPesos: [], oneTimePayoff: true });
  });

  it("returns null without an explicit change", () => {
    expect(
      debtScenario(
        "How has my available cash changed while I pay down my card?",
      ),
    ).toBeNull();
    expect(debtScenario("How much did I spend this month?")).toBeNull();
  });
});
