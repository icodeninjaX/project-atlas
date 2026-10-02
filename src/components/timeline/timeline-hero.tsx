import { CalendarRange } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { moduleTones } from "@/components/timeline/module-tone";
import styles from "@/components/timeline/timeline.module.css";
import { formatCentavos } from "@/lib/money/money";
import { timelineModuleLabels, timelineModules } from "@/lib/timeline/timeline";
import type {
  RhythmBucket,
  TimelineRhythm,
  TimelineSummary,
  TimelineTone,
} from "@/lib/timeline/view";
import { cn } from "@/lib/utils";

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

const shortDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const shortDayYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const monthYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

function utc(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

/** "Sep 18 – Oct 2", with years only when the span leaves this year. */
function spanLabel(oldest: string, newest: string, todayIso: string) {
  const thisYear = todayIso.slice(0, 4);
  const sameYear =
    oldest.slice(0, 4) === thisYear && newest.slice(0, 4) === thisYear;
  const format = (iso: string) =>
    iso === todayIso
      ? "today"
      : (sameYear ? shortDay : shortDayYear).format(utc(iso));
  if (oldest === newest) {
    const single = format(newest);
    return single === "today" ? "Today" : single;
  }
  return `${format(oldest)} – ${format(newest)}`;
}

function moments(count: number) {
  return `${count} ${count === 1 ? "moment" : "moments"}`;
}

function StatusPill({
  tone,
  children,
}: {
  tone: TimelineTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

/** A wash of light from the top, two soft glows, and a faint grid. */
function HeroLight() {
  return (
    <>
      <div
        aria-hidden="true"
        className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-violet-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
    </>
  );
}

function HeroShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="timeline-summary-heading"
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** Money in and out across the moments in view, with the net. */
function MoneyInView({ summary }: { summary: TimelineSummary }) {
  const moved = summary.inflowCount + summary.outflowCount > 0;
  const largest = Math.max(summary.inflowCentavos, summary.outflowCentavos);
  const net = summary.inflowCentavos - summary.outflowCentavos;
  const rows = [
    {
      key: "in",
      label: "In",
      sign: "+",
      centavos: summary.inflowCentavos,
      count: summary.inflowCount,
      bar: "bg-positive",
      text: "text-positive",
    },
    {
      key: "out",
      label: "Out",
      sign: "−",
      centavos: summary.outflowCentavos,
      count: summary.outflowCount,
      bar: "bg-foreground/70",
      text: "",
    },
  ];

  return (
    <div className="bg-background/55 ring-border/80 rounded-2xl p-3.5 ring-1 min-[360px]:p-4 sm:p-5">
      <p className={eyebrowClass}>Money in view</p>
      {moved ? (
        <>
          <dl className="mt-3 space-y-2 sm:space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-wrap items-baseline justify-between gap-x-3"
              >
                <dt className="text-muted-foreground text-xs font-medium">
                  {row.label}
                  <span className="text-muted-foreground/80 ml-1.5 font-mono text-[0.6875rem]">
                    {row.count}
                  </span>
                  <span className="sr-only">
                    {row.count === 1 ? " entry" : " entries"}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "font-mono text-base font-semibold tracking-[-0.02em] tabular-nums sm:text-lg",
                    row.text,
                  )}
                >
                  <SensitiveValue>
                    {row.sign}
                    {formatCentavos(row.centavos)}
                  </SensitiveValue>
                </dd>
                {/* Phones keep the figures and drop the bars. */}
                <dd
                  aria-hidden="true"
                  className="bg-muted mt-1.5 h-1 basis-full overflow-hidden rounded-full max-sm:hidden"
                >
                  {largest > 0 && row.centavos > 0 ? (
                    <span
                      style={{
                        width: `${Math.max(2, (row.centavos / largest) * 100)}%`,
                      }}
                      className={cn(
                        "block h-full rounded-full",
                        row.bar,
                        todayStyles.fill,
                      )}
                    />
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className="border-border/70 mt-3 flex flex-wrap items-baseline justify-between gap-x-3 border-t pt-3 sm:mt-4">
            <span className="text-muted-foreground text-xs font-medium">
              Net
            </span>
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                net > 0 && "text-positive",
              )}
            >
              <SensitiveValue>
                {net > 0 ? "+" : net < 0 ? "−" : ""}
                {formatCentavos(Math.abs(net))}
              </SensitiveValue>
            </span>
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          No money came in or went out in these moments.
        </p>
      )}
      {summary.transferCount > 0 ? (
        <p className="text-muted-foreground mt-3 text-[0.6875rem] leading-4">
          {summary.transferCount === 1
            ? "1 transfer between your accounts is"
            : `${summary.transferCount} transfers between your accounts are`}{" "}
          not counted.
        </p>
      ) : null}
    </div>
  );
}

/** Moments by module as one bar, each module named beneath with its count. */
function ModuleMix({ counts }: { counts: TimelineSummary["moduleCounts"] }) {
  const filled = timelineModules.filter((module) => counts[module] > 0);
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>Where it happened</p>
      <div
        aria-hidden="true"
        className="bg-muted/70 ring-border/60 flex h-2.5 overflow-hidden rounded-full ring-1"
      >
        {filled.length ? (
          <div className={cn("flex w-full gap-1", todayStyles.fill)}>
            {filled.map((module) => (
              <span
                key={module}
                style={{ flexGrow: counts[module] }}
                className={cn(
                  "h-full min-w-2 basis-0 rounded-full",
                  moduleTones[module].dot,
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ul
        aria-label="Moments by module"
        className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,6.5rem),1fr))] gap-x-4 gap-y-2.5"
      >
        {timelineModules.map((module) => {
          const count = counts[module];
          return (
            <li
              key={module}
              className={cn(
                "flex min-w-0 items-center gap-2",
                count === 0 && "opacity-55",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  moduleTones[module].dot,
                )}
              />
              <span className="text-muted-foreground min-w-0 truncate text-xs">
                {timelineModuleLabels[module]}
              </span>
              <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function bucketLabel(bucket: RhythmBucket, unit: TimelineRhythm["unit"]) {
  if (unit === "day") return weekdayDay.format(utc(bucket.start));
  if (unit === "month") return monthYear.format(utc(bucket.start));
  const start = utc(bucket.start);
  const end = utc(bucket.end);
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${shortDay.format(start)}–${end.getUTCDate()}`
    : `${shortDay.format(start)} – ${shortDay.format(end)}`;
}

function axisLabel(
  bucket: RhythmBucket,
  unit: TimelineRhythm["unit"],
  todayIso: string,
) {
  if (unit === "month") return monthYear.format(utc(bucket.start));
  if (unit === "day" && bucket.start === todayIso) return "Today";
  return shortDay.format(utc(bucket.start));
}

const unitWords = { day: "day", week: "week", month: "month" } as const;

/**
 * Bars for each day (or week, or month) in view, stacked by module. The
 * chart is decorative; the busiest bar is named in text beneath it.
 */
function Rhythm({
  rhythm,
  todayIso,
}: {
  rhythm: TimelineRhythm;
  todayIso: string;
}) {
  const { buckets, unit, max, peak } = rhythm;
  const first = buckets[0]!;
  const last = buckets.at(-1)!;
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>Moments per {unitWords[unit]}</p>
      <div
        aria-hidden="true"
        className="border-border/70 flex h-16 items-end gap-[2px] border-b pb-px sm:h-20 sm:gap-[3px]"
      >
        {buckets.map((bucket) => {
          const title = `${bucketLabel(bucket, unit)} · ${moments(bucket.total)}`;
          if (bucket.total === 0)
            return (
              <span
                key={bucket.start}
                title={title}
                className="bg-muted h-[3px] min-w-0 flex-1 rounded-full"
              />
            );
          const filled = timelineModules.filter(
            (module) => bucket.counts[module] > 0,
          );
          return (
            <span
              key={bucket.start}
              title={title}
              style={{
                height: `${Math.max(8, (bucket.total / max) * 100)}%`,
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col-reverse gap-px overflow-hidden rounded-t-[4px] rounded-b-[2px]",
                styles.rise,
              )}
            >
              {filled.map((module) => (
                <span
                  key={module}
                  style={{ flexGrow: bucket.counts[module] }}
                  className={cn("min-h-[2px] basis-0", moduleTones[module].dot)}
                />
              ))}
            </span>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="text-muted-foreground mt-2 flex justify-between gap-3 font-mono text-[0.6875rem]"
      >
        <span>{axisLabel(first, unit, todayIso)}</span>
        {buckets.length > 1 ? (
          <span>{axisLabel(last, unit, todayIso)}</span>
        ) : null}
      </div>
      {peak ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Busiest {unitWords[unit]}:{" "}
          <span className="text-foreground font-semibold">
            {bucketLabel(peak, unit)}
          </span>{" "}
          · {moments(peak.total)}
        </p>
      ) : null}
    </div>
  );
}

/** The Timeline lead: how much is in view, when, where, and how money moved. */
export function TimelineHero({
  summary,
  rhythm,
  status,
  todayIso,
  hasMore,
}: {
  summary: TimelineSummary;
  rhythm: TimelineRhythm | null;
  status: { tone: TimelineTone; label: string };
  todayIso: string;
  hasMore: boolean;
}) {
  return (
    <HeroShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="timeline-summary-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          In view
        </h2>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-9">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
              {summary.total}
            </span>
            <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              {summary.total === 1 ? "moment" : "moments"}
            </span>
          </p>
          {summary.oldestOn && summary.newestOn ? (
            <p className="mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
              <span className="text-foreground font-semibold">
                {spanLabel(summary.oldestOn, summary.newestOn, todayIso)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {summary.activeDays}{" "}
                {summary.activeDays === 1 ? "active day" : "active days"}
              </span>
            </p>
          ) : null}
          {hasMore ? (
            <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5">
              Counting the moments loaded below. Load older ones to look further
              back.
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <MoneyInView summary={summary} />
        </div>

        <div className="min-w-0">
          <ModuleMix counts={summary.moduleCounts} />
        </div>

        <div className="min-w-0">
          {rhythm ? <Rhythm rhythm={rhythm} todayIso={todayIso} /> : null}
        </div>
      </div>
    </HeroShell>
  );
}

const startHints: Record<(typeof timelineModules)[number], string> = {
  money: "Record income or spending",
  debt: "Log a debt payment",
  tasks: "Complete a task",
  goals: "Reach a milestone or goal",
  career: "Add or move an application",
  reviews: "Submit a weekly review",
  decisions: "Record a decision",
};

/** The hero before anything has happened: what feeds the timeline. */
export function TimelineEmptyHero() {
  return (
    <HeroShell>
      <h2
        id="timeline-summary-heading"
        className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
      >
        Your story
      </h2>
      <div className="mt-6 flex max-w-2xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-sm:hidden">
          <CalendarRange aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            No timeline events yet
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Money you move, tasks and milestones you finish, career steps,
            reviews, and decisions all land here in order, so you can look back
            on what shaped each week.
          </p>
        </div>
      </div>
      <ul
        aria-label="Ways to start your timeline"
        className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3"
      >
        {timelineModules.map((module) => {
          const tone = moduleTones[module];
          const Icon = tone.icon;
          return (
            <li key={module} className="min-w-0">
              <Link
                href={tone.href as never}
                className="bg-background/55 ring-border/70 hover:bg-background/80 hover:ring-border focus-visible:ring-ring flex min-h-11 min-w-0 items-center gap-3 rounded-2xl p-3 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl ring-1",
                    tone.soft,
                    tone.text,
                    tone.ring,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-5 font-semibold">
                    {timelineModuleLabels[module]}
                  </span>
                  <span className="text-muted-foreground block text-xs leading-4">
                    {startHints[module]}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </HeroShell>
  );
}
