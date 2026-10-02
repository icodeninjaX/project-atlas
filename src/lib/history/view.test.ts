import { describe, expect, it } from "vitest";
import type { HistoricalMetric, MetricKey } from "./metrics";
import {
  axisLabel,
  countGrain,
  countedLabel,
  coverageLabel,
  formatMetricValue,
  historyHref,
  historyPoints,
  parseHistoryView,
  pointLabel,
  summarizeHistory,
  summarizeSeries,
} from "./view";

function row(
  metric: MetricKey,
  from: string,
  through: string,
  value: number | null,
  overrides: Partial<HistoricalMetric> = {},
): HistoricalMetric {
  return {
    metric,
    period: { from, through },
    value,
    sourceCount: value === null ? 0 : 1,
    coverage: value === null ? "insufficient" : "recorded",
    firstRecordedOn: "2026-01-01",
    ...overrides,
  };
}

const window = { from: "2026-07-01", through: "2026-09-24" };

const months = [
  ["2026-07-01", "2026-07-31"],
  ["2026-08-01", "2026-08-31"],
  ["2026-09-01", "2026-09-30"],
] as const;

describe("parseHistoryView", () => {
  it("defaults to six months by month", () => {
    expect(parseHistoryView({})).toEqual({ grain: "month", months: 6 });
  });

  it("accepts a supported grain and lookback", () => {
    expect(parseHistoryView({ grain: "week", months: "3" })).toEqual({
      grain: "week",
      months: 3,
    });
  });

  it("ignores anything else", () => {
    expect(parseHistoryView({ grain: "year", months: "24" })).toEqual({
      grain: "month",
      months: 6,
    });
  });

  it("always looks back thirty days by day", () => {
    expect(parseHistoryView({ grain: "day", months: "12" })).toEqual({
      grain: "day",
      months: 1,
    });
  });
});

describe("historyHref", () => {
  it("leaves the default bare", () => {
    expect(historyHref({ grain: "month", months: 6 })).toBe("/history");
  });

  it("carries grain and lookback", () => {
    expect(historyHref({ grain: "week", months: 3 })).toBe(
      "/history?grain=week&months=3",
    );
    expect(historyHref({ grain: "day", months: 12 })).toBe(
      "/history?grain=day&months=1",
    );
  });
});

describe("historyPoints", () => {
  it("orders buckets and names the dates a clipped bucket counts", () => {
    const points = historyPoints(
      [
        row("income_centavos", "2026-09-01", "2026-09-30", 3000, {
          coverage: "partial",
          firstRecordedOn: "2026-09-03",
        }),
        row("income_centavos", "2026-08-01", "2026-08-31", null, {
          firstRecordedOn: "2026-09-03",
        }),
      ],
      "income_centavos",
      window,
    );
    expect(points.map((point) => point.from)).toEqual([
      "2026-08-01",
      "2026-09-01",
    ]);
    expect(points[0]).toMatchObject({ clipped: false, current: false });
    expect(points[1]).toMatchObject({
      countedFrom: "2026-09-03",
      countedThrough: "2026-09-24",
      clipped: true,
      current: true,
    });
    expect(countedLabel(points[1]!, 2026)).toBe("Sep 3–24");
    expect(pointLabel(points[1]!, 2026)).toBe("Sep 2026");
  });

  it("clips the first bucket to the window", () => {
    const [point] = historyPoints(
      [
        row("task_completions", "2026-06-29", "2026-07-05", 4, {
          coverage: "partial",
        }),
      ],
      "task_completions",
      window,
    );
    expect(point).toMatchObject({
      countedFrom: "2026-07-01",
      countedThrough: "2026-07-05",
      clipped: true,
    });
  });
});

describe("summarizeSeries", () => {
  it("totals money and counts, and finds the peak and typical bucket", () => {
    const rows = months.map(([from, through], index) =>
      row("expense_centavos", from, through, [5000, 9000, 1000][index]!, {
        coverage: index === 2 ? "partial" : "recorded",
        sourceCount: 3,
      }),
    );
    const series = summarizeSeries(rows, "expense_centavos", window);
    expect(series.headline).toBe(15000);
    expect(series.sources).toBe(9);
    expect(series.valued).toBe(3);
    // Only fully recorded months count toward the typical month.
    expect(series.typical).toBe(7000);
    expect(series.typicalCount).toBe(2);
    expect(series.peak?.from).toBe("2026-08-01");
    expect(series.scaleMax).toBe(9000);
    expect(series.firstRecordedOn).toBe("2026-01-01");
  });

  it("weights the review score by how many reviews each bucket holds", () => {
    const rows = [
      row("review_overall_score", ...months[0], 8, { sourceCount: 1 }),
      row("review_overall_score", ...months[1], 5, { sourceCount: 3 }),
      row("review_overall_score", ...months[2], null),
    ];
    const series = summarizeSeries(rows, "review_overall_score", window);
    expect(series.headline).toBe(5.75);
    expect(series.typical).toBe(6.5);
    expect(series.scaleMax).toBe(10);
  });

  it("keeps a series with nothing in view empty", () => {
    const rows = months.map(([from, through]) =>
      row("knowledge_reviews", from, through, null, { firstRecordedOn: null }),
    );
    const series = summarizeSeries(rows, "knowledge_reviews", window);
    expect(series).toMatchObject({
      headline: null,
      sources: 0,
      valued: 0,
      typical: null,
      peak: null,
      firstRecordedOn: null,
      scaleMax: 1,
    });
  });

  it("names no peak when every bucket is zero", () => {
    const rows = months.map(([from, through]) =>
      row("task_completions", from, through, 0, { sourceCount: 0 }),
    );
    expect(summarizeSeries(rows, "task_completions", window).peak).toBeNull();
  });
});

describe("summarizeHistory", () => {
  const all = (value: number | null, first: string | null = "2026-01-01") =>
    (
      [
        "income_centavos",
        "expense_centavos",
        "debt_payments_centavos",
        "task_completions",
        "knowledge_reviews",
        "review_overall_score",
      ] as MetricKey[]
    ).map((metric) =>
      summarizeSeries(
        [
          row(metric, ...months[0], value, {
            firstRecordedOn: first,
            sourceCount: value === null ? 0 : 2,
          }),
        ],
        metric,
        window,
      ),
    );

  it("sums the money in view and the records behind it", () => {
    const overview = summarizeHistory(all(4));
    expect(overview.records).toBe(12);
    expect(overview.money).toMatchObject({
      income: 4,
      expenses: 4,
      debtPayments: 4,
      net: 0,
      incomeSources: 2,
    });
    expect(overview.status).toEqual({
      tone: "positive",
      label: "Every series has history",
    });
  });

  it("says how many series have history", () => {
    const series = all(4);
    series[1] = summarizeSeries(
      [row("expense_centavos", ...months[0], null)],
      "expense_centavos",
      window,
    );
    const overview = summarizeHistory(series);
    expect(overview.status.label).toBe("5 of 6 series have history");
    expect(overview.money.net).toBeNull();
  });

  it("tells an empty window from an empty account", () => {
    expect(summarizeHistory(all(null)).status).toEqual({
      tone: "caution",
      label: "No history in this window",
    });
    const empty = summarizeHistory(all(null, null));
    expect(empty.everRecorded).toBe(0);
    expect(empty.status.label).toBe("Nothing recorded yet");
  });
});

describe("labels", () => {
  const point = historyPoints(
    [row("income_centavos", "2025-12-01", "2025-12-31", 1)],
    "income_centavos",
    { from: "2025-12-01", through: "2026-01-10" },
  )[0]!;

  it("shortens axis labels inside the context year", () => {
    expect(axisLabel(point, "month", 2026, "2026-01-10")).toBe("Dec 2025");
    expect(axisLabel(point, "month", 2025, "2026-01-10")).toBe("Dec");
    expect(axisLabel(point, "week", 2025, "2026-01-10")).toBe("Dec 1");
    expect(
      axisLabel(
        { ...point, from: "2026-01-10", through: "2026-01-10" },
        "day",
        2026,
        "2026-01-10",
      ),
    ).toBe("Today");
  });

  it("formats values and coverage in each metric's words", () => {
    expect(formatMetricValue("income_centavos", 8500050)).toBe("₱85,000.50");
    expect(formatMetricValue("task_completions", 1234)).toBe("1,234");
    expect(formatMetricValue("review_overall_score", 6.5)).toBe("6.50 / 10");
    expect(coverageLabel("income_centavos", "insufficient")).toBe("No history");
    expect(coverageLabel("review_overall_score", "insufficient")).toBe(
      "No score",
    );
    expect(countGrain(1, "week")).toBe("1 week");
    expect(countGrain(6, "month")).toBe("6 months");
  });
});
