import { Radar } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SignalList } from "@/components/signals/signal-list";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  signalCategories,
  signalSeverities,
  type SignalCategory,
  type SignalSeverity,
} from "@/lib/signals/engine";
import { loadSignals } from "@/lib/signals/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Signals" };

const categoryByQuery = new Map(
  signalCategories.map((category) => [category.toLowerCase(), category]),
);
const validSeverities = new Set<string>(signalSeverities);

function filterHref(
  category: SignalCategory | null,
  severity: SignalSeverity | null,
): Route {
  const query = new URLSearchParams();
  if (category) query.set("category", category.toLowerCase());
  if (severity) query.set("severity", severity);
  const suffix = query.toString();
  return (suffix ? `/signals?${suffix}` : "/signals") as Route;
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const category = categoryByQuery.get(params.category ?? "") ?? null;
  const severity = validSeverities.has(params.severity ?? "")
    ? (params.severity as SignalSeverity)
    : null;
  const supabase = await createClient();
  let allSignals = null;
  if (supabase) {
    try {
      allSignals = await loadSignals(supabase);
    } catch {
      allSignals = null;
    }
  }
  const visibleSignals =
    allSignals?.filter(
      (signal) =>
        (!category || signal.category === category) &&
        (!severity || signal.severity === severity),
    ) ?? null;

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Deterministic insight engine"
        title="Signals"
        description="Meaningful changes, risks, deadlines, and improvements detected from your ATLAS records. Every signal shows the facts behind it."
      />

      <nav
        aria-label="Signal categories"
        className="border-border bg-muted/60 mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-2xl border p-1 [&::-webkit-scrollbar]:hidden"
      >
        {[null, ...signalCategories].map((item) => {
          const selected = item === category;
          return (
            <Link
              key={item ?? "all"}
              href={filterHref(item, severity)}
              aria-current={selected ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? "border-border bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground border-transparent"
              }`}
            >
              {item ?? "All"}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        {visibleSignals && (
          <p className="text-muted-foreground order-2 font-mono text-xs sm:order-1">
            {visibleSignals.length}{" "}
            {visibleSignals.length === 1 ? "signal" : "signals"}
          </p>
        )}
        <form
          method="get"
          className="order-1 flex w-full items-end gap-2.5 sm:order-2 sm:ml-auto sm:w-auto"
        >
          {category && (
            <input
              type="hidden"
              name="category"
              value={category.toLowerCase()}
            />
          )}
          <label className="text-muted-foreground min-w-0 flex-1 text-xs sm:w-48 sm:flex-none">
            Severity
            <select
              name="severity"
              defaultValue={severity ?? ""}
              className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">All severities</option>
              {signalSeverities.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="shrink-0"
          >
            Apply
          </Button>
        </form>
      </div>

      <div className="mt-5">
        {visibleSignals === null ? (
          <Card>
            <CardContent className="grid min-h-56 place-items-center text-center">
              <div className="max-w-sm">
                <Radar className="text-primary mx-auto size-6" />
                <p className="mt-4 text-sm font-semibold">
                  Signals are unavailable.
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  ATLAS could not safely calculate signals from the current
                  source records. No records were changed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : visibleSignals.length === 0 ? (
          <div className="border-border grid min-h-56 place-items-center rounded-2xl border border-dashed p-6 text-center">
            <div className="max-w-sm">
              <Radar className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No signals match this view.
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                This can mean nothing unusual was detected or there is not yet
                enough history for a reliable comparison.
              </p>
              {(category || severity) && (
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/signals">Clear filters</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <SignalList signals={visibleSignals} />
        )}
      </div>
    </div>
  );
}
