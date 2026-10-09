import { Radar, RadioTower, SearchX } from "lucide-react";
import Link from "next/link";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import type { Signal } from "@/lib/signals/engine";
import {
  groupSignals,
  hasSignalFilters,
  matchesSignalFilters,
  type SignalFilters,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { SignalCard } from "./signal-card";
import { SignalsEmptyHero, SignalsHero } from "./signals-hero";
import { SignalsToolbar } from "./signals-toolbar";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

const checkedTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
});

function signalCount(count: number) {
  return `${count} ${count === 1 ? "signal" : "signals"}`;
}

function Header({ checkedAt }: { checkedAt: string | null }) {
  return (
    <PageHeading
      eyebrow="Insight engine"
      icon={Radar}
      title="Signals"
      description="Meaningful changes, risks, deadlines, and improvements detected from your ATLAS records. Every signal shows the facts behind it."
      aside={
        checkedAt ? (
          <p className="bg-card/60 text-muted-foreground ring-border/80 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-4 text-xs font-medium ring-1 backdrop-blur">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="bg-positive/40 absolute inset-0 animate-ping rounded-full motion-reduce:hidden" />
              <span className="bg-positive relative size-2 rounded-full" />
            </span>
            <span>
              Checked{" "}
              <time
                dateTime={checkedAt}
                className="text-foreground font-mono font-semibold"
              >
                {checkedTime.format(new Date(checkedAt))}
              </time>
            </span>
          </p>
        ) : undefined
      }
    />
  );
}

function SignalFeed({
  signals,
  filtered,
}: {
  signals: readonly Signal[];
  filtered: boolean;
}) {
  const groups = groupSignals(signals);
  return (
    <>
      <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-12">
        {groups.map((group) => {
          const headingId = `signals-${group.id}`;
          return (
            <section key={group.id} aria-labelledby={headingId}>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
                <h2
                  id={headingId}
                  className="text-[1.375rem] leading-none font-semibold tracking-[-0.035em] sm:text-2xl"
                >
                  {group.label}
                </h2>
                <span
                  aria-hidden="true"
                  className="from-border mb-1.5 h-px min-w-6 flex-1 bg-gradient-to-r to-transparent"
                />
                <p className="text-muted-foreground mb-px shrink-0 font-mono text-[0.6875rem]">
                  {signalCount(group.signals.length)}
                </p>
              </div>
              <p className="text-muted-foreground mt-1.5 px-1 text-xs leading-5">
                {group.detail}
              </p>
              <ol
                aria-label={group.label}
                className="mt-4 space-y-3 sm:mt-5 sm:space-y-4"
              >
                {group.signals.map((signal) => (
                  <li key={signal.id}>
                    <SignalCard signal={signal} />
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center px-4 text-center">
        <span
          aria-hidden="true"
          className="from-border h-10 w-px bg-gradient-to-b to-transparent"
        />
        <span className="bg-card/80 ring-border/80 text-primary mt-2 grid size-9 place-items-center rounded-full ring-1">
          <RadioTower aria-hidden="true" className="size-4" />
        </span>
        <p className="mt-3 text-sm font-semibold">
          {filtered
            ? "That’s every signal in this view"
            : "That’s everything ATLAS found"}
        </p>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
          Signals are recalculated from your records each time you open this
          page. Nothing is changed.
        </p>
      </div>
    </>
  );
}

function NoMatches() {
  return (
    <div className="bg-card/60 mt-8 grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed p-6 text-center">
      <div className="max-w-sm">
        <span className="bg-muted/70 ring-border/80 text-muted-foreground mx-auto grid size-11 place-items-center rounded-2xl ring-1">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-4 text-sm font-semibold">
          No signals match this view.
        </p>
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          Nothing in this area or severity stands out right now. The rest of
          your signals are a tap away.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link href="/signals">Clear filters</Link>
        </Button>
      </div>
    </div>
  );
}

function Unavailable() {
  return (
    <section
      aria-labelledby="signals-unavailable"
      className={cn(
        surfaceClass,
        "bg-card/90 relative mt-6 grid min-h-64 place-items-center rounded-[1.75rem] p-6 text-center shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] sm:mt-8",
      )}
    >
      <div className="max-w-sm">
        <span className="bg-muted/70 ring-border/80 text-muted-foreground mx-auto grid size-11 place-items-center rounded-2xl ring-1">
          <Radar aria-hidden="true" className="size-5" />
        </span>
        <h2 id="signals-unavailable" className="mt-4 text-sm font-semibold">
          Signals are unavailable.
        </h2>
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          ATLAS could not safely calculate signals from the current source
          records. No records were changed.
        </p>
      </div>
    </section>
  );
}

/** The Signals page body, from signals the page has already loaded. */
export function SignalsScreen({
  signals,
  filters,
  checkedAt,
}: {
  /** Ranked by the engine; null when they could not be calculated. */
  signals: Signal[] | null;
  filters: SignalFilters;
  /** When the signals were calculated, as an ISO timestamp. */
  checkedAt: string;
}) {
  const visible =
    signals?.filter((signal) => matchesSignalFilters(signal, filters)) ?? [];

  return (
    <PageShell>
      <Header checkedAt={signals ? checkedAt : null} />

      {signals === null ? (
        <Unavailable />
      ) : signals.length === 0 ? (
        <SignalsEmptyHero />
      ) : (
        <>
          <SignalsHero signals={signals} filters={filters} />
          <SignalsToolbar signals={signals} filters={filters} />
          {visible.length > 0 ? (
            <SignalFeed
              signals={visible}
              filtered={hasSignalFilters(filters)}
            />
          ) : (
            <NoMatches />
          )}
        </>
      )}
    </PageShell>
  );
}
