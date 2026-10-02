import {
  CalendarRange,
  ChartColumn,
  ChevronDown,
  CircleDashed,
  CloudOff,
  Equal,
  Hourglass,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  decisionCardClass,
  eyebrowClass,
  tileClass,
} from "@/components/decisions/decision-visuals";
import styles from "@/components/decisions/decisions.module.css";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { formatCalendarDate } from "@/lib/dates/dates";
import {
  decisionAlternativeQuestion,
  decisionMetricLabel,
  type Decision,
  type DecisionComparison,
} from "@/lib/decisions/decision";
import type { DecisionMetricSource } from "@/lib/decisions/server";
import {
  comparisonChange,
  shiftDays,
  shortDecisionDate,
  type ComparisonDay,
} from "@/lib/decisions/view";
import {
  HISTORICAL_METRICS_VERSION,
  metricDefinitions,
} from "@/lib/history/metrics";
import { formatCentavos } from "@/lib/money/money";
import { cn } from "@/lib/utils";

type SourceWindow = { items: DecisionMetricSource[]; hasMore: boolean };

/** What the page could establish from the records, in order of checks. */
export type DecisionRecords =
  | { kind: "no_measure" }
  | { kind: "before_review"; opensOn: string | null }
  | { kind: "window_open"; opensOn: string }
  | { kind: "too_old" }
  | { kind: "unavailable" }
  | { kind: "inconclusive" }
  | {
      kind: "comparison";
      comparison: DecisionComparison;
      days: { before: ComparisonDay[]; after: ComparisonDay[] };
      sources: { before: SourceWindow; after: SourceWindow };
    };

function display(metric: DecisionComparison["metric"], value: number) {
  return metricDefinitions[metric].unit === "centavos"
    ? formatCentavos(value)
    : value.toLocaleString("en-PH");
}

function span(from: string, through: string, todayIso: string) {
  return `${shortDecisionDate(from, todayIso)} – ${shortDecisionDate(through, todayIso)}`;
}

function Window({
  label,
  value,
  count,
  from,
  through,
  metric,
  todayIso,
  emphasis,
}: {
  label: string;
  value: number;
  count: number;
  from: string;
  through: string;
  metric: DecisionComparison["metric"];
  todayIso: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        tileClass,
        "p-4",
        emphasis && "ring-primary/30 bg-primary/[0.05]",
      )}
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className={eyebrowClass}>{label}</span>
        <span className="text-muted-foreground font-mono text-[0.6875rem]">
          {span(from, through, todayIso)}
        </span>
      </p>
      <p className="mt-2 font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere]">
        <SensitiveValue>{display(metric, value)}</SensitiveValue>
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        {count === 1 ? "1 source record" : `${count} source records`}
      </p>
    </div>
  );
}

const changeIcons: Record<"higher" | "lower" | "same", LucideIcon> = {
  higher: TrendingUp,
  lower: TrendingDown,
  same: Equal,
};

/** The change between the windows, in neutral colors: it is not a verdict. */
function Change({ comparison }: { comparison: DecisionComparison }) {
  const change = comparisonChange(comparison.before, comparison.after);
  const Icon = changeIcons[change.direction];
  return (
    <p className="bg-background/60 ring-border mt-3 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full px-3 py-1.5 text-xs ring-1">
      <Icon aria-hidden="true" className="text-primary size-3.5 shrink-0" />
      <span className="font-semibold">
        {change.direction === "same"
          ? "The same in both windows"
          : change.direction === "higher"
            ? "Higher after the decision"
            : "Lower after the decision"}
      </span>
      {change.direction === "same" ? null : (
        <span className="text-muted-foreground font-mono">
          <SensitiveValue>
            {change.delta > 0 ? "+" : "−"}
            {display(comparison.metric, Math.abs(change.delta))}
          </SensitiveValue>
          {change.percent !== null ? ` · ${change.percent}%` : null}
        </span>
      )}
    </p>
  );
}

/**
 * Each day of the two windows as a bar, with the decision day between
 * them. Decorative: the totals above carry the values.
 */
function DayBars({
  days,
  decisionOn,
  todayIso,
}: {
  days: { before: ComparisonDay[]; after: ComparisonDay[] };
  decisionOn: string;
  todayIso: string;
}) {
  const max = Math.max(
    1,
    ...days.before.map((day) => day.value),
    ...days.after.map((day) => day.value),
  );
  const bar = (day: ComparisonDay, after: boolean) =>
    day.value > 0 ? (
      <span
        key={day.on}
        style={{ height: `${Math.max(6, (day.value / max) * 100)}%` }}
        className={cn(
          "min-w-0 flex-1 rounded-t-[3px] rounded-b-[1px]",
          after ? "bg-primary" : "bg-muted-foreground/40",
          styles.rise,
        )}
      />
    ) : (
      <span
        key={day.on}
        className="bg-muted h-[3px] min-w-0 flex-1 rounded-full"
      />
    );
  return (
    <div aria-hidden="true" className="mt-5">
      <div className="border-border/70 flex h-20 items-end gap-[2px] border-b pb-px sm:h-24 sm:gap-[3px]">
        {days.before.map((day) => bar(day, false))}
        <span className="relative mx-1 flex h-full w-px shrink-0 items-end justify-center sm:mx-1.5">
          <span className="via-primary/60 to-primary h-full w-px bg-gradient-to-b from-transparent" />
          <span className="bg-primary ring-card absolute -bottom-1 size-2 rounded-full ring-2" />
        </span>
        {days.after.map((day) => bar(day, true))}
      </div>
      <div className="text-muted-foreground mt-2 grid grid-cols-3 gap-2 font-mono text-[0.6875rem]">
        <span>
          {shortDecisionDate(days.before[0]?.on ?? decisionOn, todayIso)}
        </span>
        <span className="text-primary text-center font-sans font-semibold">
          Decided {shortDecisionDate(decisionOn, todayIso)}
        </span>
        <span className="text-right">
          {shortDecisionDate(days.after.at(-1)?.on ?? decisionOn, todayIso)}
        </span>
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem]">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted-foreground/40 size-2 rounded-sm" />
          14 days before
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary size-2 rounded-sm" />
          14 days after
        </span>
      </div>
    </div>
  );
}

function MetricSources({
  label,
  items,
  hasMore,
  todayIso,
}: {
  label: string;
  items: DecisionMetricSource[];
  hasMore: boolean;
  todayIso: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{label} source records</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          No source records in this window.
        </p>
      ) : (
        <ul className="divide-border/70 mt-2 max-h-72 divide-y overflow-y-auto overscroll-contain">
          {items.map((item) => (
            <li
              key={`${item.type}:${item.id}`}
              className="flex min-w-0 items-baseline justify-between gap-3 py-1"
            >
              <Link
                href={item.href as never}
                className="hover:text-primary focus-visible:ring-ring inline-flex min-h-10 min-w-0 items-baseline gap-2 rounded-md text-xs break-words focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-muted-foreground shrink-0 font-mono">
                  {shortDecisionDate(item.occurredOn, todayIso)}
                </span>
                <span className="min-w-0 font-medium underline-offset-2 hover:underline">
                  {item.title}
                </span>
              </Link>
              {item.amountCentavos !== null && (
                <span className="shrink-0 font-mono text-xs font-semibold">
                  <SensitiveValue>
                    {formatCentavos(item.amountCentavos)}
                  </SensitiveValue>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <p className="text-muted-foreground mt-2 text-xs">
          Showing the first 50 records in this window.
        </p>
      )}
    </div>
  );
}

/** A state the comparison cannot show yet, or at all. */
function Pending({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(tileClass, "mt-5 flex gap-3 p-4 sm:p-5")}>
      <span
        aria-hidden="true"
        className="bg-muted/70 text-muted-foreground ring-border/80 grid size-9 shrink-0 place-items-center rounded-xl ring-1"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <div className="text-muted-foreground mt-1 space-y-1 text-sm leading-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/** "What the records show": the before and after windows for its measure. */
export function DecisionRecordsCard({
  decision,
  records,
  revised,
  todayIso,
}: {
  decision: Decision;
  records: DecisionRecords;
  /** Whether the plan has earlier versions. */
  revised: boolean;
  todayIso: string;
}) {
  const metric = decision.metric_key;
  return (
    <section
      aria-labelledby="observed-change"
      data-spotlight
      className={cn(decisionCardClass, "mt-4 sm:mt-5")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[14rem]:hidden"
        >
          <ChartColumn className="size-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <h2
            id="observed-change"
            className="text-base font-semibold tracking-[-0.01em]"
          >
            What the records show
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
            {metric
              ? `${decisionMetricLabel(metric)} in the 14 days before and after ${formatCalendarDate(decision.decision_on)}`
              : "No recorded measure chosen for this decision"}
          </p>
        </div>
      </div>

      {records.kind === "comparison" ? (
        <div className="mt-5">
          <p className="text-sm">
            {decisionMetricLabel(records.comparison.metric)} in two equal 14-day
            windows:
          </p>
          <div className="mt-3 grid gap-3 min-[26rem]:grid-cols-2">
            <Window
              label="Before"
              value={records.comparison.before}
              count={records.comparison.beforeCount}
              from={records.comparison.beforeFrom}
              through={records.comparison.beforeThrough}
              metric={records.comparison.metric}
              todayIso={todayIso}
            />
            <Window
              label="After"
              value={records.comparison.after}
              count={records.comparison.afterCount}
              from={records.comparison.afterFrom}
              through={records.comparison.afterThrough}
              metric={records.comparison.metric}
              todayIso={todayIso}
              emphasis
            />
          </div>
          <Change comparison={records.comparison} />
          <DayBars
            days={records.days}
            decisionOn={decision.decision_on}
            todayIso={todayIso}
          />
          <p className="text-muted-foreground mt-5 text-xs leading-5">
            These are surviving records, calculated with history method{" "}
            {HISTORICAL_METRICS_VERSION}. A change after a decision does not
            establish that the decision caused it. Missing real-world entries
            may change the picture.
          </p>
          <div className="mt-3 rounded-2xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-500/25">
            <h3 className="text-sm font-semibold">
              Other explanations to check
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {decisionAlternativeQuestion(records.comparison.metric)} Compare
              your original assumptions and dated notes with the source records.
            </p>
          </div>
          {revised ? (
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              This plan has been revised. The comparison uses its current
              decision date and measure; earlier wording is preserved below.
            </p>
          ) : null}
          <details className={cn(tileClass, "group mt-4")}>
            <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-0.5 rounded-2xl px-4 py-2 focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold">Source records</span>
              <span className="text-muted-foreground font-mono text-xs">
                {records.comparison.beforeCount} before ·{" "}
                {records.comparison.afterCount} after
              </span>
              <ChevronDown
                aria-hidden="true"
                className="text-muted-foreground ml-auto size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="grid gap-5 px-4 pt-1 pb-4 sm:grid-cols-2">
              <MetricSources
                label="Before"
                {...records.sources.before}
                todayIso={todayIso}
              />
              <MetricSources
                label="After"
                {...records.sources.after}
                todayIso={todayIso}
              />
            </div>
          </details>
        </div>
      ) : records.kind === "no_measure" ? (
        <Pending icon={ChartColumn} title="Notes only">
          <p>
            No recorded measure selected. Your notes can still document what
            followed.
          </p>
          <p className="text-xs leading-5">
            To see 14 days of records before and after this decision, choose a
            measure in Edit decision.
          </p>
        </Pending>
      ) : records.kind === "before_review" ? (
        <Pending icon={Hourglass} title="Waiting for the review date">
          <p>
            Review date has not arrived. ATLAS will wait for follow-up records.
          </p>
          {records.opensOn ? (
            <p className="text-xs leading-5">
              The comparison opens on {formatCalendarDate(records.opensOn)}.
            </p>
          ) : null}
        </Pending>
      ) : records.kind === "window_open" ? (
        <Pending icon={Hourglass} title="Still collecting records">
          <p>
            The 14 days after this decision end on{" "}
            {formatCalendarDate(shiftDays(decision.decision_on, 14))}. The
            comparison opens on {formatCalendarDate(records.opensOn)}.
          </p>
        </Pending>
      ) : records.kind === "too_old" ? (
        <Pending icon={CalendarRange} title="Outside recorded history">
          <p>
            ATLAS compares windows within the past year of recorded history, and
            this decision is older. No outcome is inferred.
          </p>
        </Pending>
      ) : records.kind === "unavailable" ? (
        <Pending icon={CloudOff} title="History unavailable">
          <p>Recorded history could not be loaded. Try again later.</p>
        </Pending>
      ) : (
        <Pending icon={CircleDashed} title="Inconclusive">
          <p>
            Inconclusive: a full before and after window or supported baseline
            is not available. No outcome is inferred.
          </p>
        </Pending>
      )}
    </section>
  );
}
