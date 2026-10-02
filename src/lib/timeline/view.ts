import {
  isCareerStage,
  sentenceCase,
  type CareerStage,
} from "@/lib/career/view";
import { calendarDaysBetween } from "@/lib/dates/dates";
import {
  groupTimelineEvents,
  timelineFiltersToSearchParams,
  timelineModules,
  type TimelineEvent,
  type TimelineFilters,
  type TimelineModule,
} from "@/lib/timeline/timeline";

/** What happened, by the event types the database records. */
export type TimelineKind =
  | "income"
  | "expense"
  | "transfer"
  | "debt_payment"
  | "task"
  | "milestone"
  | "goal"
  | "application"
  | "stage"
  | "review"
  | "decision"
  | "observation";

const kindsByEventType = new Map<string, TimelineKind>([
  ["income_recorded", "income"],
  ["expense_recorded", "expense"],
  ["transfer_recorded", "transfer"],
  ["debt_payment_recorded", "debt_payment"],
  ["task_completed", "task"],
  ["goal_milestone_completed", "milestone"],
  ["goal_completed", "goal"],
  ["career_application_added", "application"],
  ["job_stage_changed", "stage"],
  ["weekly_review_submitted", "review"],
  ["decision_recorded", "decision"],
  ["decision_observation", "observation"],
]);

export const timelineKindLabels: Record<TimelineKind, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  debt_payment: "Debt payment",
  task: "Task completed",
  milestone: "Milestone reached",
  goal: "Goal achieved",
  application: "Application added",
  stage: "Stage changed",
  review: "Weekly review",
  decision: "Decision recorded",
  observation: "Observation",
};

/** The kind of a stored event type, or null for one ATLAS does not know. */
export function timelineKind(eventType: string): TimelineKind | null {
  return kindsByEventType.get(eventType) ?? null;
}

/** "expense_recorded" → "Expense"; unknown types in sentence case. */
export function timelineKindLabel(eventType: string) {
  const kind = timelineKind(eventType);
  return kind ? timelineKindLabels[kind] : sentenceCase(eventType);
}

/**
 * Descriptions the database writes when the source has none of its own.
 * Each only repeats the event's kind, so it is not shown.
 */
const boilerplateDescriptions = new Set([
  "Task completed",
  "Goal completed",
  "Debt payment recorded",
  "Weekly review submitted",
  "Decision recorded",
  "User-recorded observation",
  "Transfer between accounts",
]);

export function timelineDescription(event: TimelineEvent) {
  const description = event.description?.trim();
  return description && !boilerplateDescriptions.has(description)
    ? description
    : null;
}

/**
 * Career events store their stage as text ("Stage: final interview", or
 * "Stage: applied → interview" for a move). Read it back into stages so the
 * page can name them properly; anything else returns null.
 */
export function parseStageChange(
  description: string | null,
): { from: CareerStage | null; to: CareerStage } | null {
  const match = /^Stage: ([a-z ]+?)(?: → ([a-z ]+))?$/.exec(
    description?.trim() ?? "",
  );
  if (!match) return null;
  const first = match[1]!.trim().replaceAll(" ", "_");
  const second = match[2]?.trim().replaceAll(" ", "_") ?? null;
  if (!isCareerStage(first)) return null;
  if (second === null) return { from: null, to: first };
  return isCareerStage(second) ? { from: first, to: second } : null;
}

export type TimelineSummary = {
  total: number;
  /** The newest and oldest days in view. */
  newestOn: string | null;
  oldestOn: string | null;
  /** The newest day in view that is not after today. */
  lastActiveOn: string | null;
  activeDays: number;
  moduleCounts: Record<TimelineModule, number>;
  inflowCentavos: number;
  outflowCentavos: number;
  inflowCount: number;
  outflowCount: number;
  /** Transfers between accounts move money without bringing it in or out. */
  transferCount: number;
};

function emptyModuleCounts() {
  return Object.fromEntries(
    timelineModules.map((module) => [module, 0]),
  ) as Record<TimelineModule, number>;
}

/** What the loaded events add up to. */
export function summarizeTimeline(
  events: readonly TimelineEvent[],
  todayIso: string,
): TimelineSummary {
  const moduleCounts = emptyModuleCounts();
  const days = new Set<string>();
  let newestOn: string | null = null;
  let oldestOn: string | null = null;
  let lastActiveOn: string | null = null;
  let inflowCentavos = 0;
  let outflowCentavos = 0;
  let inflowCount = 0;
  let outflowCount = 0;
  let transferCount = 0;

  for (const event of events) {
    moduleCounts[event.module] += 1;
    days.add(event.occurredOn);
    if (newestOn === null || event.occurredOn > newestOn)
      newestOn = event.occurredOn;
    if (oldestOn === null || event.occurredOn < oldestOn)
      oldestOn = event.occurredOn;
    if (
      event.occurredOn <= todayIso &&
      (lastActiveOn === null || event.occurredOn > lastActiveOn)
    )
      lastActiveOn = event.occurredOn;
    if (event.amountCentavos === null) continue;
    if (event.amountDirection === "inflow") {
      inflowCentavos += event.amountCentavos;
      inflowCount += 1;
    } else if (event.amountDirection === "outflow") {
      outflowCentavos += event.amountCentavos;
      outflowCount += 1;
    } else if (event.amountDirection === "neutral") {
      transferCount += 1;
    }
  }

  return {
    total: events.length,
    newestOn,
    oldestOn,
    lastActiveOn,
    activeDays: days.size,
    moduleCounts,
    inflowCentavos,
    outflowCentavos,
    inflowCount,
    outflowCount,
    transferCount,
  };
}

export type TimelineTone = "positive" | "caution" | "neutral";

/** How recent the view is, in words. A filtered view says so instead. */
export function timelineStatus(
  summary: TimelineSummary,
  todayIso: string,
  filtered: boolean,
): { tone: TimelineTone; label: string } {
  if (filtered) return { tone: "neutral", label: "Filtered view" };
  if (summary.lastActiveOn === null)
    return { tone: "neutral", label: "Only upcoming dates" };
  const days = calendarDaysBetween(summary.lastActiveOn, todayIso);
  if (days <= 0) return { tone: "positive", label: "Active today" };
  if (days === 1) return { tone: "neutral", label: "Last moment yesterday" };
  if (days <= 7)
    return { tone: "neutral", label: `Last moment ${days} days ago` };
  return { tone: "caution", label: `Quiet for ${days} days` };
}

/** "2026-10-02" plus `days` (which may be negative). */
export function addCalendarDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The Monday on or before `iso`. */
function mondayOf(iso: string) {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addCalendarDays(iso, -((weekday + 6) % 7));
}

function nextMonth(month: string) {
  const [year, value] = month.split("-").map(Number) as [number, number];
  return value === 12
    ? `${year + 1}-01`
    : `${year}-${String(value + 1).padStart(2, "0")}`;
}

export type RhythmUnit = "day" | "week" | "month";

export type RhythmBucket = {
  /** The first and last calendar days the bar covers. */
  start: string;
  end: string;
  total: number;
  counts: Record<TimelineModule, number>;
};

export type TimelineRhythm = {
  unit: RhythmUnit;
  buckets: RhythmBucket[];
  max: number;
  peak: RhythmBucket | null;
};

const maxMonthBars = 24;

/**
 * Moments per day across the days in view, as bars stacked by module. Long
 * spans count by week (past a month) or by month (past 26 weeks), keeping
 * the newest 24 months.
 *
 * `through` is the last day the view could hold: today, or the end of the
 * date filter. When every matching event is loaded (`complete`), days before
 * the oldest one are known to be empty, so a short history still shows a
 * week, though never before the `from` filter.
 */
export function timelineRhythm(
  events: readonly TimelineEvent[],
  {
    through,
    complete,
    from,
  }: { through: string; complete: boolean; from: string | null },
): TimelineRhythm | null {
  if (events.length === 0) return null;
  let oldest = events[0]!.occurredOn;
  let newest = oldest;
  for (const event of events) {
    if (event.occurredOn < oldest) oldest = event.occurredOn;
    if (event.occurredOn > newest) newest = event.occurredOn;
  }

  const end = newest > through ? newest : through;
  let start = oldest;
  if (complete) {
    const weekBack = addCalendarDays(end, -6);
    if (weekBack < start) start = weekBack;
    if (from && start < from && from <= oldest) start = from;
  }

  const span = calendarDaysBetween(start, end) + 1;
  const unit: RhythmUnit =
    span <= 31 ? "day" : span <= 26 * 7 ? "week" : "month";

  const buckets: RhythmBucket[] = [];
  if (unit === "day") {
    for (let day = start; day <= end; day = addCalendarDays(day, 1))
      buckets.push({
        start: day,
        end: day,
        total: 0,
        counts: emptyModuleCounts(),
      });
  } else if (unit === "week") {
    for (
      let week = mondayOf(start);
      week <= end;
      week = addCalendarDays(week, 7)
    )
      buckets.push({
        start: week,
        end: addCalendarDays(week, 6),
        total: 0,
        counts: emptyModuleCounts(),
      });
  } else {
    const last = end.slice(0, 7);
    for (let month = start.slice(0, 7); month <= last; month = nextMonth(month))
      buckets.push({
        start: `${month}-01`,
        end: addCalendarDays(`${nextMonth(month)}-01`, -1),
        total: 0,
        counts: emptyModuleCounts(),
      });
    buckets.splice(0, Math.max(0, buckets.length - maxMonthBars));
  }

  for (const event of events) {
    const bucket = buckets.find(
      (candidate) =>
        candidate.start <= event.occurredOn &&
        event.occurredOn <= candidate.end,
    );
    if (!bucket) continue;
    bucket.total += 1;
    bucket.counts[event.module] += 1;
  }

  // Ties go to the most recent bar.
  let peak: RhythmBucket | null = null;
  for (const bucket of buckets)
    if (bucket.total > 0 && (peak === null || bucket.total >= peak.total))
      peak = bucket;

  return { unit, buckets, max: peak?.total ?? 0, peak };
}

export type TimelineDay = {
  occurredOn: string;
  events: TimelineEvent[];
  /** Money in less money out that day, or null when none moved. */
  netCentavos: number | null;
};

export type TimelineMonth = {
  /** `YYYY-MM`. */
  month: string;
  days: TimelineDay[];
  total: number;
};

/** Loaded events by month, then by day, in the order they arrived. */
export function groupTimelineMonths(
  events: readonly TimelineEvent[],
): TimelineMonth[] {
  const months = new Map<string, TimelineMonth>();
  for (const group of groupTimelineEvents([...events])) {
    let netCentavos: number | null = null;
    for (const event of group.events) {
      if (event.amountCentavos === null) continue;
      if (event.amountDirection === "inflow")
        netCentavos = (netCentavos ?? 0) + event.amountCentavos;
      else if (event.amountDirection === "outflow")
        netCentavos = (netCentavos ?? 0) - event.amountCentavos;
    }
    const key = group.occurredOn.slice(0, 7);
    const month = months.get(key) ?? { month: key, days: [], total: 0 };
    month.days.push({ ...group, netCentavos });
    month.total += group.events.length;
    months.set(key, month);
  }
  return [...months.values()];
}

/** "Today", "Yesterday", or "Tomorrow"; null for any other day. */
export function relativeDayLabel(occurredOn: string, todayIso: string) {
  const days = calendarDaysBetween(occurredOn, todayIso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  return null;
}

/** The timeline's address for a set of filters. */
export function timelineHref(filters: TimelineFilters) {
  const suffix = timelineFiltersToSearchParams(filters).toString();
  return suffix ? `/timeline?${suffix}` : "/timeline";
}

export function hasTimelineFilters(filters: TimelineFilters) {
  return Boolean(filters.query || filters.module || filters.from || filters.to);
}

export type TimelineRangePreset = {
  id: "all" | "week" | "month" | "year";
  label: string;
  /** The label in full, for assistive technology. */
  name: string;
  from: string | null;
};

/** One-tap date ranges, each running through today. */
export function timelineRangePresets(todayIso: string): TimelineRangePreset[] {
  return [
    { id: "all", label: "All", name: "All time", from: null },
    {
      id: "week",
      label: "7 days",
      name: "Last 7 days",
      from: addCalendarDays(todayIso, -6),
    },
    {
      id: "month",
      label: "30 days",
      name: "Last 30 days",
      from: addCalendarDays(todayIso, -29),
    },
    {
      id: "year",
      label: "This year",
      name: "This year",
      from: `${todayIso.slice(0, 4)}-01-01`,
    },
  ];
}

/** The preset the filters match, or null for a custom range. */
export function activeRangePreset(
  filters: TimelineFilters,
  presets: readonly TimelineRangePreset[],
) {
  if (filters.to) return null;
  return presets.find((preset) => preset.from === filters.from) ?? null;
}
