import { CalendarRange, History } from "lucide-react";
import Link from "next/link";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import todayStyles from "@/components/dashboard/today.module.css";
import { TimelineToolbar } from "@/components/timeline/timeline-toolbar";
import { TimelineWorkspace } from "@/components/timeline/timeline-workspace";
import type { TimelineFilters } from "@/lib/timeline/timeline";
import type { TimelinePage } from "@/lib/timeline/server";
import { timelineHref } from "@/lib/timeline/view";
import { cn } from "@/lib/utils";

/** The Life timeline page body, from data the page has already loaded. */
export function TimelineScreen({
  filters,
  page,
  todayIso,
  invalidRange,
}: {
  filters: TimelineFilters;
  /** Null while ATLAS is not configured. */
  page: TimelinePage | null;
  /** Today in Manila, `YYYY-MM-DD`. */
  todayIso: string;
  invalidRange: boolean;
}) {
  return (
    <SpotlightArea className="relative isolate mx-auto w-full max-w-5xl min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
            <CalendarRange aria-hidden="true" className="size-3.5" />
            Your history
          </p>
          <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
            Life timeline
          </h1>
          <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            A chronological record of the choices, progress, and money movement
            shaping your life.
          </p>
        </div>
        <Link
          href="/settings/activity"
          className="bg-card/60 text-foreground ring-border/80 hover:bg-card focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 text-xs font-semibold ring-1 backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 sm:self-auto"
        >
          <History aria-hidden="true" className="text-primary size-4" />
          Activity history
        </Link>
      </header>

      {page ? (
        // Keyed by the filters so a new filter starts from its own first
        // page, and the form shows the values in force.
        <TimelineWorkspace
          key={timelineHref(filters)}
          initialEvents={page.events}
          initialCursor={page.nextCursor}
          filters={filters}
          todayIso={todayIso}
          toolbar={
            <TimelineToolbar
              filters={filters}
              todayIso={todayIso}
              invalidRange={invalidRange}
            />
          }
        />
      ) : (
        <div className="mt-8 grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Timeline is unavailable while ATLAS is not configured.
          </p>
        </div>
      )}
    </SpotlightArea>
  );
}
