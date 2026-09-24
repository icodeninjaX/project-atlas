import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HistoricalMetric } from "@/lib/history/metrics";
import HistoryPage from "./page";

const history = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/history/server", () => ({
  loadHistoricalMetrics: history.load,
}));
vi.mock("@/components/history/history-filters", () => ({
  HistoryFilters: () => null,
}));
vi.mock("@/components/privacy/privacy-provider", () => ({
  SensitiveValue: ({ children }: { children: React.ReactNode }) => children,
}));

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

    const html = renderToStaticMarkup(
      await HistoryPage({ searchParams: Promise.resolve({ months: "1" }) }),
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    const period = container.querySelector("table tbody tr th");
    expect(period?.textContent).toContain("2026-09-01 – 2026-09-30");
    expect(period?.textContent).toContain("Counted 2026-09-03 – 2026-09-24");
  });
});
