import { describe, expect, it } from "vitest";
import {
  historicalBucketCount,
  historicalWindow,
  metricDefinitions,
  parseHistoricalMetrics,
} from "./metrics";

const row = {
  metric_key: "income_centavos",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  value: "12345",
  source_count: 1,
  coverage: "partial",
  first_recorded_on: "2026-09-03",
};

describe("historical metric contract", () => {
  it("aligns months across a year boundary and bounds the daily lookback", () => {
    expect(historicalWindow("2026-01-15", "month", 3)).toEqual({
      from: "2025-11-01",
      through: "2026-01-15",
    });
    expect(historicalWindow("2026-03-01", "day", 12)).toEqual({
      from: "2026-01-31",
      through: "2026-03-01",
    });
  });

  it("counts calendar buckets instead of only elapsed days", () => {
    expect(historicalBucketCount("2025-12-31", "2026-01-01", "month")).toBe(2);
    expect(historicalBucketCount("2026-09-20", "2026-09-21", "week")).toBe(2);
    expect(historicalBucketCount("2026-09-01", "2026-09-12", "day")).toBe(12);
  });

  it("preserves integer centavos and missingness", () => {
    expect(parseHistoricalMetrics([row])[0]).toMatchObject({
      value: 12345,
      coverage: "partial",
      sourceCount: 1,
    });
    expect(
      parseHistoricalMetrics([
        {
          ...row,
          value: null,
          source_count: 0,
          coverage: "insufficient",
          first_recorded_on: null,
        },
      ])[0]?.value,
    ).toBeNull();
  });

  it("rejects overflow, invented zeroes and duplicate periods", () => {
    expect(() =>
      parseHistoricalMetrics([{ ...row, value: "9007199254740992" }]),
    ).toThrow();
    expect(() =>
      parseHistoricalMetrics([{ ...row, value: 0, coverage: "insufficient" }]),
    ).toThrow();
    expect(() => parseHistoricalMetrics([row, row])).toThrow();
    expect(() =>
      parseHistoricalMetrics([
        { ...row, metric_key: "review_overall_score", value: 11 },
      ]),
    ).toThrow();
  });

  it("rejects incomplete or mismatched aggregate responses", () => {
    const complete = Object.keys(metricDefinitions).map((metric_key) => ({
      metric_key,
      period_start: "2026-09-01",
      period_end: "2026-09-01",
      value: null,
      source_count: 0,
      coverage: "insufficient",
      first_recorded_on: null,
    }));
    const expected = {
      from: "2026-09-01",
      through: "2026-09-01",
      grain: "day" as const,
    };
    expect(parseHistoricalMetrics(complete, expected)).toHaveLength(6);
    expect(() => parseHistoricalMetrics(complete.slice(1), expected)).toThrow();
    expect(() =>
      parseHistoricalMetrics(
        [{ ...complete[0], period_end: "2026-09-02" }, ...complete.slice(1)],
        expected,
      ),
    ).toThrow();
  });
});
