import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "@/lib/timeline/timeline";
import {
  activeRangePreset,
  addCalendarDays,
  groupTimelineMonths,
  hasTimelineFilters,
  parseStageChange,
  relativeDayLabel,
  summarizeTimeline,
  timelineDescription,
  timelineHref,
  timelineKind,
  timelineKindLabel,
  timelineRangePresets,
  timelineRhythm,
  timelineStatus,
} from "@/lib/timeline/view";

let nextId = 0;

function event(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  nextId += 1;
  return {
    eventId: `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`,
    occurredOn: "2026-10-02",
    occurredAt: "2026-10-02T01:00:00.000Z",
    occurredPrecision: "date",
    module: "tasks",
    eventType: "task_completed",
    title: "Event",
    description: null,
    amountCentavos: null,
    amountDirection: null,
    metricLabel: null,
    metricValue: null,
    sourceHref: null,
    sourceAvailable: true,
    ...overrides,
  };
}

const noFilters = { query: "", module: null, from: null, to: null };

describe("event kinds", () => {
  it("names every recorded event type and falls back to the type itself", () => {
    expect(timelineKindLabel("expense_recorded")).toBe("Expense");
    expect(timelineKindLabel("goal_milestone_completed")).toBe(
      "Milestone reached",
    );
    expect(timelineKindLabel("job_stage_changed")).toBe("Stage changed");
    expect(timelineKindLabel("decision_observation")).toBe("Observation");
    expect(timelineKindLabel("habit_logged")).toBe("Habit logged");
    expect(timelineKind("constructor")).toBeNull();
  });

  it("drops descriptions that only repeat the kind", () => {
    expect(timelineDescription(event({ description: "Task completed" }))).toBe(
      null,
    );
    expect(
      timelineDescription(event({ description: "  Food · Wallet  " })),
    ).toBe("Food · Wallet");
    expect(timelineDescription(event({ description: "" }))).toBe(null);
  });

  it("reads stored career stages back into stages", () => {
    expect(parseStageChange("Stage: final interview")).toEqual({
      from: null,
      to: "final_interview",
    });
    expect(parseStageChange("Stage: applied → offer")).toEqual({
      from: "applied",
      to: "offer",
    });
    expect(parseStageChange("Stage: applied → hired")).toBeNull();
    expect(parseStageChange("Stage: dreaming")).toBeNull();
    expect(parseStageChange("Met the team")).toBeNull();
    expect(parseStageChange(null)).toBeNull();
  });
});

describe("summarizeTimeline", () => {
  it("counts modules, days, and money in and out, leaving transfers aside", () => {
    const summary = summarizeTimeline(
      [
        event({
          module: "money",
          occurredOn: "2026-10-05",
          amountCentavos: 50_000,
          amountDirection: "inflow",
        }),
        event({
          module: "money",
          occurredOn: "2026-10-02",
          amountCentavos: 12_550,
          amountDirection: "outflow",
        }),
        event({
          module: "money",
          occurredOn: "2026-10-02",
          amountCentavos: 99_900,
          amountDirection: "neutral",
        }),
        event({
          module: "debt",
          occurredOn: "2026-09-30",
          amountCentavos: 2_000,
          amountDirection: "outflow",
        }),
        event({ occurredOn: "2026-09-30" }),
      ],
      "2026-10-02",
    );

    expect(summary).toMatchObject({
      total: 5,
      newestOn: "2026-10-05",
      oldestOn: "2026-09-30",
      lastActiveOn: "2026-10-02",
      activeDays: 3,
      inflowCentavos: 50_000,
      inflowCount: 1,
      outflowCentavos: 14_550,
      outflowCount: 2,
      transferCount: 1,
    });
    expect(summary.moduleCounts).toEqual({
      money: 3,
      debt: 1,
      tasks: 1,
      goals: 0,
      career: 0,
      reviews: 0,
      decisions: 0,
    });
  });

  it("says how recent the view is", () => {
    const status = (lastOn: string, filtered = false) =>
      timelineStatus(
        summarizeTimeline([event({ occurredOn: lastOn })], "2026-10-02"),
        "2026-10-02",
        filtered,
      );
    expect(status("2026-10-02")).toEqual({
      tone: "positive",
      label: "Active today",
    });
    expect(status("2026-10-01").label).toBe("Last moment yesterday");
    expect(status("2026-09-27").label).toBe("Last moment 5 days ago");
    expect(status("2026-09-20")).toEqual({
      tone: "caution",
      label: "Quiet for 12 days",
    });
    expect(status("2026-10-09").label).toBe("Only upcoming dates");
    expect(status("2026-09-20", true)).toEqual({
      tone: "neutral",
      label: "Filtered view",
    });
  });
});

describe("timelineRhythm", () => {
  it("counts each day in view, stacked by module, through today", () => {
    const rhythm = timelineRhythm(
      [
        event({ occurredOn: "2026-09-30", module: "money" }),
        event({ occurredOn: "2026-09-30" }),
        event({ occurredOn: "2026-09-28" }),
      ],
      { through: "2026-10-02", complete: false, from: null },
    )!;

    expect(rhythm.unit).toBe("day");
    expect(rhythm.buckets.map((bucket) => bucket.start)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(rhythm.buckets.map((bucket) => bucket.total)).toEqual([
      1, 0, 2, 0, 0,
    ]);
    expect(rhythm.buckets[2]!.counts).toMatchObject({ money: 1, tasks: 1 });
    expect(rhythm.max).toBe(2);
    expect(rhythm.peak?.start).toBe("2026-09-30");
  });

  it("shows at least a week once everything is loaded, but not before the From filter", () => {
    const events = [event({ occurredOn: "2026-10-01" })];
    expect(
      timelineRhythm(events, {
        through: "2026-10-02",
        complete: true,
        from: null,
      })!.buckets[0]!.start,
    ).toBe("2026-09-26");
    expect(
      timelineRhythm(events, {
        through: "2026-10-02",
        complete: true,
        from: "2026-09-29",
      })!.buckets[0]!.start,
    ).toBe("2026-09-29");
  });

  it("counts by week past a month, and by month past 26 weeks", () => {
    const weekly = timelineRhythm(
      [
        event({ occurredOn: "2026-10-02" }),
        event({ occurredOn: "2026-08-12" }),
      ],
      { through: "2026-10-02", complete: false, from: null },
    )!;
    expect(weekly.unit).toBe("week");
    expect(weekly.buckets[0]).toMatchObject({
      start: "2026-08-10",
      end: "2026-08-16",
      total: 1,
    });
    expect(weekly.buckets.at(-1)).toMatchObject({
      start: "2026-09-28",
      total: 1,
    });

    const monthly = timelineRhythm(
      [
        event({ occurredOn: "2026-10-02" }),
        event({ occurredOn: "2023-02-14" }),
      ],
      { through: "2026-10-02", complete: false, from: null },
    )!;
    expect(monthly.unit).toBe("month");
    expect(monthly.buckets).toHaveLength(24);
    expect(monthly.buckets[0]).toMatchObject({
      start: "2024-11-01",
      end: "2024-11-30",
    });
    expect(monthly.buckets.at(-1)).toMatchObject({
      start: "2026-10-01",
      end: "2026-10-31",
      total: 1,
    });
  });

  it("is empty without events", () => {
    expect(
      timelineRhythm([], { through: "2026-10-02", complete: true, from: null }),
    ).toBeNull();
  });
});

describe("groupTimelineMonths", () => {
  it("groups by month and day in order, with each day's net money", () => {
    const months = groupTimelineMonths([
      event({
        occurredOn: "2026-10-02",
        amountCentavos: 10_000,
        amountDirection: "inflow",
      }),
      event({
        occurredOn: "2026-10-02",
        amountCentavos: 2_500,
        amountDirection: "outflow",
      }),
      event({
        occurredOn: "2026-10-01",
        amountCentavos: 99_000,
        amountDirection: "neutral",
      }),
      event({ occurredOn: "2026-09-30" }),
    ]);

    expect(
      months.map((month) => ({
        month: month.month,
        total: month.total,
        days: month.days.map((day) => [day.occurredOn, day.netCentavos]),
      })),
    ).toEqual([
      {
        month: "2026-10",
        total: 3,
        days: [
          ["2026-10-02", 7_500],
          ["2026-10-01", null],
        ],
      },
      { month: "2026-09", total: 1, days: [["2026-09-30", null]] },
    ]);
  });
});

describe("dates and filters", () => {
  it("names nearby days", () => {
    expect(relativeDayLabel("2026-10-02", "2026-10-02")).toBe("Today");
    expect(relativeDayLabel("2026-10-01", "2026-10-02")).toBe("Yesterday");
    expect(relativeDayLabel("2026-10-03", "2026-10-02")).toBe("Tomorrow");
    expect(relativeDayLabel("2026-09-30", "2026-10-02")).toBeNull();
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("builds addresses and recognizes range presets", () => {
    expect(timelineHref(noFilters)).toBe("/timeline");
    expect(
      timelineHref({ ...noFilters, query: "rent due", module: "money" }),
    ).toBe("/timeline?q=rent+due&module=money");
    expect(hasTimelineFilters(noFilters)).toBe(false);
    expect(hasTimelineFilters({ ...noFilters, to: "2026-10-01" })).toBe(true);

    const presets = timelineRangePresets("2026-10-02");
    expect(presets.map((preset) => [preset.id, preset.from])).toEqual([
      ["all", null],
      ["week", "2026-09-26"],
      ["month", "2026-09-03"],
      ["year", "2026-01-01"],
    ]);
    expect(activeRangePreset(noFilters, presets)?.id).toBe("all");
    expect(
      activeRangePreset({ ...noFilters, from: "2026-09-26" }, presets)?.id,
    ).toBe("week");
    expect(
      activeRangePreset(
        { ...noFilters, from: "2026-09-26", to: "2026-10-01" },
        presets,
      ),
    ).toBeNull();
    expect(
      activeRangePreset({ ...noFilters, from: "2026-09-01" }, presets),
    ).toBeNull();
  });
});
