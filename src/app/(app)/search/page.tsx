import { Search, SearchX } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SearchInput } from "@/components/search/search-input";
import { getSearchGoalContext, searchResultGraphKey } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";
import { formatWeekOfTitle, isCalendarDate } from "@/lib/dates/dates";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Search" };

type SearchResult = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  occurred_at: string;
  entity_path: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const query = String(params.q ?? "")
    .trim()
    .slice(0, 100);
  const entityType = params.type ?? "all";
  const status = params.status ?? "all";
  const fromDate = isCalendarDate(params.from) ? params.from : undefined;
  const toDate = isCalendarDate(params.to) ? params.to : undefined;
  let results: SearchResult[] = [];

  if (query.length >= 2) {
    const supabase = await createClient();
    const { data } = supabase
      ? await supabase.rpc("search_atlas", {
          p_query: query,
          p_limit: 60,
          p_entity_type: entityType,
          p_status: status,
          p_from_date: fromDate,
          p_to_date: toDate,
        })
      : { data: null };
    results = (data ?? []) as SearchResult[];
  }
  const goalContext = await getSearchGoalContext(results);

  const grouped = results.reduce<Record<string, SearchResult[]>>(
    (groups, result) => {
      (groups[result.entity_type] ??= []).push(result);
      return groups;
    },
    {},
  );

  return (
    <PageShell>
      <PageHeading
        title="Search"
        description="Results stay inside your account and are grouped by the record you recognize."
      />
      <div className="mt-7">
        <SearchInput
          defaultValue={query}
          entityType={entityType}
          status={status}
          fromDate={fromDate ?? ""}
          toDate={toDate ?? ""}
        />
      </div>

      <div className="mt-8">
        {query.length < 2 ? (
          <EmptyState
            icon={Search}
            title="Search your records"
            description="Type at least two characters. Use Tab and Enter to open a result."
          />
        ) : results.length === 0 ? (
          <div role="status">
            <EmptyState
              icon={SearchX}
              title="No results"
              description={`Nothing matched “${query}”. Try a company, task, creditor, merchant, or phrase.`}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, items]) => (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2
                  id={`group-${group}`}
                  className="text-muted-foreground mb-3 text-[0.8125rem] font-semibold"
                >
                  {group} <span className="font-mono">· {items.length}</span>
                </h2>
                <div className="border-border bg-card overflow-hidden rounded-2xl border">
                  {items.map((result) => (
                    <Link
                      key={`${group}-${result.entity_id}`}
                      href={result.entity_path as Route}
                      className="border-border hover:bg-muted focus-visible:ring-ring block border-b p-4 last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {formatWeekOfTitle(result.title)}
                        </p>
                        {result.subtitle && (
                          <p className="text-muted-foreground mt-1 truncate text-xs">
                            {result.subtitle}
                          </p>
                        )}
                        {goalContext.get(
                          searchResultGraphKey(
                            result.entity_type,
                            result.entity_id,
                          ) ?? "",
                        ) ? (
                          <p className="text-muted-foreground mt-1 truncate text-xs">
                            Related to goal ·{" "}
                            {
                              goalContext.get(
                                searchResultGraphKey(
                                  result.entity_type,
                                  result.entity_id,
                                ) ?? "",
                              )?.title
                            }
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
