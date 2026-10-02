"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { useScrollStrip } from "@/components/shared/scroll-strip";
import {
  knowledgeViews,
  sortLabels,
  type KnowledgeSort,
  type KnowledgeView,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const fieldClass =
  "border-border bg-background/70 text-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm";

const pillClass =
  "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8 sm:px-3";

function pillState(active: boolean) {
  return active
    ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)] dark:bg-white/[0.11]"
    : "text-muted-foreground hover:bg-card/60 hover:text-foreground";
}

function FilterChip({
  label,
  name,
  onRemove,
}: {
  label: string;
  name: string;
  onRemove: () => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-label={name}
        onClick={onRemove}
        className="bg-primary/10 ring-primary/20 hover:bg-primary/15 dark:text-primary focus-visible:ring-ring inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full pr-2 pl-3 text-xs font-semibold text-blue-700 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8"
      >
        <span className="truncate">{label}</span>
        <X aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </li>
  );
}

/**
 * Search, category, sort, and the view, as one glass bar. Everything
 * applies as it changes; each filter in force shows below as a chip.
 */
export function KnowledgeToolbar({
  view,
  counts,
  query,
  category,
  categories,
  sort,
  onView,
  onQuery,
  onCategory,
  onSort,
  onClear,
}: {
  view: KnowledgeView;
  counts: Record<KnowledgeView, number>;
  query: string;
  category: string;
  categories: string[];
  sort: KnowledgeSort;
  onView: (view: KnowledgeView) => void;
  onQuery: (query: string) => void;
  onCategory: (category: string) => void;
  onSort: (sort: KnowledgeSort) => void;
  onClear: () => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  useScrollStrip(strip, { activeKey: view });
  const trimmed = query.trim();
  const filtered =
    trimmed !== "" || category !== "all" || sort !== "next-review";

  return (
    <div className="mt-8 sm:mt-10">
      <div
        role="search"
        aria-label="Browse concepts"
        className={cn(
          surfaceClass,
          "bg-card/85 relative rounded-[1.5rem] p-3 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] backdrop-blur sm:p-4",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-1">
            Search concepts
            <span className="relative mt-1.5 block">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                maxLength={120}
                placeholder="Title, category, or tag"
                className="border-border bg-background/70 text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border py-2 pr-3 pl-10 text-base outline-none focus-visible:ring-2 sm:text-sm"
              />
            </span>
          </label>
          <CollapsibleFilters
            activeCount={
              Number(category !== "all") + Number(sort !== "next-review")
            }
          >
            <label className="text-muted-foreground text-xs">
              Category
              <select
                value={category}
                onChange={(event) => onCategory(event.target.value)}
                className={fieldClass}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground text-xs">
              Sort by
              <select
                value={sort}
                onChange={(event) =>
                  onSort(event.target.value as KnowledgeSort)
                }
                className={fieldClass}
              >
                {(Object.keys(sortLabels) as KnowledgeSort[]).map((value) => (
                  <option key={value} value={value}>
                    {sortLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </CollapsibleFilters>
        </div>
        <div className="border-border/70 mt-3 border-t pt-3">
          <div
            ref={strip}
            role="group"
            aria-label="Views"
            className="bg-muted/50 ring-border/80 relative flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto rounded-full p-1 ring-1 sm:inline-flex sm:max-w-full [&::-webkit-scrollbar]:hidden"
          >
            {knowledgeViews.map(({ value, label }) => {
              const count = counts[value];
              const active = view === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${label}, ${count} ${count === 1 ? "concept" : "concepts"}`}
                  aria-pressed={active}
                  onClick={() => onView(value)}
                  className={cn(pillClass, pillState(active))}
                >
                  {label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none",
                      value === "due" && count > 0
                        ? "bg-primary-solid text-primary-solid-foreground"
                        : "bg-foreground/[0.07] text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
          <p className="text-muted-foreground text-xs">Showing</p>
          <ul
            aria-label="Filters in use"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          >
            {trimmed ? (
              <FilterChip
                label={`“${trimmed}”`}
                name={`Remove search: ${trimmed}`}
                onRemove={() => onQuery("")}
              />
            ) : null}
            {category !== "all" ? (
              <FilterChip
                label={category}
                name={`Remove category: ${category}`}
                onRemove={() => onCategory("all")}
              />
            ) : null}
            {sort !== "next-review" ? (
              <FilterChip
                label={sortLabels[sort]}
                name={`Remove sort: ${sortLabels[sort]}`}
                onRemove={() => onSort("next-review")}
              />
            ) : null}
          </ul>
          <button
            type="button"
            onClick={onClear}
            className="text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:ml-auto sm:min-h-8"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
