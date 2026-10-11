import { CircleCheck, Radar } from "lucide-react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { SignalList } from "@/components/signals/signal-list";
import type { Signal } from "@/lib/signals/engine";
import { cn } from "@/lib/utils";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "signal" : "signals"}`;
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
      className={cn(dashboardCardClass, "flex flex-col", className)}
    >
      <DashboardCardHeading
        id="dashboard-signals"
        icon={Radar}
        title="Signals"
        tone={importantCount > 0 ? "attention" : "default"}
        description={
          visibleSignals
            ? importantCount > 0
              ? `${importantCount} need attention`
              : countLabel(visibleSignals.length)
            : "Current changes and risks"
        }
        action={{ href: "/signals", label: "View all" }}
      />

      {visibleSignals === null ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">Signals are unavailable</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Your source records are unchanged. Try again after the dashboard
            refreshes.
          </p>
        </div>
      ) : visibleSignals.length === 0 ? (
        // Centered, so a card stretched beside Financial position reads as
        // calm rather than unfinished.
        <div className="mt-5 flex flex-1 flex-col items-center justify-center py-6 text-center">
          <span className="bg-muted/60 text-positive grid size-9 place-items-center rounded-lg">
            <CircleCheck aria-hidden="true" className="size-4" />
          </span>
          <p className="mt-3 text-sm font-semibold">Nothing needs attention</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-5">
            ATLAS will surface a signal only when the underlying data shows a
            meaningful change.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl">
          <SignalList signals={visibleSignals} />
        </div>
      )}
    </section>
  );
}
