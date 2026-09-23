import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";
import { SignalList } from "@/components/signals/signal-list";
import type { Signal } from "@/lib/signals/engine";
import { cn } from "@/lib/utils";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "thing" : "things"} worth noticing`;
}

export function SignalsPanel({
  signals,
  className,
}: {
  signals: Signal[] | null;
  className?: string;
}) {
  const visibleSignals = signals?.slice(0, 3) ?? null;
  const importantCount =
    visibleSignals?.filter(
      ({ severity }) => severity === "critical" || severity === "warning",
    ).length ?? 0;

  return (
    <section
      aria-labelledby="dashboard-signals"
      className={cn(
        "border-border border-t pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg",
              importantCount > 0 && "bg-destructive/10 text-destructive",
            )}
          >
            <Radar aria-hidden="true" className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h2 id="dashboard-signals" className="text-sm font-semibold">
              Signals
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs break-words">
              {visibleSignals
                ? importantCount > 0
                  ? `${importantCount} need attention`
                  : countLabel(visibleSignals.length)
                : "Current changes and risks"}
            </p>
          </div>
        </div>
        <Link
          href="/signals"
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          View all <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>

      {visibleSignals === null ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">Signals are unavailable.</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Your source records are unchanged. Try again after the dashboard
            refreshes.
          </p>
        </div>
      ) : visibleSignals.length === 0 ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">Nothing needs attention.</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            ATLAS will surface a signal only when the underlying data shows a
            meaningful change.
          </p>
        </div>
      ) : (
        <div className="border-border mt-3 overflow-hidden rounded-xl border">
          <SignalList signals={visibleSignals} compact />
        </div>
      )}
    </section>
  );
}
