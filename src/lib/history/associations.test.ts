import { describe, expect, it } from "vitest";
import {
  associationWindow,
  discoverAllAssociations,
  discoverAssociation,
} from "./associations";
import {
  metricDefinitions,
  type HistoricalMetric,
  type MetricKey,
} from "./metrics";

const first: MetricKey = "expense_centavos";
const second: MetricKey = "task_completions";
const x = [10, 14, 11, 18, 16, 24, 20, 29, 25, 35, 30];
const y = [21, 29, 23, 36, 33, 49, 40, 59, 51, 71, 60];

function fixture(a = x, b = y): HistoricalMetric[] {
  return ([first, second] as const).flatMap((metric, series) =>
    (series === 0 ? a : b).map((value, index) => {
      const start = new Date(Date.UTC(2025, index + 1, 1));
      const end = new Date(Date.UTC(2025, index + 2, 0));
      return {
        metric,
        period: {
          from: start.toISOString().slice(0, 10),
          through: end.toISOString().slice(0, 10),
        },
        value,
        sourceCount: 2,
        coverage: "recorded" as const,
        firstRecordedOn: "2024-12-01",
      };
    }),
  );
}

describe("recorded association discovery", () => {
  it("uses eleven completed months and reports a reproducible adjusted finding", () => {
    expect(associationWindow("2026-01-20")).toEqual({
      from: "2025-02-01",
      through: "2025-12-31",
    });
    const result = discoverAssociation(fixture(), [first, second]);
    expect(result).toMatchObject({
      status: "found",
      direction: "together",
      months: 11,
      changes: 10,
      from: "2025-02-01",
      through: "2025-12-31",
    });
    if (result.status === "found") {
      expect(result.correlation).toBeGreaterThan(0.95);
      expect(result.adjustedP).toBeLessThanOrEqual(0.01);
      expect(discoverAssociation(fixture(), [first, second])).toEqual(result);
    }
  });

  it("withholds incomplete, shifted and sparse records rather than zero filling", () => {
    expect(
      discoverAssociation(fixture().slice(1), [first, second]),
    ).toMatchObject({
      status: "withheld",
      reason: "incomplete_history",
    });
    const partial = fixture();
    partial[2] = { ...partial[2]!, coverage: "partial" };
    expect(discoverAssociation(partial, [first, second])).toMatchObject({
      status: "withheld",
      reason: "incomplete_history",
    });
    const shifted = fixture();
    shifted[11] = {
      ...shifted[11]!,
      period: { from: "2025-02-02", through: "2025-02-28" },
    };
    expect(discoverAssociation(shifted, [first, second])).toMatchObject({
      status: "withheld",
      reason: "incomplete_history",
    });
    const sparse = fixture();
    for (const row of sparse.filter((item) => item.metric === first))
      row.sourceCount = 0;
    expect(discoverAssociation(sparse, [first, second])).toMatchObject({
      status: "withheld",
      reason: "too_few_records",
    });
  });

  it("withholds flat, unrelated and single-outlier movement", () => {
    expect(
      discoverAssociation(fixture(x, Array(11).fill(4)), [first, second]),
    ).toMatchObject({
      status: "withheld",
      reason: "no_variation",
    });
    expect(
      discoverAssociation(
        fixture(x, [20, 11, 25, 14, 17, 9, 30, 12, 28, 16, 19]),
        [first, second],
      ).status,
    ).toBe("withheld");
    expect(
      discoverAssociation(fixture(x, [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 100]), [
        first,
        second,
      ]).status,
    ).toBe("withheld");
  });

  it("labels a qualified inverse association without implying cause", () => {
    expect(
      discoverAssociation(
        fixture(
          x,
          y.map((value) => 100 - value),
        ),
        [first, second],
      ),
    ).toMatchObject({
      status: "found",
      direction: "opposite",
    });
  });

  it("recalculates after a source edit or deletion and scans the fixed fifteen-pair family", () => {
    const rows = fixture();
    expect(discoverAllAssociations(rows)).toHaveLength(15);
    const deleted = rows.filter(
      (row) => !(row.metric === second && row.period.from === "2025-05-01"),
    );
    expect(discoverAssociation(deleted, [first, second]).status).toBe(
      "withheld",
    );
    const edited = fixture(
      x,
      y.map((value, i) => (i === 6 ? 500 : value)),
    );
    expect(discoverAssociation(edited, [first, second]).status).toBe(
      "withheld",
    );
  });

  it("keeps the false-pattern rate low across synthetic independent searches", () => {
    let state = 0x12345678;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    let falseFindings = 0;
    for (let trial = 0; trial < 100; trial++) {
      const rows: HistoricalMetric[] = (
        Object.keys(metricDefinitions) as MetricKey[]
      ).flatMap((metric) =>
        Array.from({ length: 11 }, (_, index) => ({
          metric,
          period: {
            from: new Date(Date.UTC(2025, index + 1, 1))
              .toISOString()
              .slice(0, 10),
            through: new Date(Date.UTC(2025, index + 2, 0))
              .toISOString()
              .slice(0, 10),
          },
          value:
            metric === "review_overall_score"
              ? Math.floor(random() * 10) + 1
              : Math.floor(random() * 100) + 1,
          sourceCount: 2,
          coverage: "recorded" as const,
          firstRecordedOn: "2025-01-01",
        })),
      );
      if (
        discoverAllAssociations(rows).some(
          (result) => result.status === "found",
        )
      )
        falseFindings++;
    }
    expect(falseFindings).toBeLessThanOrEqual(5);
  });
});
