import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
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
    icon: LucideIcon;
    iconClass: string;
    badgeClass: string;
  }
> = {
  info: {
    label: "Information",
    icon: Info,
    iconClass: "bg-primary/10 text-primary",
    badgeClass: "border-primary/25 bg-primary/10 text-primary",
  },
  positive: {
    label: "Positive",
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badgeClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    label: "Warning",
    icon: TriangleAlert,
    iconClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badgeClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  critical: {
    label: "Critical",
    icon: CircleAlert,
    iconClass: "bg-destructive/10 text-destructive",
    badgeClass: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

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
  const Icon = presentation.icon;

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3",
        compact ? "p-4 sm:p-5" : "p-4 sm:p-5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          presentation.iconClass,
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{signal.title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              presentation.badgeClass,
            )}
          >
            {presentation.label}
          </span>
        </div>

        {(signal.metric || signal.comparison) && (
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {signal.metric && (
              <div>
                <dt className="text-muted-foreground text-[10px]">
                  {signal.metric.label}
                </dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold">
                  <MaybeSensitive signal={signal}>
                    {signal.metric.value}
                  </MaybeSensitive>
                </dd>
              </div>
            )}
            {signal.comparison && (
              <div>
                <dt className="text-muted-foreground text-[10px]">
                  {signal.comparison.label}
                </dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold">
                  <MaybeSensitive signal={signal}>
                    {signal.comparison.value}
                  </MaybeSensitive>
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
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
            className="text-primary focus-visible:ring-ring inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
