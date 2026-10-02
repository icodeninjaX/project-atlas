import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import { signalCategories, type Signal } from "@/lib/signals/engine";
import {
  severityLabels,
  severityOrder,
  signalActionLabels,
  summarizeSignals,
  type SignalFilters,
  type SignalsTone,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { MaybeSensitive } from "./signal-card";
import { SignalRadar } from "./signal-radar";
import { categoryTone, severityTones } from "./signal-tone";

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

const tileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl p-3.5 ring-1 min-[360px]:p-4";

function StatusPill({
  tone,
  children,
}: {
  tone: SignalsTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "destructive" &&
          "bg-destructive/10 text-destructive ring-destructive/25",
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

/** A wash of light from the top, two soft glows, and a faint grid. */
function HeroLight() {
  return (
    <>
      <div
        aria-hidden="true"
        className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-sky-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
    </>
  );
}

function HeroShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="signals-summary-heading"
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

function HeroHeading({
  status,
}: {
  status: { tone: SignalsTone; label: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2
        id="signals-summary-heading"
        className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
      >
        Pulse
      </h2>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </div>
  );
}

/** Signals by severity as one bar, each severity named beneath with its count. */
function SeverityMix({
  counts,
}: {
  counts: ReturnType<typeof summarizeSignals>["counts"];
}) {
  const filled = severityOrder.filter((severity) => counts[severity] > 0);
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>By severity</p>
      <div
        aria-hidden="true"
        className="bg-muted/70 ring-border/60 flex h-2.5 overflow-hidden rounded-full ring-1"
      >
        <div className={cn("flex w-full gap-1", todayStyles.fill)}>
          {filled.map((severity) => (
            <span
              key={severity}
              style={{ flexGrow: counts[severity] }}
              className={cn(
                "h-full min-w-2 basis-0 rounded-full",
                severityTones[severity].dot,
              )}
            />
          ))}
        </div>
      </div>
      <ul
        aria-label="Signals by severity"
        className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5 @[34rem]:grid-cols-4"
      >
        {severityOrder.map((severity) => (
          <li key={severity} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                severityTones[severity].dot,
                counts[severity] === 0 && "opacity-30",
              )}
            />
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {severityLabels[severity]}
            </span>
            <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
              {counts[severity]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The most urgent signal, with the way to act on it. */
function StartHere({ signal }: { signal: Signal }) {
  const tone = severityTones[signal.severity];
  const AreaIcon = categoryTone(signal.category).icon;
  return (
    <div className={tileClass}>
      <p className={eyebrowClass}>Start here</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl ring-1",
              tone.soft,
              tone.text,
              tone.ring,
            )}
          >
            <AreaIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-5 font-semibold break-words">
              {signal.title}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
              <MaybeSensitive signal={signal}>{signal.message}</MaybeSensitive>
            </p>
          </div>
        </div>
        <Link
          href={signal.href as Route}
          className="bg-card text-foreground ring-border/80 hover:bg-muted focus-visible:ring-ring ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-[0_1px_2px_rgb(7_10_15/0.08)] ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          {signalActionLabels[signal.type]}
          <span className="sr-only">: {signal.title}</span>
          <ArrowRight aria-hidden="true" className="text-primary size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * The Signals lead: how many need attention, what and where in a sentence,
 * the mix by severity, the one to start with, and every signal on a radar.
 * It always covers every signal; the radar marks the filtered view.
 */
export function SignalsHero({
  signals,
  filters,
}: {
  signals: readonly Signal[];
  filters: SignalFilters;
}) {
  const summary = summarizeSignals(signals);

  return (
    <HeroShell>
      <HeroHeading status={summary.status} />

      {/*
        Phones put a small radar beside the figure and drop it where it
        would crowd (the narrowest screens, or very large text); from 44rem
        it fills a column beside everything else.
      */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-4 @max-[19rem]:grid-cols-1 @[26rem]:grid-cols-[minmax(0,1fr)_8rem] @[44rem]:grid-cols-[minmax(0,1fr)_15rem] @[44rem]:gap-x-10 @[56rem]:grid-cols-[minmax(0,1fr)_17.5rem] @[56rem]:gap-x-14">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 self-center">
          <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
            {summary.headline.value}
          </span>
          <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
            {summary.headline.label}
          </span>
        </p>

        <SignalRadar
          signals={signals}
          filters={filters}
          className="col-start-2 row-start-1 w-full self-center @max-[19rem]:hidden @[44rem]:row-span-4"
          labelClassName="hidden @[44rem]:inline"
        />

        <p className="text-muted-foreground col-span-2 mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem] @max-[19rem]:col-span-1 @[44rem]:col-span-1">
          {summary.sentence}
        </p>

        <div className="col-span-2 mt-6 min-w-0 @max-[19rem]:col-span-1 @[44rem]:col-span-1 @[44rem]:mt-7">
          <SeverityMix counts={summary.counts} />
        </div>

        {summary.lead ? (
          <div className="col-span-2 mt-6 min-w-0 @max-[19rem]:col-span-1 @[44rem]:col-span-1 @[44rem]:mt-7">
            <StartHere signal={summary.lead} />
          </div>
        ) : null}
      </div>
    </HeroShell>
  );
}

/** What each area's signals watch for, in a phrase. */
const watchedFor: Record<(typeof signalCategories)[number], string> = {
  Money: "Spending jumps, category spikes, and budget limits",
  Debt: "Payment due dates and payoff progress",
  Tasks: "Overdue growth, crowded days, and strong weeks",
  Career: "Follow-ups, response rate, and momentum",
  Goals: "Deadlines, milestones, and goals gone quiet",
};

/** The hero when nothing was found: what ATLAS watches, and where. */
export function SignalsEmptyHero() {
  return (
    <HeroShell>
      <HeroHeading status={{ tone: "positive", label: "All clear" }} />
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-4 @max-[19rem]:grid-cols-1 @[26rem]:grid-cols-[minmax(0,1fr)_8rem] @[44rem]:grid-cols-[minmax(0,1fr)_13rem] @[44rem]:gap-x-10">
        <p className="min-w-0 self-center text-[1.75rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2.125rem]">
          Nothing needs attention
        </p>
        <SignalRadar
          signals={[]}
          filters={{ category: null, severity: null }}
          className="col-start-2 row-start-1 w-full self-center @max-[19rem]:hidden @[44rem]:row-span-2"
          labelClassName="hidden @[44rem]:inline"
        />
        <p className="text-muted-foreground col-span-2 mt-3 max-w-xl text-sm leading-6 @max-[19rem]:col-span-1 @[44rem]:col-span-1">
          ATLAS raises a signal only when your records show a meaningful change.
          This can mean nothing unusual was detected, or there is not yet enough
          history for a reliable comparison.
        </p>
      </div>

      <h3 className={cn(eyebrowClass, "mt-8")}>What ATLAS watches</h3>
      <ul
        aria-label="What ATLAS watches"
        className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3"
      >
        {signalCategories.map((category) => {
          const { icon: Icon, href } = categoryTone(category);
          return (
            <li key={category} className="min-w-0">
              <Link
                href={href as Route}
                className="bg-background/55 ring-border/70 hover:bg-background/80 hover:ring-border focus-visible:ring-ring flex min-h-11 min-w-0 items-center gap-3 rounded-2xl p-3 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary/10 text-primary ring-primary/20 grid size-9 shrink-0 place-items-center rounded-xl ring-1"
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-5 font-semibold">
                    {category}
                  </span>
                  <span className="text-muted-foreground block text-xs leading-4">
                    {watchedFor[category]}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </HeroShell>
  );
}
