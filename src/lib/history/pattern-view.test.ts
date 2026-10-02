import { describe, expect, it } from "vitest";
import type { AssociationResult } from "./associations";
import type { HistoricalMetric } from "./metrics";
import {
  formatSigned,
  pairMatrix,
  pairMonths,
  summarizeScan,
} from "./pattern-view";

const found: AssociationResult = {
  status: "found",
  metrics: ["expense_centavos", "task_completions"],
  from: "2025-02-01",
  through: "2025-12-31",
  months: 11,
  changes: 10,
  correlation: 0.981,
  adjustedP: 0.0007,
  direction: "together",
};

const results: AssociationResult[] = [
  found,
  {
    status: "withheld",
    metrics: ["income_centavos", "expense_centavos"],
    reason: "weak_or_uncertain",
  },
  {
    status: "withheld",
    metrics: ["income_centavos", "review_overall_score"],
    reason: "incomplete_history",
  },
  {
    status: "withheld",
    metrics: ["debt_payments_centavos", "review_overall_score"],
    reason: "incomplete_history",
  },
];

describe("summarizeScan", () => {
  it("separates findings and counts each withheld reason", () => {
    const scan = summarizeScan(results);
    expect(scan.total).toBe(4);
    expect(scan.findings).toEqual([found]);
    expect(scan.withheld).toEqual({
      incomplete_history: 2,
      too_few_records: 0,
      no_variation: 0,
      weak_or_uncertain: 1,
    });
  });
});

describe("pairMatrix", () => {
  it("lays every pair out once as a lower triangle", () => {
    const matrix = pairMatrix(results);
    expect(matrix.map((row) => row.metric)).toEqual([
      "expense_centavos",
      "debt_payments_centavos",
      "task_completions",
      "knowledge_reviews",
      "review_overall_score",
    ]);
    expect(matrix.map((row) => row.cells.length)).toEqual([1, 2, 3, 4, 5]);
    expect(matrix[2]!.cells[1]).toEqual({
      column: "expense_centavos",
      result: found,
    });
    expect(matrix[4]!.cells[2]!.result?.status).toBe("withheld");
    expect(matrix[1]!.cells[0]!.result).toBeNull();
  });
});

describe("pairMonths", () => {
  it("aligns both metrics month by month", () => {
    const rows: HistoricalMetric[] = [
      ["task_completions", "2025-03-01", 5],
      ["expense_centavos", "2025-03-01", 900],
      ["expense_centavos", "2025-02-01", 700],
      ["task_completions", "2025-02-01", 3],
    ].map(([metric, from, value]) => ({
      metric: metric as HistoricalMetric["metric"],
      period: {
        from: from as string,
        through: `${(from as string).slice(0, 8)}28`,
      },
      value: value as number,
      sourceCount: 2,
      coverage: "recorded",
      firstRecordedOn: "2025-01-01",
    }));
    expect(pairMonths(rows, ["expense_centavos", "task_completions"])).toEqual([
      {
        month: "2025-02-01",
        through: "2025-02-28",
        first: { value: 700, sourceCount: 2 },
        second: { value: 3, sourceCount: 2 },
      },
      {
        month: "2025-03-01",
        through: "2025-03-28",
        first: { value: 900, sourceCount: 2 },
        second: { value: 5, sourceCount: 2 },
      },
    ]);
  });
});

describe("formatSigned", () => {
  it("uses a true minus sign", () => {
    expect(formatSigned(-0.9891, 3)).toBe("−0.989");
    expect(formatSigned(0.5, 3)).toBe("0.500");
  });
});
