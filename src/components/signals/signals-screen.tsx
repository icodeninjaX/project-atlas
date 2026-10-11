import { Radar, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Signal } from "@/lib/signals/engine";
import {
  groupSignals,
  matchesSignalFilters,
  type SignalFilters,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { SignalCard } from "./signal-card";
import { SignalsEmptyHero, SignalsHero, cardClass } from "./signals-hero";
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
      title="Signals"
      meta={
        checkedAt ? (
          <>
            Checked{" "}
            <time dateTime={checkedAt} className="font-mono">
              {checkedTime.format(new Date(checkedAt))}
            </time>
          </>
        ) : undefined
      }
      description="Meaningful changes, risks, deadlines, and improvements detected from your ATLAS records. Every signal shows the facts behind it."
    />
  );
}

function SignalFeed({ signals }: { signals: readonly Signal[] }) {
  const groups = groupSignals(signals);
  return (
    <>
      <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {groups.map((group) => {
          const headingId = `signals-${group.id}`;
          return (
            <section key={group.id} aria-labelledby={headingId}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                <h2
                  id={headingId}
                  className="text-base leading-6 font-semibold"
                >
                  {group.label}
                </h2>
                <p className="text-muted-foreground shrink-0 font-mono text-xs">
                  {signalCount(group.signals.length)}
                </p>
              </div>
              <p className="text-muted-foreground mt-0.5 px-1 text-xs leading-5">
                {group.detail}
              </p>
              <ol
                aria-label={group.label}
                className={cn(
                  cardClass,
                  "divide-border/70 mt-3 divide-y overflow-hidden",
                )}
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

      <p className="text-muted-foreground mt-8 px-1 text-center text-xs leading-5">
        Signals are recalculated from your records each time you open this page.
        Nothing is changed.
      </p>
    </>
  );
}

function NoMatches() {
  return (
    <div className="mt-8">
      <EmptyState
        icon={SearchX}
        title="No signals match this view"
        description="Nothing in this area or severity stands out right now. The rest of your signals are a tap away."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/signals">Clear filters</Link>
          </Button>
        }
      />
    </div>
  );
}

function Unavailable() {
  return (
    <div className="mt-6 sm:mt-8">
      <EmptyState
        icon={Radar}
        title="Signals are unavailable"
        description="ATLAS could not safely calculate signals from the current source records. No records were changed."
      />
    </div>
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
            <SignalFeed signals={visible} />
          ) : (
            <NoMatches />
          )}
        </>
      )}
    </PageShell>
  );
}
