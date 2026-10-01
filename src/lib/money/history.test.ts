import { describe, expect, it } from "vitest";
import {
  formatPesoInput,
  groupByDate,
  parsePesoInput,
  relativeDayLabel,
  sanitizePesoInput,
  shiftIsoDate,
  splitFormattedMoney,
} from "./history";

describe("money history dates", () => {
  it("shifts calendar dates across month and year boundaries", () => {
    expect(shiftIsoDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftIsoDate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("names nearby days and spells out older ones", () => {
    expect(relativeDayLabel("2026-10-01", "2026-10-01")).toBe("Today");
    expect(relativeDayLabel("2026-09-30", "2026-10-01")).toBe("Yesterday");
    expect(relativeDayLabel("2026-09-29", "2026-10-01")).toBe("Tue, Sep 29");
    expect(relativeDayLabel("2025-12-30", "2026-01-02")).toBe(
      "Tue, Dec 30, 2025",
    );
  });

  it("groups newest-first rows by day without reordering", () => {
    const rows = [
      { id: 1, date: "2026-10-01" },
      { id: 2, date: "2026-10-01" },
      { id: 3, date: "2026-09-30" },
    ];

    expect(groupByDate(rows, (row) => row.date)).toEqual([
      { date: "2026-10-01", items: [rows[0], rows[1]] },
      { date: "2026-09-30", items: [rows[2]] },
    ]);
  });
});

describe("peso amount input", () => {
  it("splits centavos from the whole amount", () => {
    expect(splitFormattedMoney("₱183,626.35")).toEqual({
      whole: "₱183,626",
      fraction: ".35",
    });
    expect(splitFormattedMoney("₱0")).toEqual({ whole: "₱0", fraction: "" });
  });

  it("parses what the server accepts and nothing else", () => {
    expect(parsePesoInput("1,234.5")).toBe(123_450);
    expect(parsePesoInput("12")).toBe(1_200);
    expect(parsePesoInput("")).toBeNull();
    expect(parsePesoInput("1.234")).toBeNull();
    expect(parsePesoInput("-5")).toBeNull();
  });

  it("limits whole-peso digits without counting separators", () => {
    // Editing a formatted large amount must not drop digits.
    expect(sanitizePesoInput("123,456,789,012.00")).toBe("123,456,789,012.00");
    expect(sanitizePesoInput("1,234,567,890,123,456")).toBe(
      "1,234,567,890,123",
    );
    expect(sanitizePesoInput("12345678901234567.5")).toBe("1234567890123.5");
  });

  it("keeps typed amounts to digits and two decimals", () => {
    expect(sanitizePesoInput("₱1,2a3.456")).toBe("1,23.45");
    expect(sanitizePesoInput("10.5.6")).toBe("10.56");
  });

  it("formats a finished amount with separators", () => {
    expect(formatPesoInput("1234.5")).toBe("1,234.50");
    expect(formatPesoInput("abc")).toBe("abc");
  });
});
