import { X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { ScrollStrip } from "@/components/shared/scroll-strip";
import { signalCategories, type Signal } from "@/lib/signals/engine";
import {
  hasSignalFilters,
  severityLabels,
  severityOrder,
  signalFacets,
  signalsHref,
  type SignalFilters,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { categoryTone, severityTones } from "./signal-tone";

/** A pill strip that scrolls sideways when it runs out of room. */
const stripClass =
  "bg-muted/50 ring-border/80 min-w-0 justify-self-start max-w-full [scrollbar-width:none] overflow-x-auto rounded-full p-1 ring-1 [&::-webkit-scrollbar]:hidden";

/** Names each strip from `sm`; phones rely on the strips' own names. */
const rowLabelClass =
  "text-muted-foreground pl-2 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase max-sm:hidden";

const pillClass =
  "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:min-h-8 sm:px-3";

function pillState(active: boolean) {
  return active
    ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)] dark:bg-white/[0.11]"
    : "text-muted-foreground hover:bg-card/60 hover:text-foreground";
}

function signalCount(count: number) {
  return `${count} ${count === 1 ? "signal" : "signals"}`;
}

function Pill({
  href,
  active,
  label,
  count,
  name,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  /** The accessible name's start, when it differs from the label. */
  name?: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex">
      <Link
        href={href as Route}
        aria-current={active ? "page" : undefined}
        aria-label={`${name ?? label}, ${signalCount(count)}`}
        className={cn(pillClass, pillState(active))}
      >
        {children}
        {label}
        <span
          className={cn(
            "font-mono text-[0.6875rem] tabular-nums",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}

function ActiveFilter({ href, label }: { href: string; label: string }) {
  return (
    <li className="min-w-0">
      <Link
        href={href as Route}
        aria-label={`Remove filter: ${label}`}
        className="bg-primary/10 ring-primary/20 hover:bg-primary/15 dark:text-primary focus-visible:ring-ring inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full pr-2 pl-3 text-xs font-semibold text-blue-700 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8"
      >
        <span className="truncate">{label}</span>
        <X aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    </li>
  );
}

/**
 * Area and severity as one glass bar of pills, each with what it would
 * show. Pills are links, so a filter applies in one tap and the address
 * keeps it; filters in force show beneath as chips that remove them.
 */
export function SignalsToolbar({
  signals,
  filters,
}: {
  signals: readonly Signal[];
  filters: SignalFilters;
}) {
  const facets = signalFacets(signals, filters);

  return (
    <div className="mt-6 sm:mt-8">
      <div
        className={cn(
          surfaceClass,
          "bg-card/85 relative grid gap-2 rounded-[1.5rem] p-2.5 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] backdrop-blur sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:p-3",
        )}
      >
        <p aria-hidden="true" className={rowLabelClass}>
          Area
        </p>
        <ScrollStrip
          aria-label="Filter by area"
          activeKey={filters.category ?? "all"}
          className={stripClass}
        >
          <ul className="flex w-max gap-1">
            <Pill
              href={signalsHref({ ...filters, category: null })}
              active={filters.category === null}
              label="All"
              name="All areas"
              count={facets.categoryTotal}
            />
            {signalCategories.map((category) => {
              const Icon = categoryTone(category).icon;
              return (
                <Pill
                  key={category}
                  href={signalsHref({ ...filters, category })}
                  active={filters.category === category}
                  label={category}
                  count={facets.categories[category]}
                >
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                </Pill>
              );
            })}
          </ul>
        </ScrollStrip>
        <p aria-hidden="true" className={rowLabelClass}>
          Severity
        </p>
        <ScrollStrip
          aria-label="Filter by severity"
          activeKey={filters.severity ?? "all"}
          className={stripClass}
        >
          <ul className="flex w-max gap-1">
            <Pill
              href={signalsHref({ ...filters, severity: null })}
              active={filters.severity === null}
              label="All"
              name="All severities"
              count={facets.severityTotal}
            />
            {severityOrder.map((severity) => (
              <Pill
                key={severity}
                href={signalsHref({ ...filters, severity })}
                active={filters.severity === severity}
                label={severityLabels[severity]}
                count={facets.severities[severity]}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    severityTones[severity].dot,
                  )}
                />
              </Pill>
            ))}
          </ul>
        </ScrollStrip>
      </div>

      {hasSignalFilters(filters) ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
          <p className="text-muted-foreground text-xs">Showing</p>
          <ul
            aria-label="Filters in use"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          >
            {filters.category ? (
              <ActiveFilter
                href={signalsHref({ ...filters, category: null })}
                label={filters.category}
              />
            ) : null}
            {filters.severity ? (
              <ActiveFilter
                href={signalsHref({ ...filters, severity: null })}
                label={severityLabels[filters.severity]}
              />
            ) : null}
          </ul>
          <Link
            href="/signals"
            className="text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:ml-auto sm:min-h-8"
          >
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
