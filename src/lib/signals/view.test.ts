import { describe, expect, it } from "vitest";
import type { Signal } from "@/lib/signals/engine";
import {
  groupSignals,
  hasSignalFilters,
  matchesSignalFilters,
  parseFigure,
  parseSignalFilters,
  radarBlips,
  signalAnchor,
  signalFacets,
  signalsHref,
  signalVisual,
  summarizeSignals,
} from "@/lib/signals/view";

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    type: "money.budget-threshold",
    category: "Money",
    severity: "info",
    title: "Budget limit approaching",
    message: "You've used 80% of your monthly budget.",
    reason: "Expenses are ₱8,000.00 against a ₱10,000.00 plan.",
    metric: { label: "Budget used", value: "80%" },
    comparison: { label: "Monthly plan", value: "₱10,000.00" },
    href: "/money/budget",
    generatedAt: "2026-10-02T11:00:00.000Z",
    sensitive: true,
    ...overrides,
  };
}

describe("signal filters", () => {
  it("reads known filters from the address and ignores the rest", () => {
    expect(
      parseSignalFilters({ category: "money", severity: "warning" }),
    ).toEqual({ category: "Money", severity: "warning" });
    expect(parseSignalFilters({ category: "DEBT" })).toEqual({
      category: "Debt",
      severity: null,
    });
    expect(
      parseSignalFilters({ category: "weather", severity: "loud" }),
    ).toEqual({ category: null, severity: null });
    expect(parseSignalFilters({ category: ["goals", "money"] })).toEqual({
      category: "Goals",
      severity: null,
    });
  });

  it("writes the same address the page reads", () => {
    expect(signalsHref({ category: null, severity: null })).toBe("/signals");
    expect(signalsHref({ category: "Career", severity: null })).toBe(
      "/signals?category=career",
    );
    expect(signalsHref({ category: "Tasks", severity: "critical" })).toBe(
      "/signals?category=tasks&severity=critical",
    );
    expect(hasSignalFilters({ category: null, severity: "info" })).toBe(true);
    expect(hasSignalFilters({ category: null, severity: null })).toBe(false);
  });

  it("matches on both filters", () => {
    const debt = signal({ category: "Debt", severity: "critical" });
    expect(
      matchesSignalFilters(debt, { category: "Debt", severity: null }),
    ).toBe(true);
    expect(
      matchesSignalFilters(debt, { category: "Debt", severity: "warning" }),
    ).toBe(false);
  });

  it("counts each strip with the other strip's filter applied", () => {
    const signals = [
      signal({ id: "a", category: "Money", severity: "critical" }),
      signal({ id: "b", category: "Money", severity: "info" }),
      signal({ id: "c", category: "Tasks", severity: "critical" }),
      signal({ id: "d", category: "Goals", severity: "positive" }),
    ];
    const facets = signalFacets(signals, {
      category: "Money",
      severity: "critical",
    });
    expect(facets.categories).toEqual({
      Money: 1,
      Debt: 0,
      Tasks: 1,
      Career: 0,
      Goals: 0,
    });
    expect(facets.categoryTotal).toBe(2);
    expect(facets.severities).toEqual({
      critical: 1,
      warning: 0,
      positive: 0,
      info: 1,
    });
    expect(facets.severityTotal).toBe(2);
  });
});

describe("summarizeSignals", () => {
  it("leads with what needs attention and where", () => {
    const summary = summarizeSignals([
      signal({ id: "a", category: "Debt", severity: "critical" }),
      signal({ id: "b", category: "Money", severity: "warning" }),
      signal({ id: "c", category: "Money", severity: "warning" }),
      signal({ id: "d", category: "Tasks", severity: "positive" }),
      signal({ id: "e", category: "Goals", severity: "positive" }),
      signal({ id: "f", category: "Career", severity: "info" }),
    ]);
    expect(summary.headline).toEqual({ value: 3, label: "need attention" });
    expect(summary.status).toEqual({ tone: "destructive", label: "Act now" });
    expect(summary.sentence).toBe(
      "1 critical and 2 warnings across Debt and Money, plus 2 signs of progress and 1 update.",
    );
    expect(summary.lead?.id).toBe("a");
    expect(summary.counts).toEqual({
      critical: 1,
      warning: 2,
      positive: 2,
      info: 1,
    });
  });

  it("speaks of one area and one item in the singular", () => {
    const summary = summarizeSignals([
      signal({ id: "a", category: "Tasks", severity: "warning" }),
    ]);
    expect(summary.headline).toEqual({ value: 1, label: "needs attention" });
    expect(summary.status.tone).toBe("caution");
    expect(summary.sentence).toBe("1 warning in Tasks.");
  });

  it("counts every signal when nothing needs attention", () => {
    const summary = summarizeSignals([
      signal({ id: "a", category: "Tasks", severity: "positive" }),
      signal({ id: "b", category: "Goals", severity: "info" }),
    ]);
    expect(summary.headline).toEqual({ value: 2, label: "signals" });
    expect(summary.status).toEqual({
      tone: "positive",
      label: "Nothing urgent",
    });
    expect(summary.sentence).toBe(
      "1 sign of progress and 1 update across Tasks and Goals.",
    );
    expect(summary.lead).toBeNull();
  });

  it("is all clear with no signals", () => {
    const summary = summarizeSignals([]);
    expect(summary.total).toBe(0);
    expect(summary.status.label).toBe("All clear");
    expect(summary.sentence).toBe("");
  });
});

describe("groupSignals", () => {
  it("keeps rank order inside each section and drops empty sections", () => {
    const groups = groupSignals([
      signal({ id: "a", severity: "critical" }),
      signal({ id: "b", severity: "warning" }),
      signal({ id: "c", severity: "info" }),
    ]);
    expect(groups.map((group) => group.id)).toEqual(["attention", "updates"]);
    expect(groups[0]!.signals.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups[0]!.label).toBe("Needs attention");
  });
});

describe("signalAnchor", () => {
  it("makes a safe fragment id", () => {
    expect(signalAnchor("debt-deadline-1f2e")).toBe(
      "signal-debt-deadline-1f2e",
    );
    expect(signalAnchor("a b/c")).toBe("signal-a-b-c");
  });
});

describe("parseFigure", () => {
  it("reads the engine's figures and nothing else", () => {
    expect(parseFigure("₱12,000.50")).toEqual({
      amount: 12000.5,
      unit: "peso",
    });
    expect(parseFigure("104%")).toEqual({ amount: 104, unit: "percent" });
    expect(parseFigure("7")).toEqual({ amount: 7, unit: "count" });
    expect(parseFigure("in 3 days")).toBeNull();
    expect(parseFigure("Oct 12, 2026")).toBeNull();
    expect(parseFigure(undefined)).toBeNull();
  });
});

describe("signalVisual", () => {
  it("compares spending with its baseline as a percentage", () => {
    expect(
      signalVisual(
        signal({
          type: "money.spending-increase",
          metric: { label: "This month", value: "₱14,600.00" },
          comparison: {
            label: "Recent monthly average",
            value: "₱10,000.00",
          },
        }),
      ),
    ).toEqual({
      kind: "versus",
      current: 14600,
      baseline: 10000,
      change: "+46%",
      direction: "up",
    });
  });

  it("compares counts as a difference", () => {
    expect(
      signalVisual(
        signal({
          type: "tasks.overdue-increase",
          metric: { label: "Overdue now", value: "9" },
          comparison: { label: "Same time last week", value: "4" },
        }),
      ),
    ).toMatchObject({ kind: "versus", change: "+5", direction: "up" });
  });

  it("fills a meter for budget use and marks overspending", () => {
    expect(
      signalVisual(signal({ metric: { label: "Budget used", value: "112%" } })),
    ).toEqual({ kind: "share", share: 1, over: true, caption: null });
    expect(signalVisual(signal())).toMatchObject({ share: 0.8, over: false });
  });

  it("states conversion in words beside its meter", () => {
    expect(
      signalVisual(
        signal({
          type: "career.low-conversion",
          metric: { label: "Applications submitted", value: "12" },
          comparison: { label: "Reached interview", value: "1" },
        }),
      ),
    ).toMatchObject({ kind: "share", caption: "8% reached an interview" });
  });

  it("draws nothing for figures it cannot read", () => {
    expect(
      signalVisual(
        signal({
          type: "debt.deadline",
          metric: { label: "Due", value: "in 3 days" },
        }),
      ),
    ).toBeNull();
    expect(
      signalVisual(
        signal({
          type: "money.spending-increase",
          metric: { label: "This month", value: "₱1.00" },
          comparison: { label: "Recent monthly average", value: "4" },
        }),
      ),
    ).toBeNull();
  });
});

describe("radarBlips", () => {
  it("places urgent signals nearer the center, inside their area", () => {
    const [critical, info] = radarBlips([
      signal({ id: "a", category: "Money", severity: "critical" }),
      signal({ id: "b", category: "Money", severity: "info" }),
    ]);
    const distance = (blip: { x: number; y: number }) =>
      Math.hypot(blip.x, blip.y);
    expect(distance(critical!)).toBeLessThan(distance(info!));
    // Money owns the top of the radar.
    expect(critical!.y).toBeLessThan(0);
    expect(info!.y).toBeLessThan(0);
    expect(Math.abs(critical!.x)).toBeLessThan(0.2);
  });

  it("keeps every blip inside the radar", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      signal({ id: `s${index}`, category: "Goals", severity: "info" }),
    );
    for (const blip of radarBlips(many)) {
      expect(Math.hypot(blip.x, blip.y)).toBeLessThanOrEqual(0.9);
    }
  });
});
