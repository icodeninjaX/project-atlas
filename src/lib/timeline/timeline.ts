export const timelineModules = [
  "money",
  "debt",
  "tasks",
  "goals",
  "career",
  "reviews",
] as const;

export type TimelineModule = (typeof timelineModules)[number];

export type TimelineEvent = {
  eventId: string;
  occurredOn: string;
  occurredAt: string;
  occurredPrecision: "date" | "timestamp";
  module: TimelineModule;
  eventType: string;
  title: string;
  description: string | null;
  amountCentavos: number | null;
  amountDirection: "inflow" | "outflow" | "neutral" | null;
  metricLabel: string | null;
  metricValue: string | null;
  sourceHref: string | null;
  sourceAvailable: boolean;
};

export type TimelineFilters = {
  query: string;
  module: TimelineModule | null;
  from: string | null;
  to: string | null;
};

export type TimelineCursor = {
  occurredOn: string;
  occurredAt: string;
  eventId: string;
};

export const timelineModuleLabels: Record<TimelineModule, string> = {
  money: "Money",
  debt: "Debt",
  tasks: "Tasks",
  goals: "Goals",
  career: "Career",
  reviews: "Reviews",
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isTimelineModule(value: unknown): value is TimelineModule {
  return (
    typeof value === "string" &&
    timelineModules.includes(value as TimelineModule)
  );
}

export function validTimelineDate(value: unknown): string | null {
  if (typeof value !== "string" || !datePattern.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export function normalizeTimelineFilters(values: {
  query?: string | null;
  module?: string | null;
  from?: string | null;
  to?: string | null;
}): TimelineFilters {
  return {
    query: (values.query ?? "").trim().slice(0, 120),
    module: isTimelineModule(values.module) ? values.module : null,
    from: validTimelineDate(values.from),
    to: validTimelineDate(values.to),
  };
}

export function timelineFiltersToSearchParams(filters: TimelineFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.module) params.set("module", filters.module);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}

export function groupTimelineEvents(events: TimelineEvent[]) {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.occurredOn) ?? [];
    existing.push(event);
    groups.set(event.occurredOn, existing);
  }
  return [...groups.entries()].map(([occurredOn, groupEvents]) => ({
    occurredOn,
    events: groupEvents,
  }));
}

export function timelineCursorFromEvent(event: TimelineEvent): TimelineCursor {
  return {
    occurredOn: event.occurredOn,
    occurredAt: event.occurredAt,
    eventId: event.eventId,
  };
}
