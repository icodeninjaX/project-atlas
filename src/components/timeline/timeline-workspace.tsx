"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  SearchX,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { stageTones } from "@/components/career/stage-tone";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { kindIcons, moduleTones } from "@/components/timeline/module-tone";
import {
  TimelineEmptyHero,
  TimelineHero,
} from "@/components/timeline/timeline-hero";
import { Button } from "@/components/ui/button";
import { stageLabels, type CareerStage } from "@/lib/career/view";
import { formatWeekOfTitle } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import {
  timelineFiltersToSearchParams,
  type TimelineEvent,
  type TimelineFilters,
} from "@/lib/timeline/timeline";
import {
  groupTimelineMonths,
  hasTimelineFilters,
  parseStageChange,
  relativeDayLabel,
  summarizeTimeline,
  timelineDescription,
  timelineKind,
  timelineKindLabel,
  timelineRhythm,
  timelineStatus,
  type TimelineDay,
  type TimelineMonth,
} from "@/lib/timeline/view";
import { cn } from "@/lib/utils";

const monthName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
});

const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
});

const weekdayName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "long",
});

const longDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const monthDayYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
});

function utc(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

function moments(count: number) {
  return `${count} ${count === 1 ? "moment" : "moments"}`;
}

function signedCentavos(centavos: number) {
  return `${centavos > 0 ? "+" : centavos < 0 ? "−" : ""}${formatCentavos(Math.abs(centavos))}`;
}

function EventAmount({ event }: { event: TimelineEvent }) {
  if (event.amountCentavos === null) return null;
  const prefix =
    event.amountDirection === "inflow"
      ? "+"
      : event.amountDirection === "outflow"
        ? "−"
        : "";
  return (
    <p
      className={cn(
        "shrink-0 font-mono text-[0.9375rem] leading-6 font-semibold tracking-[-0.02em] tabular-nums",
        event.amountDirection === "inflow" && "text-positive",
        event.amountDirection === "neutral" && "text-muted-foreground",
      )}
    >
      <SensitiveValue>
        {prefix}
        {formatCentavos(event.amountCentavos)}
      </SensitiveValue>
    </p>
  );
}

function StageChip({ stage }: { stage: CareerStage }) {
  const tone = stageTones[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold ring-1",
        tone.soft,
        tone.text,
        tone.ring,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
      />
      {stageLabels[stage]}
    </span>
  );
}

/** "Applied → Interview" as stage chips, or the one stage it is at. */
function StageChange({
  change,
}: {
  change: NonNullable<ReturnType<typeof parseStageChange>>;
}) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="sr-only">Stage: </span>
      {change.from ? (
        <>
          <StageChip stage={change.from} />
          <ArrowRight
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span className="sr-only"> to </span>
        </>
      ) : null}
      <StageChip stage={change.to} />
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const shown =
    label === "Overall score" && /^\d+$/.test(value) ? `${value}/10` : value;
  return (
    <span className="bg-muted/60 ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-4 ring-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{shown}</span>
    </span>
  );
}

function TimelineEventRow({
  event,
  last,
}: {
  event: TimelineEvent;
  last: boolean;
}) {
  const tone = moduleTones[event.module];
  const kind = timelineKind(event.eventType);
  const Icon = kind ? kindIcons[kind] : tone.icon;
  const title = formatWeekOfTitle(event.title);
  const stageChange =
    event.module === "career" ? parseStageChange(event.description) : null;
  const description = stageChange ? null : timelineDescription(event);
  const metric =
    event.metricLabel && event.metricValue
      ? { label: event.metricLabel, value: event.metricValue }
      : null;
  const unavailable = !event.sourceHref && !event.sourceAvailable;

  return (
    <li className="relative">
      {/* The rail runs from this node to the next one. */}
      {last ? null : (
        <span
          aria-hidden="true"
          className="from-border to-border/50 absolute top-[3.25rem] bottom-[-0.5rem] left-[calc(2rem-0.5px)] w-px bg-gradient-to-b sm:top-[3.625rem] sm:bottom-[-0.625rem] sm:left-[calc(2.375rem-0.5px)]"
        />
      )}
      <article className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-5 sm:py-4">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 place-items-center rounded-full ring-1 sm:size-9",
            tone.soft,
            tone.text,
            tone.ring,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
            <div className="min-w-0 flex-1 basis-40">
              <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] leading-5 font-semibold tracking-[0.06em] uppercase">
                <span className={tone.text}>
                  {timelineKindLabel(event.eventType)}
                </span>
                {event.occurredPrecision === "timestamp" ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="bg-muted-foreground/50 size-0.5 rounded-full"
                    />
                    <time
                      dateTime={event.occurredAt}
                      className="text-muted-foreground font-mono font-medium tracking-normal normal-case"
                    >
                      {timeFormatter.format(new Date(event.occurredAt))}
                    </time>
                  </>
                ) : null}
              </p>
              <h4 className="mt-0.5 text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words">
                {title}
              </h4>
            </div>
            <EventAmount event={event} />
          </div>
          {description ? (
            <p className="text-muted-foreground mt-1 text-[0.8125rem] leading-5 break-words">
              {description}
            </p>
          ) : null}
          {stageChange ? <StageChange change={stageChange} /> : null}
          {metric || unavailable ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {metric ? <Metric {...metric} /> : null}
              {unavailable ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[0.6875rem]">
                  <Unlink aria-hidden="true" className="size-3" />
                  Source no longer available
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {event.sourceHref ? (
          <Link
            href={event.sourceHref as never}
            aria-label={`Open in ${tone.place}: ${title}`}
            title={`Open in ${tone.place}`}
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-ring -mt-2.5 -mr-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:-mt-1.5 sm:size-9"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </article>
    </li>
  );
}

/**
 * The day's date as a small calendar leaf and its name. Below `sm` it is a
 * row over the day's card; from `sm` it is a column beside the card that
 * stays in view while the day scrolls past.
 */
function DayHeader({ day, todayIso }: { day: TimelineDay; todayIso: string }) {
  const date = utc(day.occurredOn);
  const relative = relativeDayLabel(day.occurredOn, todayIso);
  const today = relative === "Today";
  return (
    <div className="flex min-w-0 items-center gap-3 px-1 sm:sticky sm:top-20 sm:flex-col sm:items-start sm:gap-2.5 sm:self-start sm:px-0 sm:pt-3 lg:top-6">
      <span
        aria-hidden="true"
        className={cn(
          "grid w-11 shrink-0 justify-items-center rounded-xl py-1 shadow-[0_1px_2px_rgb(7_10_15/0.08)] ring-1 sm:w-12",
          today
            ? "bg-primary/12 ring-primary/35"
            : "bg-card/85 ring-border/80 backdrop-blur",
        )}
      >
        <span
          className={cn(
            "text-[0.5625rem] leading-3 font-semibold tracking-[0.14em] uppercase",
            // A deeper blue keeps 4.5:1 on today's tinted leaf.
            today ? "dark:text-primary text-blue-700" : "text-primary",
          )}
        >
          {monthShort.format(date)}
        </span>
        <span className="font-mono text-lg leading-6 font-semibold tracking-[-0.04em]">
          {date.getUTCDate()}
        </span>
      </span>
      <div className="min-w-0 flex-1 sm:flex-none">
        <h3 className="truncate text-sm leading-5 font-semibold tracking-[-0.01em]">
          {relative ?? weekdayName.format(date)}
          <span className="sr-only">
            , {(relative ? longDate : monthDayYear).format(date)}
          </span>
        </h3>
        <p className="text-muted-foreground text-xs leading-5">
          {moments(day.events.length)}
        </p>
      </div>
      {day.netCentavos !== null ? (
        <p className="text-muted-foreground shrink-0 text-right font-mono text-[0.6875rem] leading-4 sm:text-left">
          <span className="font-sans">Net </span>
          <SensitiveValue
            className={cn(
              "font-semibold",
              day.netCentavos > 0 ? "text-positive" : "text-foreground",
            )}
          >
            {signedCentavos(day.netCentavos)}
          </SensitiveValue>
        </p>
      ) : null}
    </div>
  );
}

function MonthSection({
  month,
  todayIso,
}: {
  month: TimelineMonth;
  todayIso: string;
}) {
  const date = utc(`${month.month}-01`);
  const headingId = `timeline-month-${month.month}`;
  return (
    <li aria-labelledby={headingId}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
        <h2
          id={headingId}
          className="text-[1.375rem] leading-none font-semibold tracking-[-0.035em] sm:text-2xl"
        >
          {monthName.format(date)}{" "}
          <span className="text-muted-foreground font-medium">
            {date.getUTCFullYear()}
          </span>
        </h2>
        <span
          aria-hidden="true"
          className="from-border mb-1.5 h-px min-w-6 flex-1 bg-gradient-to-r to-transparent"
        />
        <p className="text-muted-foreground mb-px shrink-0 font-mono text-[0.6875rem]">
          {moments(month.total)}
        </p>
      </div>
      <ol className="mt-4 space-y-6 sm:mt-5">
        {month.days.map((day) => (
          <li
            key={day.occurredOn}
            id={`day-${day.occurredOn}`}
            className="grid scroll-mt-24 gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-5"
          >
            <DayHeader day={day} todayIso={todayIso} />
            <ol
              data-spotlight
              className={cn(
                surfaceClass,
                "bg-card/90 relative min-w-0 self-start rounded-[1.5rem] py-1 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
              )}
            >
              {day.events.map((event, index) => (
                <TimelineEventRow
                  key={event.eventId}
                  event={event}
                  last={index === day.events.length - 1}
                />
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </li>
  );
}

function NoMatches() {
  return (
    <div className="bg-card/60 mt-8 grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed p-6 text-center">
      <div className="max-w-sm">
        <span className="bg-muted/70 ring-border/80 text-muted-foreground mx-auto grid size-11 place-items-center rounded-2xl ring-1">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold tracking-[-0.01em]">
          No moments match
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Try another word, a different module, or a wider date range.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link href="/timeline">Clear filters</Link>
        </Button>
      </div>
    </div>
  );
}

export function TimelineWorkspace({
  initialEvents,
  initialCursor,
  filters,
  todayIso,
  toolbar,
}: {
  initialEvents: TimelineEvent[];
  initialCursor: string | null;
  filters: TimelineFilters;
  /** Today in Manila, `YYYY-MM-DD`, from the server. */
  todayIso: string;
  /** The filters, shown once there is something to filter. */
  toolbar?: ReactNode;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const endRef = useRef<HTMLParagraphElement>(null);
  const filtered = hasTimelineFilters(filters);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = timelineFiltersToSearchParams(filters);
      params.set("cursor", cursor);
      const response = await fetch(`/api/timeline?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("Timeline could not load older events.");
      const page = (await response.json()) as {
        events: TimelineEvent[];
        nextCursor: string | null;
      };
      setEvents((current) => [...current, ...page.events]);
      setCursor(page.nextCursor);
      setAnnouncement(
        `Loaded ${page.events.length} older ${page.events.length === 1 ? "moment" : "moments"}.`,
      );
      // The button goes away with the last page; keep focus nearby.
      if (!page.nextCursor)
        requestAnimationFrame(() => endRef.current?.focus());
    } catch {
      setError("Older events could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (events.length === 0) {
    return filtered ? (
      <>
        {toolbar}
        <NoMatches />
      </>
    ) : (
      <TimelineEmptyHero />
    );
  }

  const summary = summarizeTimeline(events, todayIso);
  const through = filters.to && filters.to < todayIso ? filters.to : todayIso;

  return (
    <>
      <TimelineHero
        summary={summary}
        rhythm={timelineRhythm(events, {
          through,
          complete: cursor === null,
          from: filters.from,
        })}
        status={timelineStatus(summary, todayIso, filtered)}
        todayIso={todayIso}
        hasMore={cursor !== null}
      />
      {toolbar}

      <section aria-label="Timeline events" className="mt-9 sm:mt-11">
        <ol aria-label="Life timeline" className="space-y-11 sm:space-y-12">
          {groupTimelineMonths(events).map((month) => (
            <MonthSection key={month.month} month={month} todayIso={todayIso} />
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          {cursor ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={loadMore}
                pending={loading}
                pendingLabel="Loading older moments"
                className="rounded-full px-5"
              >
                <ChevronDown aria-hidden="true" className="size-4" />
                Load older moments
              </Button>
              <p className="text-muted-foreground text-xs">
                {moments(events.length)} loaded
              </p>
            </>
          ) : (
            <p
              ref={endRef}
              tabIndex={-1}
              className="text-muted-foreground inline-flex items-center gap-2.5 rounded-full text-xs focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 ring-muted size-2 rounded-full ring-4"
              />
              {filtered
                ? "That’s every moment that matches."
                : "That’s the beginning of your timeline."}
            </p>
          )}
          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </section>
    </>
  );
}
