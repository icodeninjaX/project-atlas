import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { Signal, SignalSeverity } from "@/lib/signals/engine";
import { cn } from "@/lib/utils";
import { MaybeSensitive } from "./signal-card";

const severityLabel: Record<SignalSeverity, string> = {
  info: "Information",
  positive: "Positive",
  warning: "Warning",
  critical: "Critical",
};

const severityIcon: Record<SignalSeverity, LucideIcon> = {
  critical: CircleAlert,
  warning: TriangleAlert,
  positive: CircleCheck,
  info: Info,
};

/** One row of the dashboard's Signals card. */
function CompactSignal({ signal }: { signal: Signal }) {
  const SeverityIcon = severityIcon[signal.severity];

  return (
    <Link
      href={signal.href as Route}
      className={cn(
        "hover:bg-muted/45 focus-visible:ring-ring group flex min-w-0 flex-col px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-4",
        signal.severity === "critical" &&
          "border-destructive bg-destructive/[0.035] border-l-2",
        signal.severity === "warning" && "border-l-2 border-l-amber-500/70",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          role="img"
          aria-label={severityLabel[signal.severity]}
          className={cn(
            "text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center",
            signal.severity === "critical" && "text-destructive",
            signal.severity === "warning" &&
              "text-amber-700 dark:text-amber-300",
            signal.severity === "positive" &&
              "text-emerald-700 dark:text-emerald-300",
          )}
        >
          <SeverityIcon aria-hidden="true" className="size-3.5" />
        </span>
        <p
          className={cn(
            "min-w-0 text-sm leading-5 font-medium break-words",
            (signal.severity === "critical" || signal.severity === "warning") &&
              "font-semibold",
          )}
        >
          {signal.title}
        </p>
      </div>
      <div className="mt-1 min-w-0 pl-6">
        <p className="text-muted-foreground min-w-0 text-xs leading-5 break-words">
          <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
        </p>
        <span className="text-primary mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold">
          View {signal.category.toLowerCase()}
          <ArrowRight aria-hidden="true" className="size-3" />
        </span>
      </div>
    </Link>
  );
}

/**
 * The dashboard's Signals list: what needs attention first, then quieter
 * progress or updates under their own label. The Signals page uses
 * SignalCard.
 */
export function SignalList({ signals }: { signals: Signal[] }) {
  const attentionSignals = signals.filter(
    ({ severity }) => severity === "critical" || severity === "warning",
  );
  const quieterSignals = signals.filter(
    ({ severity }) => severity === "info" || severity === "positive",
  );
  const quieterLabel = quieterSignals.some(
    ({ severity }) => severity === "positive",
  )
    ? "Progress"
    : "Updates";

  return (
    <div aria-label="Signals">
      {attentionSignals.length > 0 && (
        <ol aria-label="Needs attention" className="divide-border divide-y">
          {attentionSignals.map((signal) => (
            <li key={signal.id}>
              <CompactSignal signal={signal} />
            </li>
          ))}
        </ol>
      )}
      {quieterSignals.length > 0 && (
        <div
          className={cn(
            attentionSignals.length > 0 && "border-border border-t",
          )}
        >
          <p className="bg-muted/35 text-muted-foreground px-3 py-2 text-xs leading-4 font-semibold tracking-[0.12em] uppercase sm:px-4">
            {quieterLabel}
          </p>
          <ol aria-label={quieterLabel} className="divide-border divide-y">
            {quieterSignals.map((signal) => (
              <li key={signal.id}>
                <CompactSignal signal={signal} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
