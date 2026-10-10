"use client";

import { ArrowDown, ArrowRight, ArrowUp, Route, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, type ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
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

const EXTRA_PRESETS = [500, 1_000, 2_500, 5_000];

/** Each order in plain words first; the usual name second. */
const CHOICES: Record<DebtStrategy, string> = {
  avalanche: "Highest interest",
  snowball: "Smallest balance",
  priority: "My own order",
};

const RULES = [
  "Every active debt gets its minimum each month. Any extra goes to the debt at the top of the order.",
  "When a debt is cleared, its payment moves on to the next one, so the monthly total stays the same.",
  "Interest compounds monthly at today's rates, with no new borrowing.",
  "Paused and defaulted debts get no minimum, only money the plan frees up.",
];

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

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

/**
 * The payoff plan, one decision at a time: which debt to pay first, when
 * that makes you debt-free, what paying a little more does, and the order
 * the debts clear in. In "My own order" the order can be rearranged here.
 */
export function PayoffPlanner({
  plans,
  base,
  strategy,
  onStrategyChange,
  extra,
  onExtraChange,
  debts,
  today,
  savedStrategy,
  onReorder,
}: {
  /** Each strategy with the extra amount. */
  plans: Record<DebtStrategy, PayoffPlan>;
  /** The chosen strategy without the extra. */
  base: PayoffPlan;
  strategy: DebtStrategy;
  onStrategyChange: (strategy: DebtStrategy) => void;
  extra: string;
  onExtraChange: (value: string) => void;
  debts: ReadonlyMap<string, DebtRecord>;
  today: string;
  /** The order the page opens in, from Settings. */
  savedStrategy: DebtStrategy;
  /** Saves a new "My own order", first to last. */
  onReorder: (ids: string[]) => void;
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
  const best = tied
    ? null
    : (finished.find(
        (item) => plans[item].totalInterestCentavos === leastInterest,
      ) ?? null);
  const delta = hasExtra ? extraDelta(base, plan) : null;
  const paidOff = plan.status === "paid_off";
  const order = plan.debts.filter((item) => debts.has(item.id));
  const reorderable = strategy === "priority" && order.length > 1;
  const move = (index: number, offset: number) => () => {
    const ids = order.map((item) => item.id);
    [ids[index], ids[index + offset]] = [ids[index + offset]!, ids[index]!];
    onReorder(ids);
  };

  return (
    <section
      id="plan"
      aria-labelledby="plan-title"
      data-spotlight
      className={cn(dashboardCardClass, "mt-4 scroll-mt-24 sm:mt-5")}
    >
      <DashboardCardHeading
        id="plan-title"
        icon={Route}
        title="Payoff plan"
        description="Which debt to pay first, and when you will be debt-free. Nothing here is saved or paid."
      />

      <fieldset className="mt-5 min-w-0">
        <legend className="text-sm font-semibold">Pay first</legend>
        <div className="bg-muted/50 ring-border mt-2 grid grid-cols-3 gap-1 rounded-2xl p-1 ring-1">
          {STRATEGIES.map((item) => (
            <label key={item} className="min-w-0">
              <input
                type="radio"
                name="payoff-strategy"
                value={item}
                checked={item === strategy}
                onChange={() => onStrategyChange(item)}
                aria-label={STRATEGY_DETAILS[item].label}
                className="peer sr-only"
              />
              <span className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground peer-focus-visible:ring-ring flex h-full min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl px-1.5 py-1.5 text-center text-xs font-semibold transition-colors peer-checked:shadow-sm peer-focus-visible:ring-2">
                {CHOICES[item]}
                {item === "priority" ? null : (
                  <span className="text-[0.625rem] font-medium opacity-70">
                    {STRATEGY_DETAILS[item].label}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          {best === strategy
            ? "This order costs the least interest."
            : best
              ? `${CHOICES[best]} first would cost less interest.`
              : "Every order costs about the same here."}
        </p>
      </fieldset>

      <div
        role="group"
        aria-label="Plan result"
        className="bg-background/55 ring-border/80 mt-5 grid gap-4 rounded-2xl p-4 ring-1 min-[26rem]:grid-cols-2 sm:p-5"
      >
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Debt-free</p>
          <p
            className={cn(
              "mt-1 font-mono leading-none font-semibold tracking-[-0.04em]",
              paidOff ? "text-[1.75rem]" : "text-destructive text-lg",
            )}
          >
            {paidOff
              ? payoffMonthLabel(today, plan.months ?? 0, "long")
              : "Not at this pace"}
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {paidOff
              ? `In ${formatPayoffDuration(plan.months ?? 0)}`
              : "Payments do not outpace interest"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Interest you will pay</p>
          <p className="mt-1 font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere]">
            {paidOff ? (
              <MoneyAmount centavos={plan.totalInterestCentavos} />
            ) : (
              "—"
            )}
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Paying{" "}
            <MoneyAmount
              centavos={plan.monthlyBudgetCentavos}
              className="font-mono"
            />{" "}
            a month
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={extraId} className="text-sm font-semibold">
          What if you pay extra each month?
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
          <PesoInput
            id={extraId}
            value={extra}
            onValueChange={onExtraChange}
            ariaLabel="Extra each month in pesos"
          />
          <div className="flex flex-wrap gap-2">
            {EXTRA_PRESETS.map((pesos) => {
              const pressed = extraCentavos === pesos * 100;
              return (
                <button
                  key={pesos}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onExtraChange(formatPesoInput(String(pesos)))}
                  className={cn(
                    "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3 font-mono text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
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
                aria-label="Clear the extra amount"
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p role="status" className="mt-2 min-h-5 text-xs font-semibold">
          {delta ? (
            <span
              className={cn(
                delta.tone === "positive" && "text-positive",
                delta.tone === "destructive" && "text-destructive",
                delta.tone === "neutral" && "text-muted-foreground",
              )}
            >
              {delta.content}
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">
              Try an amount to see how much sooner you finish.
            </span>
          )}
        </p>
      </div>

      <div className="mt-5">
        <h3 id={`${extraId}-order`} className="text-sm font-semibold">
          Order to pay them off
        </h3>
        <ol
          aria-labelledby={`${extraId}-order`}
          className="bg-background/55 ring-border/80 divide-border mt-2 divide-y overflow-hidden rounded-2xl ring-1"
        >
          {order.map((item, index) => {
            const debt = debts.get(item.id)!;
            return (
              <li
                key={item.id}
                className="flex min-w-0 items-center gap-3 px-3.5 py-2.5 sm:px-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.6875rem] font-bold",
                    index === 0
                      ? "bg-primary-solid text-primary-solid-foreground"
                      : "bg-muted text-foreground/80",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-words">
                    <span className="sr-only">{index + 1}. </span>
                    {debt.creditor_name}
                  </span>
                  <span
                    className={cn(
                      "block text-xs",
                      item.payoffMonth === null
                        ? "text-destructive font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.payoffMonth === null
                      ? "Not paid off at this pace"
                      : `Paid off ${payoffMonthLabel(today, item.payoffMonth)}`}
                    {index === 0 ? " · extra goes here" : ""}
                  </span>
                </span>
                {reorderable ? (
                  <span className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${debt.creditor_name} up`}
                      disabled={index === 0}
                      onClick={move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${debt.creditor_name} down`}
                      disabled={index === order.length - 1}
                      onClick={move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </Button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
        {reorderable ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Use the arrows to set your own order.
          </p>
        ) : null}
      </div>

      <details className="group mt-5 border-t pt-4">
        <summary className="text-muted-foreground hover:text-foreground inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold sm:min-h-0">
          How this is worked out
        </summary>
        <ul className="text-muted-foreground mt-3 grid list-disc gap-1.5 pl-4 text-xs leading-5">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          <li>Estimates from what you entered, not guarantees.</li>
        </ul>
        <p className="text-muted-foreground mt-3 text-xs">
          This page opens with {CHOICES[savedStrategy].toLowerCase()} first.{" "}
          <Link
            href="/settings"
            className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            Change it in Settings
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        </p>
      </details>
    </section>
  );
}
