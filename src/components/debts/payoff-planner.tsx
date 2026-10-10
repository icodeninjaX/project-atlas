"use client";

import { ArrowRight, Route, Sparkles, X } from "lucide-react";
import { Fragment, useId, type ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { STRATEGY_ICONS } from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import type { DebtRecord, DebtStrategy } from "@/lib/debts/debt";
import {
  STRATEGIES,
  STRATEGY_DETAILS,
  formatPayoffDuration,
  payoffMonthLabel,
  type PayoffPlan,
} from "@/lib/debts/plan";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { cn } from "@/lib/utils";
import styles from "./debts.module.css";

const EXTRA_PRESETS = [500, 1_000, 2_500, 5_000];

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function StrategyOption({
  strategy,
  plan,
  checked,
  best,
  today,
  onSelect,
}: {
  strategy: DebtStrategy;
  plan: PayoffPlan;
  checked: boolean;
  best: boolean;
  today: string;
  onSelect: () => void;
}) {
  const id = useId();
  const Icon = STRATEGY_ICONS[strategy];
  const { label, rule } = STRATEGY_DETAILS[strategy];
  const paidOff = plan.status === "paid_off";

  return (
    <label className="relative min-w-0">
      <input
        type="radio"
        name="payoff-strategy"
        value={strategy}
        checked={checked}
        onChange={onSelect}
        aria-label={label}
        aria-describedby={`${id}-detail`}
        className="peer sr-only"
      />
      <span className="bg-background/55 ring-border/80 hover:bg-muted/60 peer-checked:bg-primary/[0.07] peer-checked:ring-primary peer-focus-visible:ring-ring peer-checked:[&_[data-mark]]:bg-primary-solid peer-checked:[&_[data-mark]]:text-primary-solid-foreground flex h-full cursor-pointer flex-col rounded-2xl p-3.5 ring-1 transition-[background-color,box-shadow] peer-checked:ring-2 peer-focus-visible:ring-2 sm:p-4">
        <span className="flex min-w-0 items-center gap-3">
          <span
            data-mark
            aria-hidden="true"
            className="bg-muted text-foreground/80 grid size-9 shrink-0 place-items-center rounded-xl transition-colors"
          >
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold">{label}</span>
              {best ? (
                <span className="bg-positive/10 text-positive ring-positive/25 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1">
                  <Sparkles aria-hidden="true" className="size-3" />
                  Least interest
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className="text-muted-foreground block text-xs"
            >
              {rule}
            </span>
          </span>
        </span>
        <span id={`${id}-detail`} className="mt-auto flex flex-col">
          <span className="sr-only">{rule}. </span>
          <span className="border-border mt-3 grid grid-cols-2 gap-2 border-t pt-3">
            <span className="min-w-0">
              <span className="text-muted-foreground block text-[0.6875rem]">
                Debt-free
              </span>
              <span
                className={cn(
                  "block font-mono text-sm font-semibold",
                  !paidOff && "text-destructive",
                )}
              >
                {paidOff
                  ? payoffMonthLabel(today, plan.months ?? 0)
                  : "Not yet"}
                <span className="sr-only">,</span>
              </span>
            </span>
            <span className="min-w-0">
              <span className="text-muted-foreground block text-[0.6875rem]">
                Interest
              </span>
              <span className="block font-mono text-sm font-semibold [overflow-wrap:anywhere]">
                {paidOff ? (
                  <MoneyAmount centavos={plan.totalInterestCentavos} />
                ) : (
                  "Keeps growing"
                )}
              </span>
            </span>
          </span>
        </span>
      </span>
    </label>
  );
}

function Row({
  label,
  before,
  after,
}: {
  label: string;
  before?: ReactNode;
  after: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="flex flex-wrap items-baseline justify-end gap-x-1.5 font-mono text-sm">
        {before ? (
          <>
            <span className="text-muted-foreground text-xs">{before}</span>
            <ArrowRight
              aria-hidden="true"
              className="text-muted-foreground size-3 self-center"
            />
            <span className="sr-only">becomes</span>
          </>
        ) : null}
        <span className="font-semibold">{after}</span>
      </dd>
    </div>
  );
}

/** Whole pesos, hidden in privacy mode. */
function Pesos({ centavos }: { centavos: number }) {
  return <SensitiveValue>{peso.format(centavos / 100)}</SensitiveValue>;
}

function joinParts(parts: ReactNode[], separator: string) {
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? separator : null}
      {part}
    </Fragment>
  ));
}

/** What the extra amount changes against the plan without it. */
function extraDelta(
  base: PayoffPlan,
  plan: PayoffPlan,
): { tone: "positive" | "destructive" | "neutral"; content: ReactNode } {
  if (plan.status !== "paid_off") {
    return {
      tone: "destructive",
      content: "Still not enough to outpace interest",
    };
  }
  if (base.status !== "paid_off") {
    return { tone: "positive", content: "Now it gets paid off" };
  }
  const months = (base.months ?? 0) - (plan.months ?? 0);
  const saved = base.totalInterestCentavos - plan.totalInterestCentavos;
  const parts: ReactNode[] = [];
  if (months > 0) parts.push(`${formatPayoffDuration(months)} sooner`);
  if (saved > 0) {
    parts.push(
      <>
        <Pesos centavos={saved} /> less interest
      </>,
    );
  }
  return parts.length > 0
    ? { tone: "positive", content: joinParts(parts, " · ") }
    : { tone: "neutral", content: "Same finish" };
}

function RolloverNote({
  base,
  minimumsOnly,
  today,
}: {
  base: PayoffPlan;
  minimumsOnly: PayoffPlan;
  today: string;
}) {
  if (base.status !== "paid_off") {
    return (
      <>
        The minimums do not outpace interest on every debt. Raise a minimum or
        add an extra amount until a debt-free date appears.
      </>
    );
  }
  if (minimumsOnly.status !== "paid_off") {
    return (
      <>
        Paying each minimum alone would never clear them all. Rolling each
        cleared payment on to the next debt does.
      </>
    );
  }
  const months = (minimumsOnly.months ?? 0) - (base.months ?? 0);
  const saved = minimumsOnly.totalInterestCentavos - base.totalInterestCentavos;
  if (months <= 0 && saved <= 0) {
    return <>Each debt clears on its own minimum about as fast.</>;
  }
  return (
    <>
      Paying only each minimum would finish in{" "}
      {payoffMonthLabel(today, minimumsOnly.months ?? 0)}. Rolling each cleared
      payment forward saves{" "}
      <span className="text-foreground font-semibold">
        {joinParts(
          [
            months > 0 ? formatPayoffDuration(months) : null,
            saved > 0 ? (
              <>
                <Pesos centavos={saved} /> in interest
              </>
            ) : null,
          ].filter(Boolean),
          " and ",
        )}
      </span>
      .
    </>
  );
}

/** Each debt's span on one shared time line, in the order it is paid. */
function PayoffRoute({
  plan,
  debts,
  today,
}: {
  plan: PayoffPlan;
  debts: ReadonlyMap<string, DebtRecord>;
  today: string;
}) {
  // A plan that never finishes has no time line to draw, only an order.
  const timed = plan.status === "paid_off";
  const span = Math.max(plan.months ?? 1, 1);
  const share = (month: number) => Math.min(month / span, 1) * 100;
  const middle = Math.round(span / 2);

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold">Order of payoff</h3>
        <ul
          className={cn(
            "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs",
            !timed && "hidden",
          )}
        >
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-2 w-4 rounded-full", styles.minimum)}
            />
            Minimum only
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-4 rounded-full bg-gradient-to-r from-sky-400 to-[var(--primary)]"
            />
            Focus: extra and freed-up payments
          </li>
        </ul>
      </div>
      <ol className="mt-4 grid gap-4">
        {plan.debts.map((item, index) => {
          const debt = debts.get(item.id);
          if (!debt) return null;
          const end = item.payoffMonth;
          const focusStart =
            item.focusMonth !== null ? item.focusMonth - 1 : null;
          return (
            <li
              key={item.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 place-items-center rounded-full font-mono text-xs font-bold",
                  index === 0
                    ? "bg-primary-solid text-primary-solid-foreground"
                    : "bg-muted text-foreground/80",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold break-words">
                    <span className="sr-only">{index + 1}. </span>
                    {debt.creditor_name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      end === null
                        ? "text-destructive font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {end === null ? (
                      "Not paid off at this pace"
                    ) : (
                      <>
                        Paid off{" "}
                        <span className="text-foreground font-mono font-semibold">
                          {payoffMonthLabel(today, end)}
                        </span>
                      </>
                    )}
                  </span>
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    "bg-foreground/[0.05] relative mt-2 h-2.5 overflow-hidden rounded-full",
                    !timed && "hidden",
                  )}
                >
                  {/* Minimum-only stretch, then the focus stretch. */}
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0",
                      styles.minimum,
                      styles.slide,
                    )}
                    style={{
                      width: `${share(focusStart ?? end ?? span)}%`,
                    }}
                  />
                  {focusStart !== null ? (
                    <span
                      className={cn(
                        "absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 to-[var(--primary)]",
                        styles.slide,
                      )}
                      style={{
                        left: `${share(focusStart)}%`,
                        width: `${share((end ?? span) - focusStart)}%`,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div
        aria-hidden="true"
        className={cn(
          "text-muted-foreground mt-2.5 ml-10 flex justify-between gap-2 font-mono text-[0.6875rem]",
          !timed && "hidden",
        )}
      >
        <span>Now</span>
        {span >= 6 ? (
          <span className="max-[359px]:hidden">
            {payoffMonthLabel(today, middle)}
          </span>
        ) : null}
        <span>{payoffMonthLabel(today, span)}</span>
      </div>
    </div>
  );
}

/**
 * Compares the three payoff orders on the same budget, tries an extra
 * monthly amount, and draws the order debts are cleared in.
 */
export function PayoffPlanner({
  plans,
  base,
  minimumsOnly,
  strategy,
  onStrategyChange,
  extra,
  onExtraChange,
  debts,
  today,
}: {
  /** Each strategy with the extra amount. */
  plans: Record<DebtStrategy, PayoffPlan>;
  /** The chosen strategy without the extra. */
  base: PayoffPlan;
  /** Each debt on its own minimum, with no rollover. */
  minimumsOnly: PayoffPlan;
  strategy: DebtStrategy;
  onStrategyChange: (strategy: DebtStrategy) => void;
  extra: string;
  onExtraChange: (value: string) => void;
  debts: ReadonlyMap<string, DebtRecord>;
  today: string;
}) {
  const extraId = useId();
  const plan = plans[strategy];
  const extraCentavos = parsePesoInput(extra) ?? 0;
  const hasExtra = extraCentavos > 0;
  const finished = STRATEGIES.filter(
    (item) => plans[item].status === "paid_off",
  );
  const leastInterest = Math.min(
    ...finished.map((item) => plans[item].totalInterestCentavos),
  );
  const tied = finished.every(
    (item) => plans[item].totalInterestCentavos === leastInterest,
  );
  const delta = hasExtra ? extraDelta(base, plan) : null;
  const paidOff = plan.status === "paid_off";

  return (
    <section
      id="plan"
      aria-labelledby="plan-title"
      data-spotlight
      className={cn(dashboardCardClass, "mt-8 scroll-mt-24 sm:mt-10")}
    >
      <DashboardCardHeading
        id="plan-title"
        icon={Route}
        title="Payoff plan"
        description="The same monthly budget, ordered three ways. Nothing here is saved or paid."
      />

      <fieldset className="mt-5 min-w-0">
        <legend className="sr-only">Payoff order</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {STRATEGIES.map((item) => (
            <StrategyOption
              key={item}
              strategy={item}
              plan={plans[item]}
              checked={item === strategy}
              best={
                !tied &&
                plans[item].status === "paid_off" &&
                plans[item].totalInterestCentavos === leastInterest
              }
              today={today}
              onSelect={() => onStrategyChange(item)}
            />
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.85fr)] lg:items-start">
        <div className="bg-background/55 ring-border/80 min-w-0 rounded-2xl p-4 ring-1">
          <label htmlFor={extraId} className="text-sm font-semibold">
            Extra each month
          </label>
          <p
            id={`${extraId}-hint`}
            className="text-muted-foreground mt-0.5 text-xs leading-5"
          >
            On top of the minimums, to the focus debt first. Try what you could
            spare.
          </p>
          <div className="mt-3">
            <PesoInput
              id={extraId}
              value={extra}
              onValueChange={onExtraChange}
              describedBy={`${extraId}-hint`}
              large
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXTRA_PRESETS.map((pesos) => {
              const pressed = extraCentavos === pesos * 100;
              return (
                <button
                  key={pesos}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onExtraChange(formatPesoInput(String(pesos)))}
                  className={cn(
                    "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3.5 font-mono text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
                    pressed
                      ? "bg-primary/10 text-foreground ring-primary"
                      : "bg-background/60 text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  +{peso.format(pesos)}
                </button>
              );
            })}
            {hasExtra ? (
              <button
                type="button"
                onClick={() => onExtraChange("")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
              >
                <X aria-hidden="true" className="size-3.5" />
                No extra
              </button>
            ) : null}
          </div>
          <p className="text-muted-foreground border-border mt-4 border-t pt-3 text-xs leading-5">
            <MoneyAmount
              centavos={plan.monthlyBudgetCentavos}
              className="text-foreground font-mono font-semibold"
            />{" "}
            a month in all
            {hasExtra ? (
              <>
                :{" "}
                <MoneyAmount
                  centavos={plan.monthlyBudgetCentavos - extraCentavos}
                  className="font-mono"
                />{" "}
                in minimums and{" "}
                <MoneyAmount centavos={extraCentavos} className="font-mono" />{" "}
                extra.
              </>
            ) : (
              ", the active minimums."
            )}{" "}
            When a debt is cleared, its payment moves on to the next.
          </p>
        </div>

        <div
          role="group"
          aria-label="Plan result"
          className="bg-background/55 ring-border/80 min-w-0 rounded-[1.25rem] p-4 ring-1 min-[360px]:p-5 lg:sticky lg:top-24"
        >
          <p className="text-primary text-xs font-semibold">
            Debt-free, {STRATEGY_DETAILS[strategy].label.toLowerCase()} order
          </p>
          <p
            className={cn(
              "mt-1.5 font-mono leading-none font-semibold tracking-[-0.05em]",
              paidOff ? "text-[2rem]" : "text-destructive text-xl",
            )}
          >
            {paidOff
              ? payoffMonthLabel(today, plan.months ?? 0, "long")
              : "Not at this pace"}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {paidOff
              ? `In ${formatPayoffDuration(plan.months ?? 0)}`
              : "Payments do not outpace interest"}
          </p>
          <p role="status" className="mt-3">
            <span
              className={cn(
                "inline-block max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                delta?.tone === "positive" &&
                  "bg-positive/10 text-positive ring-positive/25",
                delta?.tone === "destructive" &&
                  "bg-destructive/10 text-destructive ring-destructive/25",
                (!delta || delta.tone === "neutral") &&
                  "bg-background/60 text-muted-foreground ring-border",
              )}
            >
              {delta?.content ?? "Add an extra amount to compare"}
            </span>
          </p>
          <dl className="mt-4">
            <Row
              label="Each month"
              before={
                hasExtra ? (
                  <MoneyAmount centavos={base.monthlyBudgetCentavos} />
                ) : undefined
              }
              after={<MoneyAmount centavos={plan.monthlyBudgetCentavos} />}
            />
            {paidOff ? (
              <>
                <Row
                  label="Interest to pay"
                  before={
                    hasExtra && base.status === "paid_off" ? (
                      <MoneyAmount centavos={base.totalInterestCentavos} />
                    ) : undefined
                  }
                  after={<MoneyAmount centavos={plan.totalInterestCentavos} />}
                />
                <Row
                  label="Total to pay"
                  after={<MoneyAmount centavos={plan.totalPaidCentavos} />}
                />
              </>
            ) : null}
          </dl>
          <p className="bg-primary/[0.06] ring-primary/20 text-muted-foreground mt-4 rounded-2xl p-3.5 text-xs leading-5 ring-1">
            <RolloverNote
              base={base}
              minimumsOnly={minimumsOnly}
              today={today}
            />
          </p>
        </div>
      </div>

      <PayoffRoute plan={plan} debts={debts} today={today} />
    </section>
  );
}
