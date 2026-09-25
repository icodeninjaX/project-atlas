import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HistoricalMetric } from "@/lib/history/metrics";
import PatternsPage from "./page";

const history = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/history/server", () => ({
  loadHistoricalMetrics: history.load,
}));
vi.mock("@/components/privacy/privacy-provider", () => ({
  SensitiveValue: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("recorded patterns page", () => {
  it("shows a source-linked table and stated method for a qualified association", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-20T00:00:00Z"));
    const a = [10, 14, 11, 18, 16, 24, 20, 29, 25, 35, 30];
    const b = [21, 29, 23, 36, 33, 49, 40, 59, 51, 71, 60];
    const rows: HistoricalMetric[] = [
      "expense_centavos",
      "task_completions",
    ].flatMap((metric, series) =>
      (series === 0 ? a : b).map((value, index) => ({
        metric: metric as HistoricalMetric["metric"],
        period: {
          from: new Date(Date.UTC(2025, index + 1, 1))
            .toISOString()
            .slice(0, 10),
          through: new Date(Date.UTC(2025, index + 2, 0))
            .toISOString()
            .slice(0, 10),
        },
        value,
        sourceCount: 2,
        coverage: "recorded" as const,
        firstRecordedOn: "2025-01-01",
      })),
    );
    history.load.mockResolvedValue(rows);
    const html = renderToStaticMarkup(await PatternsPage());
    expect(history.load).toHaveBeenCalledWith({
      from: "2025-02-01",
      through: "2025-12-31",
      grain: "month",
    });
    expect(html).toContain("Month to month changes tended to move");
    expect(html).toContain("adjusted permutation");
    expect(html).toContain("Monthly values behind this association");
    expect(html).toContain("/money/transactions");
    expect(html).toContain("/tasks");
  });

  it("withholds findings when history is unavailable", async () => {
    history.load.mockResolvedValue([]);
    expect(renderToStaticMarkup(await PatternsPage())).toContain(
      "No reliable pattern to show yet",
    );
  });
});
