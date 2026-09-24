import { describe, expect, it } from "vitest";
import {
  classifyQuestion,
  spendingEvidence,
  spendingPeriods,
  validateExplanation,
} from "./evidence";

const date = (iso: string) => new Date(iso);
const row = (
  id: string,
  transaction_date: string,
  amount_centavos: number,
  category_id = "food",
) => ({ id, transaction_date, amount_centavos, category_id });

describe("Analyst spending", () => {
  it("uses Manila dates and equivalent elapsed days at a year boundary", () => {
    expect(spendingPeriods(date("2027-01-01T00:30:00Z"))).toMatchObject({
      current: { from: "2027-01-01", through: "2027-01-01" },
      previous: { from: "2026-12-01", through: "2026-12-01" },
    });
  });

  it("uses integer centavos and excludes later prior-month days", () => {
    const result = spendingEvidence(
      [
        row("a", "2026-09-01", 10001),
        row("b", "2026-09-24", 2999),
        row("c", "2026-08-01", 7000),
        row("d", "2026-08-24", 1000),
        row("e", "2026-08-25", 999999),
      ],
      new Map([["food", "Food"]]),
      date("2026-09-24T05:00:00Z"),
    );
    expect(result.status).toBe("ready");
    expect(result.evidence.slice(0, 3).map((e) => e.value)).toEqual([
      13000, 8000, 5000,
    ]);
    expect(
      result.evidence.find((e) => e.id === "spending.change_percent")?.value,
    ).toBe(62.5);
    expect(result.evidence[0]?.period).toEqual({
      from: "2026-09-01",
      through: "2026-09-24",
    });
  });

  it("marks an uneven leap-month comparison as partial", () => {
    const result = spendingEvidence(
      [row("a", "2028-03-31", 100), row("b", "2028-02-29", 100)],
      new Map(),
      date("2028-03-31T05:00:00Z"),
    );
    expect(result.status).toBe("partial");
    expect(result.evidence[0]?.comparisonBasis).toBe(
      "Current days 1–31 versus previous days 1–29",
    );
  });

  it("caps an incomplete long month to equivalent prior-month days", () => {
    const periods = spendingPeriods(date("2028-03-30T05:00:00Z"));
    expect(periods.current.through).toBe("2028-03-29");
    expect(periods.previous.through).toBe("2028-02-29");
    const result = spendingEvidence(
      [
        row("a", "2028-03-29", 300),
        row("b", "2028-03-30", 999),
        row("c", "2028-02-29", 200),
      ],
      new Map(),
      date("2028-03-30T05:00:00Z"),
    );
    expect(result.status).toBe("partial");
    expect(result.evidence[0]?.value).toBe(300);
    expect(result.evidence[0]?.comparisonBasis).toBe("Days 1–29 of each month");
  });

  it("flags absent history and capped data", () => {
    const entries = [row("a", "2026-09-01", 100)];
    expect(
      spendingEvidence(entries, new Map(), date("2026-09-24T05:00:00Z")).status,
    ).toBe("insufficient");
    const capped = spendingEvidence(
      [...entries, row("b", "2026-08-01", 100)],
      new Map(),
      date("2026-09-24T05:00:00Z"),
      true,
    );
    expect(capped.status).toBe("partial");
    expect(capped.evidence.map((item) => item.id)).toEqual([
      "spending.records_inspected",
    ]);
  });

  it("rejects unsupported requests and unknown evidence IDs", () => {
    expect(classifyQuestion("What changed in my spending this month?")).toBe(
      "spending_change",
    );
    expect(classifyQuestion("Transfer money for me")).toBeNull();
    const evidence = spendingEvidence(
      [row("a", "2026-08-01", 100)],
      new Map(),
      date("2026-09-24T05:00:00Z"),
    ).evidence;
    expect(
      validateExplanation(
        {
          explanation: "Spending rose.",
          evidenceIds: ["made-up"],
          uncertainty: "",
        },
        evidence,
      ),
    ).toBeNull();
    expect(
      validateExplanation(
        {
          explanation: "You spent ₱100.",
          evidenceIds: ["spending.current"],
          uncertainty: "",
        },
        evidence,
      ),
    ).toBeNull();
    expect(
      validateExplanation(
        {
          explanation: "The recorded spending fell.",
          evidenceIds: ["spending.current"],
          uncertainty: "",
        },
        evidence,
      ),
    ).not.toBeNull();
    expect(
      validateExplanation(
        {
          explanation: "The recorded spending rose.",
          evidenceIds: ["spending.current"],
          uncertainty: "",
        },
        evidence,
      ),
    ).toBeNull();
    expect(
      validateExplanation(
        {
          explanation: "Spending fell because of shopping.",
          evidenceIds: ["spending.current"],
          uncertainty: "",
        },
        evidence,
      ),
    ).toBeNull();
  });
});
