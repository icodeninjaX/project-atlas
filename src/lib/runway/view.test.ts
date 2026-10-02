import { describe, expect, it } from "vitest";
import type { RunwayAnalysis } from "./engine";
import {
  addMonths,
  baselineDescription,
  dailyCentavos,
  formatMonthCount,
  runwayEndLabel,
  runwayFigure,
  runwayStatus,
  trackMonthLabel,
  trackMonths,
} from "./view";

describe("runway view", () => {
  it("splits the headline into a figure and a unit without false precision", () => {
    expect(runwayFigure(null)).toEqual({ value: "—", unit: "" });
    expect(runwayFigure(0.04)).toEqual({ value: "<0.1", unit: "months" });
    expect(runwayFigure(4.24)).toEqual({ value: "4.2", unit: "months" });
    expect(runwayFigure(120)).toEqual({ value: "99+", unit: "months" });
  });

  it("draws at least six months, past the runway and the target, up to two years", () => {
    expect(trackMonths(0.5, 3)).toBe(6);
    expect(trackMonths(4.2, 6)).toBe(7);
    expect(trackMonths(14.1, 6)).toBe(16);
    expect(trackMonths(40, 3)).toBe(24);
    expect(trackMonths(2, 24)).toBe(24);
  });

  it("names the status in words", () => {
    expect(runwayStatus(0.9, 6)).toEqual({
      tone: "destructive",
      label: "Under a month",
    });
    expect(runwayStatus(4.2, 6)).toEqual({
      tone: "caution",
      label: "Below 6-month target",
    });
    expect(runwayStatus(3, 3)).toEqual({
      tone: "positive",
      label: "3-month target met",
    });
  });

  it("adds calendar months, keeping inside shorter months", () => {
    expect(addMonths("2026-10-02", 0)).toBe("2026-10-02");
    expect(addMonths("2026-10-02", 1)).toBe("2026-11-02");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-10-02", 4.5)).toBe("2027-02-16");
    expect(addMonths("2026-12-15", 0.5)).toBe("2026-12-30");
  });

  it("says when the funds would run out the way a person would", () => {
    expect(runwayEndLabel("2026-10-02", 0.9)).toBe("October 29");
    expect(runwayEndLabel("2026-12-10", 1.2)).toBe("January 16, 2027");
    expect(runwayEndLabel("2026-10-02", 4.24)).toBe("early February 2027");
    expect(runwayEndLabel("2026-10-02", 4.5)).toBe("mid-February 2027");
    expect(runwayEndLabel("2026-10-25", 3)).toBe("late January 2027");
    expect(runwayEndLabel("2026-10-02", 120)).toBeNull();
  });

  it("labels each month of the track by the month it mostly covers", () => {
    expect(trackMonthLabel("2026-10-02", 1)).toBe("Nov");
    expect(trackMonthLabel("2026-10-25", 1)).toBe("Dec");
    expect(trackMonthLabel("2026-10-02", 3)).toBe("Jan ’27");
  });

  it("formats month counts and a day's share of a month", () => {
    expect(formatMonthCount(1)).toBe("1 month");
    expect(formatMonthCount(1.84)).toBe("1.8 months");
    expect(formatMonthCount(2)).toBe("2 months");
    expect(dailyCentavos(4_405_925)).toBe(144_852);
  });

  it("says where the monthly need comes from", () => {
    const baseline = (
      baselineSource: RunwayAnalysis["baselineSource"],
      includedMonths: string[],
    ) => ({ baselineSource, includedMonths }) as RunwayAnalysis;

    expect(
      baselineDescription(
        baseline("historical", ["2026-09-01", "2026-08-01", "2026-07-01"]),
      ),
    ).toBe("Average of Jul, Aug, and Sep 2026");
    expect(
      baselineDescription(baseline("historical", ["2026-01-01", "2025-12-01"])),
    ).toBe("Average of Dec 2025 and Jan 2026");
    expect(baselineDescription(baseline("budget", ["2026-10-01"]))).toBe(
      "Planned in the October 2026 budget",
    );
    expect(baselineDescription(baseline("none", []))).toBe("No baseline yet");
  });
});
