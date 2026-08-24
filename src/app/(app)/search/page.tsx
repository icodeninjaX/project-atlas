import { ArrowUpRight, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SearchInput } from "@/components/search/search-input";
import { createClient } from "@/lib/supabase/server";

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
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "")
    ? params.from
    : undefined;
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "")
    ? params.to
    : undefined;
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

  const grouped = results.reduce<Record<string, SearchResult[]>>(
    (groups, result) => {
      (groups[result.entity_type] ??= []).push(result);
      return groups;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        Across ATLAS
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Search</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Results stay inside your account and are grouped by the record you
        recognize.
      </p>
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
        {!query ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed text-center">
            <div>
              <Search className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                Find anything you have mapped.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Type at least two characters. Use Tab and Enter to open a
                result.
              </p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <p
            role="status"
            className="border-border bg-card text-muted-foreground rounded-2xl border p-8 text-center text-sm"
          >
            No results matched “{query}”. Try a company, task, creditor,
            merchant, or phrase.
          </p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, items]) => (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2
                  id={`group-${group}`}
                  className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase"
                >
                  {group} <span className="font-mono">· {items.length}</span>
                </h2>
                <div className="border-border bg-card overflow-hidden rounded-2xl border">
                  {items.map((result) => (
                    <Link
                      key={`${group}-${result.entity_id}`}
                      href={result.entity_path as Route}
                      className="border-border hover:bg-muted focus-visible:ring-ring flex items-center gap-4 border-b p-4 last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-muted-foreground mt-1 truncate text-xs">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
