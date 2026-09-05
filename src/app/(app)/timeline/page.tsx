import { Filter, History, Search } from "lucide-react";
import Link from "next/link";
import { TimelineWorkspace } from "@/components/timeline/timeline-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import {
  normalizeTimelineFilters,
  timelineModuleLabels,
  timelineModules,
  type TimelineFilters,
} from "@/lib/timeline/timeline";
import { loadTimelinePage } from "@/lib/timeline/server";

export const metadata = { title: "Life timeline" };

type SearchParams = {
  q?: string;
  module?: string;
  from?: string;
  to?: string;
};

function filtersHref(filters: TimelineFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.module) params.set("module", filters.module);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const suffix = params.toString();
  return suffix ? `/timeline?${suffix}` : "/timeline";
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = normalizeTimelineFilters({
    query: params.q,
    module: params.module,
    from: params.from,
    to: params.to,
  });
  const invalidRange = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );
  const page = invalidRange
    ? { events: [], nextCursor: null }
    : await loadTimelinePage(filters, null);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Your history"
        title="Life timeline"
        description="A chronological record of the choices, progress, and money movement shaping your life."
        actions={
          <Button asChild variant="secondary">
            <Link href="/settings/activity">
              <History className="size-4" />
              Activity history
            </Link>
          </Button>
        }
      />

      <form className="border-border bg-card mt-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_auto]">
        <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-1">
          Search timeline
          <span className="relative mt-1.5 block">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={filters.query}
              maxLength={120}
              placeholder="Search events"
              className="border-border bg-background min-h-11 w-full rounded-xl border py-2 pr-3 pl-10 text-sm"
            />
          </span>
        </label>
        <label className="text-muted-foreground text-xs">
          Module
          <select
            name="module"
            defaultValue={filters.module ?? ""}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            <option value="">All modules</option>
            {timelineModules.map((module) => (
              <option key={module} value={module}>
                {timelineModuleLabels[module]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          From
          <input
            name="from"
            type="date"
            defaultValue={filters.from ?? ""}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          To
          <input
            name="to"
            type="date"
            defaultValue={filters.to ?? ""}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <Button type="submit" className="self-end">
          <Filter className="size-4" />
          Apply
        </Button>
      </form>

      {invalidRange ? (
        <p role="alert" className="text-destructive mt-3 text-xs">
          The start date must be on or before the end date.
        </p>
      ) : null}
      {(filters.query || filters.module || filters.from || filters.to) && (
        <div className="mt-3 flex justify-end">
          <Link
            href={
              filtersHref({
                query: "",
                module: null,
                from: null,
                to: null,
              }) as never
            }
            className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear filters
          </Link>
        </div>
      )}

      <section className="mt-6" aria-label="Timeline events">
        {page ? (
          <TimelineWorkspace
            initialEvents={page.events}
            initialCursor={page.nextCursor}
            filters={filters}
          />
        ) : (
          <div className="border-border grid min-h-64 place-items-center rounded-2xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Timeline is unavailable while ATLAS is not configured.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
