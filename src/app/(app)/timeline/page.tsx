import { TimelineScreen } from "@/components/timeline/timeline-screen";
import { manilaTodayIsoDate } from "@/lib/dates/dates";
import { normalizeTimelineFilters } from "@/lib/timeline/timeline";
import { loadTimelinePage } from "@/lib/timeline/server";

export const metadata = { title: "Life timeline" };

type SearchParams = {
  q?: string;
  module?: string;
  from?: string;
  to?: string;
};

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
    <TimelineScreen
      filters={filters}
      page={page}
      todayIso={manilaTodayIsoDate()}
      invalidRange={invalidRange}
    />
  );
}
