import type { Route } from "next";
import Link from "next/link";
import type { Signal } from "@/lib/signals/engine";
import { isAttentionSeverity, severityLabels } from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { MaybeSensitive } from "./signal-card";
import { severityTones } from "./signal-tone";

/** One row of the dashboard's Signals card. */
function CompactSignal({ signal }: { signal: Signal }) {
  const tone = severityTones[signal.severity];
  const SeverityIcon = tone.icon;
  const urgent = isAttentionSeverity(signal.severity);

  return (
    <Link
      href={signal.href as Route}
      className="hover:bg-muted/45 focus-visible:ring-ring relative flex min-w-0 flex-col px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-4"
    >
      {urgent ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-3 left-0 w-[3px] rounded-r-full",
            tone.edge,
          )}
        />
      ) : null}
      <div className="flex min-w-0 items-center gap-2">
        <span
          role="img"
          aria-label={severityLabels[signal.severity]}
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center",
            signal.severity === "info" ? "text-muted-foreground" : tone.text,
          )}
        >
          <SeverityIcon aria-hidden="true" className="size-3.5" />
        </span>
        <p
          className={cn(
            "min-w-0 text-sm leading-5 font-medium break-words",
            urgent && "font-semibold",
          )}
        >
          {signal.title}
        </p>
      </div>
      <div className="mt-1 min-w-0 pl-6">
        <p className="text-muted-foreground min-w-0 text-xs leading-5 break-words">
          <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
        </p>
        <span className="text-primary mt-2 inline-flex min-h-11 items-center text-xs font-semibold">
          View {signal.category.toLowerCase()}
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
  // The Signals page's section names: Progress, Updates, or both.
  const hasProgress = quieterSignals.some(
    ({ severity }) => severity === "positive",
  );
  const hasUpdates = quieterSignals.some(({ severity }) => severity === "info");
  const quieterLabel =
    hasProgress && hasUpdates
      ? "Progress and updates"
      : hasProgress
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
          <p className="bg-muted/35 text-muted-foreground px-3 py-2 text-[0.8125rem] leading-4 font-semibold sm:px-4">
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
