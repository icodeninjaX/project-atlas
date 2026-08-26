import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";
import { SignalList } from "@/components/signals/signal-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Signal } from "@/lib/signals/engine";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "thing" : "things"} worth noticing`;
}

export function SignalsPanel({ signals }: { signals: Signal[] | null }) {
  const visibleSignals = signals?.slice(0, 5) ?? null;

  return (
    <section aria-labelledby="dashboard-signals" className="mt-3 sm:mt-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radar aria-hidden="true" className="text-primary size-4" />
              <CardTitle id="dashboard-signals">Signals</CardTitle>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {visibleSignals
                ? countLabel(visibleSignals.length)
                : "Current changes and risks"}
            </p>
          </div>
          <Link
            href="/signals"
            className="text-primary focus-visible:ring-ring inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 pt-4 sm:p-0 sm:pt-5">
          {visibleSignals === null ? (
            <div className="border-border border-t p-5 text-center">
              <p className="text-sm font-semibold">Signals are unavailable.</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Your source records are unchanged. Try again when the dashboard
                refreshes.
              </p>
            </div>
          ) : visibleSignals.length === 0 ? (
            <div className="border-border border-t p-5 text-center">
              <p className="text-sm font-semibold">
                Nothing unusual needs attention.
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Signals appear only when ATLAS has enough data to prove a
                meaningful change, risk, deadline, or improvement.
              </p>
            </div>
          ) : (
            <div className="border-border border-t">
              <SignalList signals={visibleSignals} compact />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
