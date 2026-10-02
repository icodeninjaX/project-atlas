import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ScanSearch,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import type { Signal } from "@/lib/signals/engine";
import {
  isAttentionSeverity,
  severityLabels,
  signalActionLabels,
  signalAnchor,
  signalVisual,
  type SignalVisual,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { SensitiveVisual } from "./sensitive-visual";
import { categoryTone, severityTones } from "./signal-tone";

export function MaybeSensitive({
  signal,
  children,
}: {
  signal: Signal;
  children: ReactNode;
}) {
  return signal.sensitive ? (
    <SensitiveValue>{children}</SensitiveValue>
  ) : (
    children
  );
}

const panelClass =
  "bg-background/55 ring-border/80 @container min-w-0 rounded-2xl p-3.5 ring-1 sm:p-4";

const valueClass =
  "font-mono font-semibold tracking-[-0.02em] tabular-nums [overflow-wrap:anywhere]";

/** Now against its baseline: a bar for each, and the change between them. */
function VersusFacts({
  signal,
  visual,
}: {
  signal: Signal;
  visual: Extract<SignalVisual, { kind: "versus" }>;
}) {
  const tone = severityTones[signal.severity];
  const largest = Math.max(visual.current, visual.baseline);
  const ChangeIcon =
    visual.direction === "down" ? ArrowDownRight : ArrowUpRight;
  const rows = [
    {
      key: "metric",
      fact: signal.metric!,
      amount: visual.current,
      bar: tone.dot,
      strong: true,
    },
    {
      key: "comparison",
      fact: signal.comparison!,
      amount: visual.baseline,
      bar: "bg-foreground/25",
      strong: false,
    },
  ];

  return (
    <div className={panelClass}>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5"
          >
            <dt className="text-muted-foreground min-w-0 text-xs leading-4 break-words">
              {row.fact.label}
            </dt>
            <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
              {row.strong && visual.direction !== "flat" ? (
                <SensitiveVisual sensitive={signal.sensitive}>
                  {/* The figures beside it say the same; this restates it. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-mono text-[0.6875rem] font-semibold ring-1",
                      tone.soft,
                      tone.text,
                      tone.ring,
                    )}
                  >
                    <ChangeIcon className="size-3" />
                    {visual.change}
                  </span>
                </SensitiveVisual>
              ) : null}
              <span
                className={cn(
                  valueClass,
                  row.strong
                    ? "text-base sm:text-lg"
                    : "text-muted-foreground text-sm",
                )}
              >
                <MaybeSensitive signal={signal}>
                  {row.fact.value}
                </MaybeSensitive>
              </span>
            </dd>
            <dd
              aria-hidden="true"
              className="bg-muted col-span-2 h-1.5 overflow-hidden rounded-full"
            >
              <SensitiveVisual sensitive={signal.sensitive}>
                {largest > 0 && row.amount > 0 ? (
                  <span
                    style={{
                      width: `${Math.max(3, (row.amount / largest) * 100)}%`,
                    }}
                    className={cn(
                      "block h-full rounded-full",
                      row.bar,
                      todayStyles.fill,
                    )}
                  />
                ) : null}
              </SensitiveVisual>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The figures side by side, with a meter when they make a share. */
function TileFacts({
  signal,
  visual,
}: {
  signal: Signal;
  visual: Extract<SignalVisual, { kind: "share" }> | null;
}) {
  const tone = severityTones[signal.severity];
  const facts = [
    signal.metric ? { key: "metric", fact: signal.metric, strong: true } : null,
    signal.comparison
      ? { key: "comparison", fact: signal.comparison, strong: false }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <div className={panelClass}>
      <dl
        className={cn(
          "grid grid-cols-1 gap-x-4 gap-y-3",
          facts.length > 1 && "@[17rem]:grid-cols-2",
        )}
      >
        {facts.map(({ key, fact, strong }) => (
          <div key={key} className="min-w-0">
            <dt className="text-muted-foreground text-xs leading-4 break-words">
              {fact.label}
            </dt>
            <dd
              className={cn(
                valueClass,
                "mt-1",
                strong ? "text-lg leading-6 sm:text-xl" : "text-sm leading-6",
              )}
            >
              <MaybeSensitive signal={signal}>{fact.value}</MaybeSensitive>
            </dd>
          </div>
        ))}
      </dl>
      {visual ? (
        <SensitiveVisual sensitive={signal.sensitive}>
          <div
            aria-hidden="true"
            className="bg-muted mt-3.5 h-2 overflow-hidden rounded-full"
          >
            {visual.share > 0 ? (
              <span
                style={{ width: `${Math.max(2, visual.share * 100)}%` }}
                className={cn(
                  "block h-full rounded-full",
                  tone.dot,
                  todayStyles.fill,
                )}
              />
            ) : null}
          </div>
          {visual.caption ? (
            <p className="text-muted-foreground mt-2 text-xs leading-4">
              {visual.caption}
            </p>
          ) : null}
        </SensitiveVisual>
      ) : null}
    </div>
  );
}

function SignalFacts({ signal }: { signal: Signal }) {
  const visual = signalVisual(signal);
  return visual?.kind === "versus" ? (
    <VersusFacts signal={signal} visual={visual} />
  ) : (
    <TileFacts signal={signal} visual={visual} />
  );
}

/**
 * One signal: its area and severity, what changed, the figures behind it
 * (charted where they make a comparison or a share), why ATLAS raised it,
 * and where to act on it.
 */
export function SignalCard({ signal }: { signal: Signal }) {
  const tone = severityTones[signal.severity];
  const SeverityIcon = tone.icon;
  const AreaIcon = categoryTone(signal.category).icon;
  const anchor = signalAnchor(signal.id);
  const urgent = isAttentionSeverity(signal.severity);
  const hasFacts = Boolean(signal.metric || signal.comparison);

  return (
    <article
      id={anchor}
      aria-labelledby={`${anchor}-title`}
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card/90 target:ring-primary/45 @container relative isolate min-w-0 scroll-mt-24 overflow-hidden rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] target:ring-2",
      )}
    >
      {urgent ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-5 left-0 w-[3px] rounded-r-full",
              tone.edge,
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 -z-10 w-2/3 bg-gradient-to-r to-transparent",
              signal.severity === "critical"
                ? "from-destructive/[0.07]"
                : "from-amber-500/[0.06]",
            )}
          />
        </>
      ) : null}

      {/*
        Narrow cards stack everything under the heading; from 30rem the body
        lines up with the title; from 46rem the figures take a column of
        their own beside the words.
      */}
      <div
        className={cn(
          "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3.5 p-4 min-[360px]:p-5 @[30rem]:grid-cols-[2.75rem_minmax(0,1fr)] @[30rem]:gap-x-4 @[30rem]:p-6",
          hasFacts &&
            "@[46rem]:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,17rem)] @[46rem]:gap-x-6",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-10 place-items-center rounded-xl ring-1 @[30rem]:size-11",
            tone.soft,
            tone.text,
            tone.ring,
          )}
        >
          <AreaIcon className="size-[1.125rem]" />
        </span>
        <div className="min-w-0 self-center">
          <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] leading-5 font-semibold tracking-[0.08em] uppercase">
            <span className="text-muted-foreground">{signal.category}</span>
            <span
              aria-hidden="true"
              className="bg-muted-foreground/50 size-0.5 rounded-full"
            />
            <span className={cn("inline-flex items-center gap-1", tone.text)}>
              <SeverityIcon aria-hidden="true" className="size-3.5" />
              {severityLabels[signal.severity]}
            </span>
          </p>
          <h3
            id={`${anchor}-title`}
            className="mt-0.5 text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words @[30rem]:text-base"
          >
            {signal.title}
          </h3>
        </div>

        <p className="text-muted-foreground col-span-2 mt-2 min-w-0 text-[0.8125rem] leading-5 break-words @[30rem]:col-span-1 @[30rem]:col-start-2 @[30rem]:mt-1 @[30rem]:text-sm @[30rem]:leading-6">
          <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
        </p>

        {hasFacts ? (
          <div className="col-span-2 mt-4 min-w-0 @[30rem]:col-span-1 @[30rem]:col-start-2 @[46rem]:col-start-3 @[46rem]:row-span-3 @[46rem]:row-start-1 @[46rem]:mt-0 @[46rem]:self-center">
            <SignalFacts signal={signal} />
          </div>
        ) : null}

        <div className="border-border/70 col-span-2 mt-4 flex min-w-0 flex-wrap items-start justify-between gap-x-3 border-t pt-1.5 @[30rem]:col-span-1 @[30rem]:col-start-2 @[46rem]:self-end">
          <details className="group/why min-w-0 flex-1 basis-52">
            <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-2 flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 [&::-webkit-details-marker]:hidden">
              <ScanSearch aria-hidden="true" className="size-3.5" />
              Why am I seeing this?
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-open/why:rotate-180"
              />
            </summary>
            <p className="bg-muted/45 ring-border/60 text-muted-foreground mt-1 mb-2.5 max-w-2xl rounded-xl px-3.5 py-3 text-xs leading-5 ring-1">
              <MaybeSensitive signal={signal}>{signal.reason}</MaybeSensitive>
            </p>
          </details>
          <Link
            href={signal.href as Route}
            className="text-primary hover:bg-primary/10 focus-visible:ring-ring group/act -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
          >
            {signalActionLabels[signal.type]}
            <span className="sr-only">: {signal.title}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover/act:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
