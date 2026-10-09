import { CloudOff, History, LogIn, ShieldCheck, Waypoints } from "lucide-react";
import Link from "next/link";
import { DashboardCardHeading } from "@/components/dashboard/dashboard-card";
import {
  CoverageSwatch,
  HistoryHeader,
  HistoryMessage,
  SectionHeading,
  glassCardClass,
  tileClass,
} from "@/components/history/history-chrome";
import {
  HistoryEmptyHero,
  HistoryHero,
} from "@/components/history/history-hero";
import { HistoryToolbar } from "@/components/history/history-toolbar";
import { MetricCard } from "@/components/history/metric-card";
import { Button } from "@/components/ui/button";
import type { HistoricalMetric, MetricGrain } from "@/lib/history/metrics";
import {
  historyHref,
  metricKeys,
  summarizeHistory,
  summarizeSeries,
  type HistoryCoverage,
  type HistoryLookback,
  type HistoryWindow,
} from "@/lib/history/view";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/shared/page-shell";

const coverageNotes: Array<{
  coverage: HistoryCoverage;
  title: string;
  body: string;
}> = [
  {
    coverage: "recorded",
    title: "Recorded",
    body: "Source records exist from that date onward. It does not mean every real-world event was entered.",
  },
  {
    coverage: "partial",
    title: "Partial",
    body: "The period meets a date boundary, is still running, or holds the start of available history.",
  },
  {
    coverage: "insufficient",
    title: "No history",
    body: "Periods before the first record and weeks without a review score stay blank, never zero.",
  },
];

/** What recorded, partial, and blank mean, and when values were rebuilt. */
function HistoryNotes({
  updatedAt,
  version,
}: {
  updatedAt: string;
  version: string;
}) {
  return (
    <section
      aria-labelledby="history-notes"
      data-spotlight
      className={cn(
        glassCardClass,
        "mt-10 p-4 min-[360px]:p-5 sm:mt-12 sm:p-6",
      )}
    >
      <DashboardCardHeading
        id="history-notes"
        icon={ShieldCheck}
        title="How to read recorded history"
        description="Every value is recalculated from your surviving source records each time this page loads."
      />
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {coverageNotes.map((note) => (
          <li key={note.coverage} className={tileClass}>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CoverageSwatch coverage={note.coverage} />
              {note.title}
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-5">
              {note.body}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 border-t pt-4 text-xs leading-5">
        Asia/Manila · metric version {version} · updated {updatedAt}. Deleting,
        editing, or backdating a source record changes the next read.
      </p>
    </section>
  );
}

/** The Recorded history page body, from rows the page has already loaded. */
export function HistoryScreen({
  rows,
  unavailable,
  grain,
  months,
  window,
  today,
  updatedAt,
  version,
}: {
  /** Null when no one is signed in. */
  rows: HistoricalMetric[] | null;
  /** The metrics could not be read. */
  unavailable: boolean;
  grain: MetricGrain;
  months: HistoryLookback;
  window: HistoryWindow;
  /** Today in Manila, `YYYY-MM-DD`. */
  today: string;
  /** When the values were recalculated, in Manila words. */
  updatedAt: string;
  version: string;
}) {
  // Row labels omit the year the window ends in; the hero shows it.
  const contextYear = Number(window.through.slice(0, 4));
  const series = rows
    ? metricKeys.map((metric) => summarizeSeries(rows, metric, window))
    : [];
  const overview = summarizeHistory(series);

  return (
    <PageShell>
      <HistoryHeader
        eyebrow="Deterministic metrics"
        eyebrowIcon={History}
        title="Recorded history"
        description="Compare the records ATLAS can actually reconstruct. Every value is recalculated from your surviving source records."
        link={{
          href: "/history/patterns",
          label: "Explore recorded patterns",
          icon: Waypoints,
        }}
      />

      {unavailable ? (
        <HistoryMessage
          icon={CloudOff}
          title="History could not be loaded"
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={historyHref({ grain, months }) as never}>
                Try again
              </Link>
            </Button>
          }
        >
          Please try again after the database update is available.
        </HistoryMessage>
      ) : rows === null ? (
        <HistoryMessage icon={LogIn} title="Signed out">
          Sign in to see your recorded history.
        </HistoryMessage>
      ) : overview.everRecorded === 0 ? (
        <HistoryEmptyHero />
      ) : (
        <>
          <HistoryHero
            overview={overview}
            series={series}
            window={window}
            grain={grain}
            updatedAt={updatedAt}
            version={version}
          />
          <HistoryToolbar grain={grain} months={months} />
          <section
            aria-labelledby="history-series-heading"
            className="mt-10 sm:mt-12"
          >
            <SectionHeading
              id="history-series-heading"
              title="Series"
              note="Point at a chart, or focus it and use the arrow keys"
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {series.map((item) => (
                <MetricCard
                  key={item.metric}
                  series={item}
                  grain={grain}
                  contextYear={contextYear}
                  today={today}
                />
              ))}
            </div>
          </section>
          <HistoryNotes updatedAt={updatedAt} version={version} />
        </>
      )}
    </PageShell>
  );
}
