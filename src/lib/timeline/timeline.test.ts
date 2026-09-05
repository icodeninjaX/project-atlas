import { describe, expect, it } from "vitest";
import {
  groupTimelineEvents,
  normalizeTimelineFilters,
  timelineFiltersToSearchParams,
  validTimelineDate,
  type TimelineEvent,
} from "./timeline";

const event = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  eventId: "00000000-0000-4000-8000-000000000001",
  occurredOn: "2026-09-05",
  occurredAt: "2026-09-05T01:00:00.000Z",
  occurredPrecision: "timestamp",
  module: "tasks",
  eventType: "task_completed",
  title: "Finish timeline",
  description: null,
  amountCentavos: null,
  amountDirection: null,
  metricLabel: null,
  metricValue: null,
  sourceHref: "/tasks",
  sourceAvailable: true,
  ...overrides,
});

describe("timeline helpers", () => {
  it("normalizes filters, rejects invalid calendar dates, and preserves valid filters", () => {
    expect(validTimelineDate("2026-02-29")).toBeNull();
    expect(validTimelineDate("2028-02-29")).toBe("2028-02-29");
    expect(
      normalizeTimelineFilters({
        query: `  ${"a".repeat(130)}  `,
        module: "money",
        from: "2026-01-01",
        to: "not-a-date",
      }),
    ).toEqual({
      query: "a".repeat(120),
      module: "money",
      from: "2026-01-01",
      to: null,
    });
  });

  it("serializes active filters for a stable load-more request", () => {
    expect(
      timelineFiltersToSearchParams({
        query: "rent",
        module: "money",
        from: "2026-08-01",
        to: null,
      }).toString(),
    ).toBe("q=rent&module=money&from=2026-08-01");
  });

  it("keeps chronological event order while grouping same-day events", () => {
    const grouped = groupTimelineEvents([
      event({ eventId: "one", occurredOn: "2026-09-05" }),
      event({ eventId: "two", occurredOn: "2026-09-05", module: "money" }),
      event({ eventId: "three", occurredOn: "2026-09-04" }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.events.map((item) => item.eventId)).toEqual([
      "one",
      "two",
    ]);
    expect(grouped[1]?.occurredOn).toBe("2026-09-04");
  });
});
