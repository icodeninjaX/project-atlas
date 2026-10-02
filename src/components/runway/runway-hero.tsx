import { ArrowDown, CircleAlert, SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { MoneyAmount } from "@/components/money/money-amount";
import { RunwayTrack } from "@/components/runway/runway-track";
import { Button } from "@/components/ui/button";
import { formatRunwayMonths, type RunwayAnalysis } from "@/lib/runway/engine";
import {
  dailyCentavos,
  formatMonthCount,
  runwayEndLabel,
  runwayFigure,
  runwayStatus,
  trackMonths,
  type RunwayTone,
} from "@/lib/runway/view";
import { cn } from "@/lib/utils";

type PillTone = RunwayTone | "neutral";

function RunwayPill({
  tone,
  children,
}: {
  tone: PillTone;
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
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
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

/** The hero's backdrop: a wash of light from the top and two soft glows. */
function HeroLight({ tone }: { tone: PillTone }) {
  const warm = tone === "destructive";
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent",
          warm ? "from-destructive/12" : "from-primary/14",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl",
          warm ? "bg-destructive/15" : "bg-primary/20",
        )}
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

function HeroShell({
  tone,
  children,
}: {
  tone: PillTone;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="runway-heading"
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-8 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:rounded-[2rem]",
      )}
    >
      <HeroLight tone={tone} />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "positive" | "destructive";
}) {
  return (
    // Phones show plain figures; tiles from `sm`, where there is room.
    <div className="sm:bg-background/55 sm:ring-border/80 min-w-0 sm:rounded-2xl sm:p-4 sm:ring-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-mono text-lg leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]",
          tone === "positive" && "text-positive",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {note ? (
        <dd className="text-muted-foreground mt-1 text-xs leading-4">{note}</dd>
      ) : null}
    </div>
  );
}

function coverageSentence(analysis: RunwayAnalysis, today: string): ReactNode {
  const months = analysis.runwayMonths ?? 0;
  if (analysis.availableLiquidCentavos === 0) {
    return "The accounts you chose hold nothing to draw on, so essentials are not covered.";
  }
  const end = runwayEndLabel(today, months);
  if (!end) {
    return "Your chosen funds cover essentials and debt minimums for more than eight years, with no new income.";
  }
  return (
    <>
      Your chosen funds cover essentials and debt minimums until about{" "}
      <span className="text-foreground font-semibold">{end}</span>, with no new
      income.
    </>
  );
}

function targetSentence(analysis: RunwayAnalysis): ReactNode {
  const months = analysis.runwayMonths ?? 0;
  const target = analysis.targetMonths;
  const reserve = `${target}-month reserve`;
  if (months >= 99) return `Your ${reserve} is covered many times over.`;
  if (months >= target) {
    const spare = months - target;
    return spare < 0.05 ? (
      `Your ${reserve} is just covered.`
    ) : (
      <>
        Your {reserve} is covered, with{" "}
        <span className="text-foreground font-semibold">
          {formatMonthCount(spare)}
        </span>{" "}
        to spare.
      </>
    );
  }
  const short = target - months;
  return (
    <>
      {short < 0.05 ? (
        `Just short of your ${reserve}.`
      ) : (
        <>
          <span className="text-foreground font-semibold">
            {formatMonthCount(short)}
          </span>{" "}
          short of your {reserve}.
        </>
      )}{" "}
      <MoneyAmount
        centavos={analysis.targetGapCentavos}
        className="text-foreground font-mono font-semibold"
      />{" "}
      more would close it.
    </>
  );
}

/** The runway page lead: how long the money lasts, and against what. */
export function RunwayHero({
  analysis,
  today,
  onEditAssumptions,
}: {
  analysis: RunwayAnalysis;
  /** YYYY-MM-DD in Manila. */
  today: string;
  onEditAssumptions: () => void;
}) {
  const months = analysis.runwayMonths ?? 0;
  const status = runwayStatus(months, analysis.targetMonths);
  const figure = runwayFigure(analysis.runwayMonths);
  const accountCount = analysis.selectedAccounts.length;
  const reserveShort = analysis.targetGapCentavos > 0;
  const flow = analysis.monthlyFreeCashFlowCentavos;

  return (
    <HeroShell tone={status.tone}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="runway-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Estimated runway
        </h2>
        <RunwayPill tone={status.tone}>{status.label}</RunwayPill>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="sr-only">
              {formatRunwayMonths(analysis.runwayMonths)}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent",
                status.tone === "destructive"
                  ? "from-destructive to-destructive/80"
                  : "from-foreground via-foreground to-foreground/55",
              )}
            >
              {figure.value}
            </span>
            <span
              aria-hidden="true"
              className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl"
            >
              {figure.unit}
            </span>
          </p>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {coverageSentence(analysis, today)}
          </p>

          <RunwayTrack
            className="mt-6"
            runwayMonths={months}
            targetMonths={analysis.targetMonths}
            months={trackMonths(months, analysis.targetMonths)}
            tone={status.tone}
            today={today}
          />
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            {targetSentence(analysis)}
          </p>

          <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
            <Button asChild>
              <a href="#scenario">
                <ArrowDown className="size-4" aria-hidden="true" />
                Try a scenario
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onEditAssumptions}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Edit assumptions
            </Button>
          </div>
        </div>

        <dl className="max-sm:border-border grid grid-cols-2 gap-x-6 gap-y-5 max-sm:border-t max-sm:pt-5 sm:gap-3 @max-[17rem]:grid-cols-1">
          <Stat
            label="Runway funds"
            value={<MoneyAmount centavos={analysis.availableLiquidCentavos} />}
            note={
              analysis.netLiquidCentavos < 0 ? (
                <>
                  Net{" "}
                  <MoneyAmount
                    centavos={analysis.netLiquidCentavos}
                    className="font-mono"
                  />
                  , counted as zero
                </>
              ) : accountCount === 1 ? (
                "From 1 account"
              ) : (
                `From ${accountCount} accounts`
              )
            }
          />
          <Stat
            label="Monthly need"
            value={<MoneyAmount centavos={analysis.monthlyNeedCentavos} />}
            note={
              <>
                About{" "}
                <MoneyAmount
                  centavos={dailyCentavos(analysis.monthlyNeedCentavos)}
                  className="font-mono"
                />{" "}
                a day
              </>
            }
          />
          <Stat
            label="Free cash flow"
            value={<MoneyAmount centavos={flow} sign="always" />}
            tone={flow > 0 ? "positive" : flow < 0 ? "destructive" : undefined}
            note={
              analysis.incomeSource === "none" ? (
                "No income recorded"
              ) : (
                <>
                  A month, after{" "}
                  <MoneyAmount
                    centavos={analysis.monthlyIncomeCentavos}
                    className="font-mono"
                  />{" "}
                  income
                </>
              )
            }
          />
          <Stat
            label={`${analysis.targetMonths}-month reserve`}
            value={<MoneyAmount centavos={analysis.targetReserveCentavos} />}
            note={
              reserveShort ? (
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  <MoneyAmount
                    centavos={analysis.targetGapCentavos}
                    className="font-mono"
                  />{" "}
                  still to save
                </span>
              ) : (
                <>
                  Covered,{" "}
                  <MoneyAmount
                    centavos={-analysis.targetGapCentavos}
                    className="font-mono"
                  />{" "}
                  beyond it
                </>
              )
            }
          />
        </dl>
      </div>
    </HeroShell>
  );
}

type Guidance = {
  title: string;
  body: string;
  primary: { label: string; href?: Route };
  secondary?: { label: string; href: Route };
};

function guidanceFor(
  status: Exclude<RunwayAnalysis["status"], "ready">,
  hasAccounts: boolean,
): Guidance {
  switch (status) {
    case "missing_liquid_accounts":
      return hasAccounts
        ? {
            title: "Choose the funds to count",
            body: "Runway starts from the cash, bank, e-wallet, or savings accounts you could draw on for essentials. Pick at least one.",
            primary: { label: "Choose accounts" },
            secondary: { label: "Open accounts", href: "/money/accounts" },
          }
        : {
            title: "Add an account to start",
            body: "Runway needs at least one active cash, bank, e-wallet, or savings account to start from.",
            primary: { label: "Add an account", href: "/money/accounts" },
          };
    case "missing_essential_categories":
      return {
        title: "Choose essential expenses",
        body: "Select the expense categories that represent the costs you must keep paying, like rent, food, and utilities.",
        primary: { label: "Choose essentials" },
      };
    case "insufficient_data":
      return {
        title: "Add history or a budget",
        body: "Record income or expenses in at least two completed Manila months, or plan a budget that includes your essential categories.",
        primary: { label: "Open budget", href: "/money/budget" },
        secondary: {
          label: "Record a transaction",
          href: "/money/transactions?create=true" as Route,
        },
      };
    case "zero_monthly_need":
      return {
        title: "Monthly need is zero",
        body: "Runway is unavailable instead of infinite. Add essential costs or review the active debt minimums used here.",
        primary: { label: "Review assumptions" },
      };
  }
}

/** The hero when there is no estimate yet: what is missing and the fix. */
export function RunwaySetupHero({
  status,
  hasAccounts,
  onEditAssumptions,
}: {
  status: Exclude<RunwayAnalysis["status"], "ready">;
  hasAccounts: boolean;
  onEditAssumptions: () => void;
}) {
  const guidance = guidanceFor(status, hasAccounts);
  const { primary, secondary } = guidance;

  return (
    <HeroShell tone="neutral">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="runway-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Estimated runway
        </h2>
        <RunwayPill tone="neutral">Needs setup</RunwayPill>
      </div>
      <div className="mt-6 flex max-w-xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-[359px]:hidden">
          <CircleAlert aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            {guidance.title}
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {guidance.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
            {primary.href ? (
              <Button asChild>
                <Link href={primary.href}>{primary.label}</Link>
              </Button>
            ) : (
              <Button type="button" onClick={onEditAssumptions}>
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {primary.label}
              </Button>
            )}
            {secondary ? (
              <Button asChild variant="secondary">
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </HeroShell>
  );
}
