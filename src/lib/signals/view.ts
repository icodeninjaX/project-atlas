import {
  signalCategories,
  signalSeverities,
  type Signal,
  type SignalCategory,
  type SignalSeverity,
  type SignalType,
} from "@/lib/signals/engine";

/**
 * How the Signals page reads the engine's output: filters, the summary the
 * hero states, the sections of the feed, and the figures behind each
 * signal's chart. Nothing here changes what the engine detects.
 */

export type SignalFilters = {
  category: SignalCategory | null;
  severity: SignalSeverity | null;
};

const categoryByQuery = new Map(
  signalCategories.map((category) => [category.toLowerCase(), category]),
);
const validSeverities = new Set<string>(signalSeverities);

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Filters from the address; anything unknown is ignored. */
export function parseSignalFilters(params: {
  category?: string | string[];
  severity?: string | string[];
}): SignalFilters {
  const category = single(params.category) ?? "";
  const severity = single(params.severity) ?? "";
  return {
    category: categoryByQuery.get(category.toLowerCase()) ?? null,
    severity: validSeverities.has(severity)
      ? (severity as SignalSeverity)
      : null,
  };
}

export function signalsHref({ category, severity }: SignalFilters): string {
  const query = new URLSearchParams();
  if (category) query.set("category", category.toLowerCase());
  if (severity) query.set("severity", severity);
  const suffix = query.toString();
  return suffix ? `/signals?${suffix}` : "/signals";
}

export function hasSignalFilters(filters: SignalFilters): boolean {
  return Boolean(filters.category || filters.severity);
}

export function matchesSignalFilters(
  signal: Signal,
  { category, severity }: SignalFilters,
): boolean {
  return (
    (!category || signal.category === category) &&
    (!severity || signal.severity === severity)
  );
}

export function isAttentionSeverity(severity: SignalSeverity): boolean {
  return severity === "critical" || severity === "warning";
}

/** Most urgent first, matching the engine's ranking. */
export const severityOrder = [
  "critical",
  "warning",
  "positive",
  "info",
] as const satisfies readonly SignalSeverity[];

export const severityLabels: Record<SignalSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  positive: "Positive",
  info: "Info",
};

function emptySeverityCounts(): Record<SignalSeverity, number> {
  return { critical: 0, warning: 0, positive: 0, info: 0 };
}

function emptyCategoryCounts(): Record<SignalCategory, number> {
  return { Money: 0, Debt: 0, Tasks: 0, Career: 0, Goals: 0 };
}

export function countBySeverity(
  signals: readonly Signal[],
): Record<SignalSeverity, number> {
  const counts = emptySeverityCounts();
  for (const signal of signals) counts[signal.severity] += 1;
  return counts;
}

export function countByCategory(
  signals: readonly Signal[],
): Record<SignalCategory, number> {
  const counts = emptyCategoryCounts();
  for (const signal of signals) counts[signal.category] += 1;
  return counts;
}

/**
 * Counts for the filter pills. Each strip counts what its pills would show
 * with the other strip's filter still applied, so a pill never promises
 * more than tapping it reveals.
 */
export function signalFacets(
  signals: readonly Signal[],
  filters: SignalFilters,
) {
  const sameSeverity = signals.filter(
    (signal) => !filters.severity || signal.severity === filters.severity,
  );
  const sameCategory = signals.filter(
    (signal) => !filters.category || signal.category === filters.category,
  );
  return {
    categories: countByCategory(sameSeverity),
    categoryTotal: sameSeverity.length,
    severities: countBySeverity(sameCategory),
    severityTotal: sameCategory.length,
  };
}

export function joinWords(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Areas in the order their most urgent signal ranks. */
function areasOf(signals: readonly Signal[]): SignalCategory[] {
  return [...new Set(signals.map((signal) => signal.category))];
}

function areaPhrase(areas: readonly SignalCategory[]) {
  return `${areas.length === 1 ? "in" : "across"} ${joinWords(areas)}`;
}

export type SignalsTone = "destructive" | "caution" | "positive";

export type SignalsSummary = {
  total: number;
  attention: number;
  counts: Record<SignalSeverity, number>;
  /** The overall state in a word or two. */
  status: { tone: SignalsTone; label: string };
  /** The hero's large figure and the words after it. */
  headline: { value: number; label: string };
  /** What was found and where, in one sentence. */
  sentence: string;
  /** The most urgent signal, when anything needs attention. */
  lead: Signal | null;
};

/** The whole picture, from signals already ranked by the engine. */
export function summarizeSignals(signals: readonly Signal[]): SignalsSummary {
  const counts = countBySeverity(signals);
  const attentionSignals = signals.filter((signal) =>
    isAttentionSeverity(signal.severity),
  );
  const quietSignals = signals.filter(
    (signal) => !isAttentionSeverity(signal.severity),
  );
  const attention = attentionSignals.length;

  const attentionParts = [
    counts.critical ? `${counts.critical} critical` : null,
    counts.warning ? plural(counts.warning, "warning", "warnings") : null,
  ].filter((part): part is string => part !== null);
  const quietParts = [
    counts.positive
      ? plural(counts.positive, "sign of progress", "signs of progress")
      : null,
    counts.info ? plural(counts.info, "update", "updates") : null,
  ].filter((part): part is string => part !== null);

  let sentence = "";
  if (attention > 0) {
    sentence = `${joinWords(attentionParts)} ${areaPhrase(areasOf(attentionSignals))}`;
    if (quietParts.length) sentence += `, plus ${joinWords(quietParts)}`;
    sentence += ".";
  } else if (quietSignals.length > 0) {
    sentence = `${joinWords(quietParts)} ${areaPhrase(areasOf(quietSignals))}.`;
  }

  const status: SignalsSummary["status"] =
    counts.critical > 0
      ? { tone: "destructive", label: "Act now" }
      : counts.warning > 0
        ? { tone: "caution", label: "Keep watch" }
        : signals.length > 0
          ? { tone: "positive", label: "Nothing urgent" }
          : { tone: "positive", label: "All clear" };

  return {
    total: signals.length,
    attention,
    counts,
    status,
    headline:
      attention > 0
        ? {
            value: attention,
            label: attention === 1 ? "needs attention" : "need attention",
          }
        : {
            value: signals.length,
            label: signals.length === 1 ? "signal" : "signals",
          },
    sentence,
    lead: attentionSignals[0] ?? null,
  };
}

export type SignalGroupId = "attention" | "progress" | "updates";

export type SignalGroup = {
  id: SignalGroupId;
  label: string;
  detail: string;
  signals: Signal[];
};

const groupFor: Record<SignalSeverity, SignalGroupId> = {
  critical: "attention",
  warning: "attention",
  positive: "progress",
  info: "updates",
};

const groupCopy: Record<SignalGroupId, { label: string; detail: string }> = {
  attention: {
    label: "Needs attention",
    detail: "Risks and deadlines to act on first",
  },
  progress: {
    label: "Progress",
    detail: "What is moving in the right direction",
  },
  updates: {
    label: "Worth knowing",
    detail: "Changes to keep an eye on",
  },
};

/** The feed's sections, in order, leaving out any that would be empty. */
export function groupSignals(signals: readonly Signal[]): SignalGroup[] {
  const groups = (["attention", "progress", "updates"] as const).map((id) => ({
    id,
    ...groupCopy[id],
    signals: [] as Signal[],
  }));
  for (const signal of signals) {
    groups
      .find((group) => group.id === groupFor[signal.severity])!
      .signals.push(signal);
  }
  return groups.filter((group) => group.signals.length > 0);
}

/** A fragment id for a signal's card. */
export function signalAnchor(id: string): string {
  return `signal-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/** Where each kind of signal sends you, in words. */
export const signalActionLabels: Record<SignalType, string> = {
  "money.spending-increase": "Review spending",
  "money.budget-threshold": "Open budget",
  "money.category-spike": "Review spending",
  "debt.progress": "Open debts",
  "debt.deadline": "Open debt",
  "tasks.overdue-increase": "Review overdue",
  "tasks.workload-pressure": "Open tasks",
  "tasks.strong-execution": "See completed",
  "career.low-conversion": "Open career",
  "career.follow-up-backlog": "Open career",
  "career.positive-momentum": "Open career",
  "career.stalled": "Open career",
  "goals.stalled": "Open goal",
  "goals.milestone-progress": "Open goal",
  "goals.deadline": "Open goal",
};

export type Figure = { amount: number; unit: "peso" | "percent" | "count" };

/**
 * A figure the engine formatted ("₱12,000.00", "92%", "7"), or null for
 * anything else ("in 3 days", a date). Charts only draw from these.
 */
export function parseFigure(value: string | undefined): Figure | null {
  if (!value) return null;
  const match = /^(₱)?(\d[\d,]*(?:\.\d+)?)(%)?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[2]!.replaceAll(",", ""));
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    unit: match[1] ? "peso" : match[3] ? "percent" : "count",
  };
}

export type SignalVisual =
  /** Now against a baseline, as two bars and the change between them. */
  | {
      kind: "versus";
      current: number;
      baseline: number;
      /** "+46%" for money, "+5" for counts. */
      change: string;
      direction: "up" | "down" | "flat";
    }
  /** A share of a whole, as one meter (0–1); `over` past the whole. */
  | { kind: "share"; share: number; over: boolean; caption: string | null };

const versusTypes = new Set<SignalType>([
  "money.spending-increase",
  "money.category-spike",
  "tasks.overdue-increase",
  "tasks.strong-execution",
]);

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * The chart behind a signal's figures, when its figures can carry one.
 * Shares are drawn from the metric and comparison the card shows, so the
 * chart never says more than the words beside it.
 */
export function signalVisual(signal: Signal): SignalVisual | null {
  const metric = parseFigure(signal.metric?.value);
  const comparison = parseFigure(signal.comparison?.value);

  if (versusTypes.has(signal.type)) {
    if (!metric || !comparison || metric.unit !== comparison.unit) return null;
    const current = metric.amount;
    const baseline = comparison.amount;
    const direction =
      current > baseline ? "up" : current < baseline ? "down" : "flat";
    const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
    let change: string;
    if (metric.unit === "peso") {
      if (baseline <= 0) return null;
      change = `${sign}${Math.round((Math.abs(current - baseline) / baseline) * 100)}%`;
    } else {
      change = `${sign}${Math.abs(current - baseline)}`;
    }
    return { kind: "versus", current, baseline, change, direction };
  }

  switch (signal.type) {
    case "money.budget-threshold":
    case "goals.deadline": {
      if (metric?.unit !== "percent") return null;
      return {
        kind: "share",
        share: clamp(metric.amount / 100),
        over: metric.amount > 100,
        caption: null,
      };
    }
    case "debt.progress": {
      // Reduced against what was reduced plus what remains.
      if (!metric || !comparison) return null;
      const whole = metric.amount + comparison.amount;
      if (whole <= 0) return null;
      return {
        kind: "share",
        share: clamp(metric.amount / whole),
        over: false,
        caption: null,
      };
    }
    case "tasks.workload-pressure": {
      // Due today out of everything due or overdue.
      if (!metric || !comparison || metric.amount <= 0) return null;
      return {
        kind: "share",
        share: clamp(comparison.amount / metric.amount),
        over: false,
        caption: null,
      };
    }
    case "career.low-conversion": {
      // Reached interview out of applications submitted.
      if (!metric || !comparison || metric.amount <= 0) return null;
      const share = clamp(comparison.amount / metric.amount);
      return {
        kind: "share",
        share,
        over: false,
        caption: `${Math.round(share * 100)}% reached an interview`,
      };
    }
    default:
      return null;
  }
}

/** Where a signal sits on the radar, in a unit circle. */
export type RadarBlip = { signal: Signal; x: number; y: number };

/** Distance from the center by severity: the more urgent, the closer. */
const ringBySeverity: Record<SignalSeverity, number> = {
  critical: 0.3,
  warning: 0.52,
  positive: 0.72,
  info: 0.88,
};

/** The angle (degrees, 0 = right, clockwise) at the middle of an area. */
export function radarSectorAngle(category: SignalCategory): number {
  return (
    -90 + signalCategories.indexOf(category) * (360 / signalCategories.length)
  );
}

/**
 * Each area owns a slice of the radar; its signals spread across the slice
 * in rank order, nearer the center the more urgent they are.
 */
export function radarBlips(signals: readonly Signal[]): RadarBlip[] {
  const sector = 360 / signalCategories.length;
  return signalCategories.flatMap((category) => {
    const inArea = signals.filter((signal) => signal.category === category);
    const spacing = Math.min(
      16,
      (sector - 20) / Math.max(inArea.length - 1, 1),
    );
    return inArea.map((signal, index) => {
      const offset = (index - (inArea.length - 1) / 2) * spacing;
      const angle = ((radarSectorAngle(category) + offset) * Math.PI) / 180;
      // A slight stagger keeps neighbors on one ring from lining up.
      const radius =
        ringBySeverity[signal.severity] + (index % 2 === 0 ? 0 : -0.04);
      return {
        signal,
        x: Math.round(Math.cos(angle) * radius * 1000) / 1000,
        y: Math.round(Math.sin(angle) * radius * 1000) / 1000,
      };
    });
  });
}
