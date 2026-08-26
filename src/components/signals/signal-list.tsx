import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { Signal, SignalSeverity } from "@/lib/signals/engine";
import { cn } from "@/lib/utils";

const severityPresentation: Record<
  SignalSeverity,
  {
    label: string;
    badgeClass: string;
  }
> = {
  info: {
    label: "Information",
    badgeClass: "border-primary/25 bg-primary/10 text-primary",
  },
  positive: {
    label: "Positive",
    badgeClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    label: "Warning",
    badgeClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  critical: {
    label: "Critical",
    badgeClass: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

const compactMetricLabels: Record<string, string> = {
  "Recent monthly average": "Monthly avg.",
  "Recent average": "Recent avg.",
  "Reduced this month": "Reduced",
  "Remaining now": "Remaining",
  "Remaining balance": "Balance",
  "Overdue now": "Overdue",
  "Same time last week": "Last week",
  "Due or overdue": "Due",
  "Completed this week": "This week",
  "Previous best": "Best",
  "Progressed this month": "This month",
  "Applications submitted": "Applications",
  "Reached interview": "Interviews",
  "Follow-ups due": "Follow-ups",
  "Without movement": "No movement",
  "Milestones completed": "Milestones",
};

function displayMetricLabel(label: string, compact: boolean): string {
  return compact ? (compactMetricLabels[label] ?? label) : label;
}

function MaybeSensitive({
  signal,
  children,
}: {
  signal: Signal;
  children: React.ReactNode;
}) {
  return signal.sensitive ? (
    <SensitiveValue>{children}</SensitiveValue>
  ) : (
    children
  );
}

function SignalContent({
  signal,
  compact,
}: {
  signal: Signal;
  compact: boolean;
}) {
  const presentation = severityPresentation[signal.severity];
  const hasBothMetrics = Boolean(signal.metric && signal.comparison);

  return (
    <div className={cn(compact ? "p-3 sm:p-5" : "p-3.5 sm:p-5")}>
      <div className="min-w-0">
        <div>
          <p className="text-sm leading-5 font-semibold">{signal.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-4 sm:leading-5">
            <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
          </p>
        </div>

        <dl
          className={cn(
            "border-border/70 bg-muted/40 mt-2.5 grid gap-2 rounded-xl border px-2.5 py-2 sm:mt-3 sm:gap-3 sm:px-3 sm:py-2.5",
            hasBothMetrics
              ? "grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)]"
              : "grid-cols-[4.5rem_minmax(0,1fr)]",
          )}
        >
          <div className="min-w-0">
            <dt className="text-muted-foreground truncate text-[10px] leading-none font-medium sm:text-[11px]">
              Status
            </dt>
            <dd className="mt-1">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap sm:text-[11px]",
                  presentation.badgeClass,
                )}
              >
                {presentation.label}
              </span>
            </dd>
          </div>
          {signal.metric && (
            <div className="min-w-0">
              <dt
                aria-label={signal.metric.label}
                className="text-muted-foreground truncate text-[10px] leading-none font-medium sm:text-[11px]"
                title={signal.metric.label}
              >
                {displayMetricLabel(signal.metric.label, compact)}
              </dt>
              <dd className="mt-1 truncate font-mono text-xs font-semibold">
                <MaybeSensitive signal={signal}>
                  {signal.metric.value}
                </MaybeSensitive>
              </dd>
            </div>
          )}
          {signal.comparison && (
            <div className="min-w-0">
              <dt
                aria-label={signal.comparison.label}
                className="text-muted-foreground truncate text-[10px] leading-none font-medium sm:text-[11px]"
                title={signal.comparison.label}
              >
                {displayMetricLabel(signal.comparison.label, compact)}
              </dt>
              <dd className="mt-1 truncate font-mono text-xs font-semibold">
                <MaybeSensitive signal={signal}>
                  {signal.comparison.value}
                </MaybeSensitive>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-2 gap-y-1 sm:mt-3 sm:gap-3">
          <details className="group min-w-0 flex-1">
            <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring w-fit cursor-pointer rounded-md text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none">
              Why am I seeing this?
            </summary>
            <p className="text-muted-foreground mt-2 max-w-2xl text-xs leading-5">
              <MaybeSensitive signal={signal}>{signal.reason}</MaybeSensitive>
            </p>
          </details>
          <Link
            href={signal.href as Route}
            className="text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            View {signal.category.toLowerCase()}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SignalList({
  signals,
  compact = false,
}: {
  signals: Signal[];
  compact?: boolean;
}) {
  return (
    <ol
      aria-label="Signals"
      className={compact ? "divide-border divide-y" : "space-y-3"}
    >
      {signals.map((signal) => (
        <li key={signal.id}>
          {compact ? (
            <SignalContent signal={signal} compact />
          ) : (
            <Card>
              <CardContent className="p-0">
                <SignalContent signal={signal} compact={false} />
              </CardContent>
            </Card>
          )}
        </li>
      ))}
    </ol>
  );
}
