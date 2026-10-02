import { Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { moduleTones } from "@/components/timeline/module-tone";
import { Button } from "@/components/ui/button";
import {
  timelineModuleLabels,
  timelineModules,
  type TimelineFilters,
} from "@/lib/timeline/timeline";
import {
  activeRangePreset,
  hasTimelineFilters,
  timelineHref,
  timelineRangePresets,
} from "@/lib/timeline/view";
import { cn } from "@/lib/utils";

const fieldClass =
  "border-border bg-background/70 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm";

/** A pill strip that scrolls sideways on phones. */
const stripClass =
  "bg-muted/50 ring-border/80 flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto rounded-full p-1 ring-1 [&::-webkit-scrollbar]:hidden";

const pillClass =
  "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8 sm:px-3";

function pillState(active: boolean) {
  return active
    ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)] dark:bg-white/[0.11]"
    : "text-muted-foreground hover:bg-card/60 hover:text-foreground";
}

const shortDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDay(iso: string) {
  return shortDay.format(new Date(`${iso}T12:00:00Z`));
}

function customRangeLabel(from: string | null, to: string | null) {
  if (from && to)
    return from === to
      ? formatDay(from)
      : `${formatDay(from)} – ${formatDay(to)}`;
  if (from) return `From ${formatDay(from)}`;
  return `Through ${formatDay(to!)}`;
}

function ModuleStrip({ filters }: { filters: TimelineFilters }) {
  return (
    <nav aria-label="Filter by module" className="min-w-0">
      <ul className={stripClass}>
        <li className="flex">
          <Link
            href={timelineHref({ ...filters, module: null }) as never}
            aria-current={filters.module === null ? "page" : undefined}
            aria-label="All modules"
            className={cn(pillClass, pillState(filters.module === null))}
          >
            All
          </Link>
        </li>
        {timelineModules.map((module) => {
          const active = filters.module === module;
          return (
            <li key={module} className="flex">
              <Link
                href={timelineHref({ ...filters, module }) as never}
                aria-current={active ? "page" : undefined}
                className={cn(pillClass, pillState(active))}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    moduleTones[module].dot,
                  )}
                />
                {timelineModuleLabels[module]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function RangeStrip({
  filters,
  todayIso,
}: {
  filters: TimelineFilters;
  todayIso: string;
}) {
  const presets = timelineRangePresets(todayIso);
  const active = activeRangePreset(filters, presets);
  return (
    <nav aria-label="Date range" className="min-w-0">
      <ul className={cn(stripClass, "max-sm:grid max-sm:grid-cols-4")}>
        {presets.map((preset) => {
          const current = active?.id === preset.id;
          return (
            <li key={preset.id} className="flex min-w-0">
              <Link
                href={
                  timelineHref({
                    ...filters,
                    from: preset.from,
                    to: null,
                  }) as never
                }
                aria-current={current ? "page" : undefined}
                aria-label={preset.name}
                className={cn(
                  pillClass,
                  pillState(current),
                  "max-sm:min-w-0 max-sm:flex-1 max-sm:px-2",
                )}
              >
                {preset.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ActiveFilter({
  href,
  label,
  name,
}: {
  href: string;
  label: string;
  name: string;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href as never}
        aria-label={name}
        className="bg-primary/10 ring-primary/20 hover:bg-primary/15 dark:text-primary focus-visible:ring-ring inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full pr-2 pl-3 text-xs font-semibold text-blue-700 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8"
      >
        <span className="truncate">{label}</span>
        <X aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    </li>
  );
}

/** Each filter in force, removable one at a time or all at once. */
function ActiveFilters({
  filters,
  todayIso,
}: {
  filters: TimelineFilters;
  todayIso: string;
}) {
  if (!hasTimelineFilters(filters)) return null;
  const preset = activeRangePreset(filters, timelineRangePresets(todayIso));
  const range =
    preset && preset.id !== "all"
      ? preset.name
      : !preset && (filters.from || filters.to)
        ? customRangeLabel(filters.from, filters.to)
        : null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
      <p className="text-muted-foreground text-xs">Showing</p>
      <ul
        aria-label="Filters in use"
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {filters.module ? (
          <ActiveFilter
            href={timelineHref({ ...filters, module: null })}
            label={timelineModuleLabels[filters.module]}
            name={`Remove filter: ${timelineModuleLabels[filters.module]}`}
          />
        ) : null}
        {filters.query ? (
          <ActiveFilter
            href={timelineHref({ ...filters, query: "" })}
            label={`“${filters.query}”`}
            name={`Remove search: ${filters.query}`}
          />
        ) : null}
        {range ? (
          <ActiveFilter
            href={timelineHref({ ...filters, from: null, to: null })}
            label={range}
            name={`Remove date range: ${range}`}
          />
        ) : null}
      </ul>
      <Link
        href="/timeline"
        className="text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:ml-auto sm:min-h-8"
      >
        Clear all
      </Link>
    </div>
  );
}

/**
 * Search, dates, module, and range, as one glass bar. Module and range are
 * links, so they apply at once; search and custom dates apply on submit.
 */
export function TimelineToolbar({
  filters,
  todayIso,
  invalidRange,
}: {
  filters: TimelineFilters;
  todayIso: string;
  invalidRange: boolean;
}) {
  return (
    <div className="mt-6 sm:mt-8">
      <form
        role="search"
        aria-label="Filter the timeline"
        className={cn(
          surfaceClass,
          "bg-card/85 relative rounded-[1.5rem] p-3 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] backdrop-blur sm:p-4",
        )}
      >
        {filters.module ? (
          <input type="hidden" name="module" value={filters.module} />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_auto]">
          <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-1">
            Search timeline
            <span className="relative mt-1.5 block">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                name="q"
                defaultValue={filters.query}
                maxLength={120}
                placeholder="Search titles and notes"
                className="border-border bg-background/70 min-h-11 w-full rounded-xl border py-2 pr-3 pl-10 text-sm"
              />
            </span>
          </label>
          <CollapsibleFilters
            activeCount={[filters.from, filters.to].filter(Boolean).length}
            actions={
              <Button
                type="submit"
                className="flex-1 self-end sm:col-span-2 lg:col-span-1"
              >
                <Filter aria-hidden="true" className="size-4" />
                Apply
              </Button>
            }
          >
            <label className="text-muted-foreground text-xs">
              From
              <input
                name="from"
                type="date"
                defaultValue={filters.from ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="text-muted-foreground text-xs">
              To
              <input
                name="to"
                type="date"
                defaultValue={filters.to ?? ""}
                className={fieldClass}
              />
            </label>
          </CollapsibleFilters>
        </div>
        <div className="border-border/70 mt-3 flex flex-col gap-2.5 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <ModuleStrip filters={filters} />
          <RangeStrip filters={filters} todayIso={todayIso} />
        </div>
      </form>

      {invalidRange ? (
        <p role="alert" className="text-destructive mt-3 px-1 text-xs">
          The start date must be on or before the end date.
        </p>
      ) : null}
      <ActiveFilters filters={filters} todayIso={todayIso} />
    </div>
  );
}
