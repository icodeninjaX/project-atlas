import { CalendarRange, History } from "lucide-react";
import { TimelineToolbar } from "@/components/timeline/timeline-toolbar";
import { TimelineWorkspace } from "@/components/timeline/timeline-workspace";
import type { TimelineFilters } from "@/lib/timeline/timeline";
import type { TimelinePage } from "@/lib/timeline/server";
import { timelineHref } from "@/lib/timeline/view";
import { PageHeading, PageHeadingLink } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    <PageShell>
      <PageHeading
        eyebrow="Your history"
        icon={CalendarRange}
        title="Life timeline"
        description="A chronological record of the choices, progress, and money movement shaping your life."
        aside={
          <PageHeadingLink href="/settings/activity" icon={History}>
            Activity history
          </PageHeadingLink>
        }
      />

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
    </PageShell>
  );
}
