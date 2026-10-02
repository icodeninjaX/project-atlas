import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HistoricalMetric, MetricKey } from "@/lib/history/metrics";
import HistoryPage from "./page";

const history = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/history/server", () => ({
  loadHistoricalMetrics: history.load,
}));
vi.mock("@/components/privacy/privacy-provider", () => ({
  SensitiveValue: ({ children }: { children: React.ReactNode }) => children,
  usePrivacyMode: () => ({ hidden: false }),
}));

const metrics: MetricKey[] = [
  "income_centavos",
  "expense_centavos",
  "debt_payments_centavos",
  "task_completions",
  "knowledge_reviews",
  "review_overall_score",
];

/** One September bucket for every metric, as the RPC returns it. */
function september(
  values: Partial<Record<MetricKey, number | null>>,
  firstRecordedOn: string | null = "2026-09-03",
): HistoricalMetric[] {
  return metrics.map((metric) => {
    const value = metric in values ? values[metric]! : null;
    return {
      metric,
      period: { from: "2026-09-01", through: "2026-09-30" },
      value: firstRecordedOn ? value : null,
      sourceCount: value === null ? 0 : 2,
      coverage: firstRecordedOn && value !== null ? "partial" : "insufficient",
      firstRecordedOn,
    };
  });
}

async function render(query: { grain?: string; months?: string } = {}) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    await HistoryPage({ searchParams: Promise.resolve(query) }),
  );
  return container;
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("recorded history page", () => {
  it("shows the counted dates alongside a clipped calendar bucket", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T00:00:00Z"));
    history.load.mockResolvedValue([
      {
        metric: "income_centavos",
        period: { from: "2026-09-01", through: "2026-09-30" },
        value: 3000,
        sourceCount: 1,
        coverage: "partial",
        firstRecordedOn: "2026-09-03",
      } satisfies HistoricalMetric,
    ]);

    const container = await render({ months: "1" });
    const period = container.querySelector("table tbody tr th");
    expect(period?.textContent).toContain("Sep 2026");
    expect(period?.textContent).toContain("Counted Sep 3–24");
  });

  it("leads with the window, its records, and the money in it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T00:00:00Z"));
    history.load.mockResolvedValue(
      september({
        income_centavos: 500000,
        expense_centavos: 200000,
        task_completions: 4,
      }),
    );

    const container = await render({ grain: "month", months: "1" });
    expect(history.load).toHaveBeenCalledWith({
      from: "2026-09-01",
      through: "2026-09-24",
      grain: "month",
    });
    const hero = container.querySelector(
      'section[aria-labelledby="history-window-heading"]',
    )!;
    expect(hero.textContent).toContain("6records");
    expect(hero.textContent).toContain("Sep 1–24, 2026");
    expect(hero.textContent).toContain("3 of 6 series have history");
    expect(hero.textContent).toContain("+₱3,000.00");
    expect(container.querySelectorAll("table")).toHaveLength(6);
    expect(
      container.querySelector('a[href="#series-task_completions"]')
        ?.textContent,
    ).toContain("4");
  });

  it("marks the grain and lookback in force and links the others", async () => {
    history.load.mockResolvedValue(september({ income_centavos: 1 }));
    const container = await render({ grain: "week", months: "3" });
    const current = [
      ...container.querySelectorAll('[aria-current="page"]'),
    ].map((item) => item.textContent);
    expect(current).toEqual(["Week", "3M3 months"]);
    expect(
      container
        .querySelector('nav[aria-label="Group by"] a[href*="day"]')
        ?.getAttribute("href"),
    ).toBe("/history?grain=day&months=1");
    expect(
      [...container.querySelectorAll('nav[aria-label="Look back"] a')].map(
        (link) => link.getAttribute("href"),
      ),
    ).toEqual([
      "/history?grain=week&months=1",
      "/history?grain=week&months=3",
      "/history?grain=week&months=6",
      "/history?grain=week&months=12",
    ]);
  });

  it("explains where each series comes from before anything is recorded", async () => {
    history.load.mockResolvedValue(september({}, null));
    const container = await render();
    expect(container.textContent).toContain("Nothing recorded yet");
    expect(container.textContent?.match(/No source records yet/g)).toHaveLength(
      6,
    );
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector('nav[aria-label="Group by"]')).toBeNull();
  });

  it("says when history cannot be loaded", async () => {
    history.load.mockRejectedValue(new Error("unavailable"));
    const container = await render();
    expect(container.textContent).toContain("History could not be loaded");
  });
});
