import { describe, expect, it, vi } from "vitest";
import type { ToolResult } from "@/lib/analyst/tools/contracts";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/analyst/tools/server", () => ({ invokeAnalystTool: vi.fn() }));
const {
  gatherWeeklyInsightEvidence,
  insightWindows,
  previousWeekWindows,
  INSIGHT_METRICS,
} = await import("./insight");

// Thursday 2026-09-24, 10:00 in Manila.
const thursday = new Date("2026-09-24T02:00:00Z");

function result(
  status: ToolResult["status"],
  id: string,
  limitation = "Surviving records only.",
  period = { from: "2026-09-21", through: "2026-09-24" },
): ToolResult {
  return {
    tool: "getHistoricalMetricSeries",
    status,
    evidence:
      status === "ready"
        ? [
            {
              id,
              metric: "Recorded expenses",
              value: 100,
              unit: "centavos",
              period,
              comparisonBasis: "Weekly bucket",
              source: { description: "Transactions", recordIds: [], href: "/" },
              completeness: "complete",
              claimType: "FACT",
              provenance: {
                tool: "getHistoricalMetricSeries",
                calculationVersion: "1",
                retrievedAt: "2026-09-24T02:00:00Z",
                textTrust: "untrusted_data",
              },
            },
          ]
        : [],
    limitations: [limitation],
    metadata: {
      version: "1",
      startedAt: "",
      durationMs: 0,
      queries: 1,
      rows: 1,
      evidenceCount: 1,
      modelCalls: 0,
      tokens: 0,
      estimatedCost: 0,
    },
  };
}

describe("weekly insight windows", () => {
  it("compares this week so far with the same weekdays last week", () => {
    expect(insightWindows(thursday)).toEqual({
      current: { from: "2026-09-21", through: "2026-09-24" },
      previous: { from: "2026-09-14", through: "2026-09-17" },
    });
  });
  it("uses one day on a Monday", () => {
    expect(insightWindows(new Date("2026-09-21T01:00:00Z"))).toEqual({
      current: { from: "2026-09-21", through: "2026-09-21" },
      previous: { from: "2026-09-14", through: "2026-09-14" },
    });
  });
});

describe("last week windows", () => {
  it("compares the last full week with the week before", () => {
    expect(previousWeekWindows(thursday)).toEqual({
      current: { from: "2026-09-14", through: "2026-09-20" },
      previous: { from: "2026-09-07", through: "2026-09-13" },
    });
  });
  it("requests full weeks in previous mode", async () => {
    const invoke = vi.fn(async () => result("partial", "x"));
    const gathered = await gatherWeeklyInsightEvidence(
      thursday,
      invoke,
      "previous",
    );
    expect(invoke).toHaveBeenCalledWith("getHistoricalMetricSeries", {
      from: "2026-09-14",
      through: "2026-09-20",
      metric: "income_centavos",
      grain: "week",
    });
    expect(gathered.limitations[0]).toBe(
      "The week of 2026-09-14 is compared with the week of 2026-09-07.",
    );
  });
});

describe("weekly insight evidence", () => {
  it("requests both windows for every metric and merges limitations", async () => {
    const invoke = vi.fn(async (_name: unknown, raw: unknown) => {
      const input = raw as { from: string; through: string };
      return result("ready", JSON.stringify(input), undefined, {
        from: input.from,
        through: input.through,
      });
    });
    const gathered = await gatherWeeklyInsightEvidence(thursday, invoke);
    expect(invoke).toHaveBeenCalledTimes(INSIGHT_METRICS.length * 2);
    expect(invoke).toHaveBeenCalledWith("getHistoricalMetricSeries", {
      from: "2026-09-14",
      through: "2026-09-17",
      metric: "expense_centavos",
      grain: "week",
    });
    expect(invoke).toHaveBeenCalledWith("getHistoricalMetricSeries", {
      from: "2026-09-21",
      through: "2026-09-24",
      metric: "task_completions",
      grain: "week",
    });
    expect(gathered.complete).toBe(true);
    expect(gathered.evidence).toHaveLength(8);
    expect(gathered.limitations).toEqual([
      "This week is compared through 2026-09-24 with the same days last week, through 2026-09-17.",
      "Surviving records only.",
    ]);
  });
  it("reports incomplete evidence when a ready window is clipped to its first record", async () => {
    const invoke = vi.fn(async (_name: unknown, raw: unknown) => {
      const input = raw as { from: string; through: string };
      return result("ready", JSON.stringify(input), undefined, {
        // The first expense was recorded on Wednesday of this week.
        from: input.from === "2026-09-21" ? "2026-09-23" : input.from,
        through: input.through,
      });
    });
    const gathered = await gatherWeeklyInsightEvidence(thursday, invoke);
    expect(gathered.complete).toBe(false);
  });
  it("reports incomplete evidence when any window is not ready", async () => {
    let call = 0;
    const invoke = vi.fn(async () =>
      result(call++ === 0 ? "partial" : "ready", `item-${call}`),
    );
    const gathered = await gatherWeeklyInsightEvidence(thursday, invoke);
    expect(gathered.complete).toBe(false);
  });
});
