"use client";

import Link from "next/link";
import { useState } from "react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { formatCentavos } from "@/lib/money/money";
import {
  groupTimelineEvents,
  timelineFiltersToSearchParams,
  timelineModuleLabels,
  type TimelineEvent,
  type TimelineFilters,
} from "@/lib/timeline/timeline";

const dayFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
});

function formatDay(value: string) {
  return dayFormatter.format(new Date(`${value}T12:00:00Z`));
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
      className={`flex shrink-0 items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${
        event.amountDirection === "inflow" ? "text-primary" : ""
      }`}
    >
      <SensitiveValue>
        {prefix}
        {formatCentavos(event.amountCentavos)}
      </SensitiveValue>
    </p>
  );
}

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  return (
    <li>
      <article className="border-border bg-card min-w-0 rounded-2xl border p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {timelineModuleLabels[event.module]}
              </span>
              {event.occurredPrecision === "timestamp" ? (
                <time
                  dateTime={event.occurredAt}
                  className="text-muted-foreground font-mono text-[10px]"
                >
                  {timeFormatter.format(new Date(event.occurredAt))}
                </time>
              ) : null}
            </div>
            <h3 className="mt-2 text-sm font-semibold break-words">
              {event.title}
            </h3>
            {event.description ? (
              <p className="text-muted-foreground mt-1 text-xs leading-5 break-words">
                {event.description}
              </p>
            ) : null}
          </div>
          <EventAmount event={event} />
        </div>
        {(event.metricLabel || event.sourceHref || !event.sourceAvailable) && (
          <div className="border-border mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
            {event.metricLabel && event.metricValue ? (
              <span className="text-muted-foreground text-[11px]">
                {event.metricLabel}: {event.metricValue}
              </span>
            ) : null}
            {event.sourceHref ? (
              <Link
                href={event.sourceHref as never}
                className="text-primary focus-visible:ring-ring inline-flex min-h-8 items-center gap-1 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                Open source
              </Link>
            ) : !event.sourceAvailable ? (
              <span className="text-muted-foreground text-[11px]">
                Source no longer available
              </span>
            ) : null}
          </div>
        )}
      </article>
    </li>
  );
}

export function TimelineWorkspace({
  initialEvents,
  initialCursor,
  filters,
}: {
  initialEvents: TimelineEvent[];
  initialCursor: string | null;
  filters: TimelineFilters;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groups = groupTimelineEvents(events);

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
    } catch {
      setError("Older events could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (events.length === 0) {
    return (
      <div className="border-border grid min-h-64 place-items-center rounded-2xl border border-dashed p-6 text-center">
        <div className="max-w-sm">
          <h2 className="text-sm font-semibold">No timeline events yet</h2>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Record money movement, complete a task or milestone, update a career
            stage, or submit a review to start your history.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/money/transactions">Record money movement</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ol aria-label="Life timeline" className="space-y-7">
        {groups.map((group) => (
          <li key={group.occurredOn}>
            <h2 className="text-muted-foreground mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
              {formatDay(group.occurredOn)}
            </h2>
            <ol className="space-y-3">
              {group.events.map((event) => (
                <TimelineEventCard key={event.eventId} event={event} />
              ))}
            </ol>
          </li>
        ))}
      </ol>

      {cursor ? (
        <div className="mt-7 text-center">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            pending={loading}
            pendingLabel="Loading older events"
          >
            {!loading ? "Load more" : null}
          </Button>
          {error ? (
            <p role="alert" className="text-destructive mt-3 text-xs">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
