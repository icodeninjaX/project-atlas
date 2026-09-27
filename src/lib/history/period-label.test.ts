import { describe, expect, it } from "vitest";
import { formatPeriodLabel } from "./period-label";

describe("formatPeriodLabel", () => {
  it.each([
    ["2026-09-26", "2026-09-26", "Sep 26, 2026"],
    ["2026-09-01", "2026-09-30", "Sep 2026"],
    ["2024-02-01", "2024-02-29", "Feb 2024"],
    ["2026-09-21", "2026-09-27", "Sep 21–27, 2026"],
    ["2026-09-03", "2026-09-30", "Sep 3–30, 2026"],
    ["2026-09-28", "2026-10-04", "Sep 28 – Oct 4, 2026"],
    ["2025-12-29", "2026-01-04", "Dec 29, 2025 – Jan 4, 2026"],
  ])("labels %s to %s as %s", (from, through, label) => {
    expect(formatPeriodLabel(from, through)).toBe(label);
  });

  it("drops the year inside the context year except for whole months", () => {
    const options = { contextYear: 2026 };
    expect(formatPeriodLabel("2026-09-26", "2026-09-26", options)).toBe(
      "Sep 26",
    );
    expect(formatPeriodLabel("2026-09-21", "2026-09-27", options)).toBe(
      "Sep 21–27",
    );
    expect(formatPeriodLabel("2026-08-31", "2026-09-06", options)).toBe(
      "Aug 31 – Sep 6",
    );
    expect(formatPeriodLabel("2026-09-01", "2026-09-30", options)).toBe(
      "Sep 2026",
    );
    expect(formatPeriodLabel("2025-12-29", "2026-01-04", options)).toBe(
      "Dec 29, 2025 – Jan 4, 2026",
    );
    expect(formatPeriodLabel("2025-12-01", "2025-12-07", options)).toBe(
      "Dec 1–7, 2025",
    );
  });
});
