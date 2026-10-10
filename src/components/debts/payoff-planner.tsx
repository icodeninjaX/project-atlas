"use client";

import { ArrowDown, ArrowRight, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, type ReactNode } from "react";
import { DebtSection, debtSurfaceClass } from "@/components/debts/debt-section";
import { PayoffCurve, type CurveSeries } from "@/components/debts/payoff-curve";
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

/** Each order in a couple of plain words. */
const CHOICES: Record<DebtStrategy, string> = {
  avalanche: "Highest rate",
  snowball: "Smallest",
  priority: "My order",
};

const EXPLAIN: Record<DebtStrategy, string> = {
  avalanche: "Pays the highest-interest debt first (avalanche).",
  snowball: "Clears the smallest balance first for quick wins (snowball).",
  priority: "Pays in the order you set below.",
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

  const series: CurveSeries[] = [];
  if (base.status === "paid_off" || hasExtra) {
    series.push({
      key: "base",
      label: hasExtra ? "Without the extra" : "Total owed",
      balances: base.balances,
      color: hasExtra
        ? "color-mix(in srgb, var(--muted-foreground) 70%, transparent)"
        : "var(--primary)",
    });
  }
  if (hasExtra) {
    series.push({
      key: "extra",
      label: `With ${peso.format(extraCentavos / 100)} more`,
      balances: plan.balances,
      color: "var(--primary)",
    });
  }
  const curveMonths = Math.max(
    ...[base, plan]
      .filter((item) => item.status === "paid_off")
      .map((item) => item.months ?? 0),
    1,
  );
  const drawable = base.status === "paid_off" || paidOff;

  return (
    <DebtSection
      id="plan-title"
      title="Payoff plan"
      meta="An estimate; nothing is saved"
      className="scroll-mt-24"
    >
      <div
        id="plan"
        data-spotlight
        className={cn(debtSurfaceClass, "p-5 sm:p-6")}
      >
        <div
          role="group"
          aria-label="Plan result"
          className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
        >
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Debt-free by</p>
            <p
              className={cn(
                "mt-1 leading-none font-semibold tracking-[-0.045em]",
                paidOff
                  ? "text-[clamp(2rem,9vw,2.75rem)]"
                  : "text-destructive text-2xl",
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
          </div>
          <dl className="grid grid-cols-2 gap-x-6 sm:text-right">
            <div>
              <dt className="text-muted-foreground text-xs">Interest</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                {paidOff ? (
                  <MoneyAmount centavos={plan.totalInterestCentavos} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Each month</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                <span className="sr-only">Paying </span>
                <MoneyAmount centavos={plan.monthlyBudgetCentavos} />
              </dd>
            </div>
          </dl>
        </div>

        {drawable ? (
          <div className="mt-5">
            <PayoffCurve
              series={series}
              months={curveMonths}
              today={today}
              label="Total owed, month by month, until debt-free"
            />
          </div>
        ) : null}

        <div className="border-border/70 mt-6 border-t pt-5">
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold">
              Which to pay first
            </legend>
            <div className="bg-muted/60 mt-2.5 grid grid-cols-3 gap-1 rounded-full p-1">
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
                  <span className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground peer-focus-visible:ring-ring flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2 text-center text-xs font-semibold transition-all peer-checked:shadow-[0_1px_3px_rgb(7_10_15/0.18)] peer-focus-visible:ring-2">
                    {CHOICES[item]}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-muted-foreground mt-2.5 text-xs leading-5">
              {EXPLAIN[strategy]}{" "}
              {best === strategy ? (
                <span className="text-positive font-semibold">
                  Costs the least interest.
                </span>
              ) : best ? (
                `${CHOICES[best]} would cost less interest.`
              ) : null}
            </p>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={extraId} className="text-sm font-semibold">
              Pay extra each month
            </label>
            <div className="mt-2.5 grid gap-2.5">
              <PesoInput
                id={extraId}
                value={extra}
                onValueChange={onExtraChange}
                ariaLabel="Extra each month in pesos"
              />
              <div className="grid grid-cols-4 gap-2">
                {EXTRA_PRESETS.map((pesos) => {
                  const pressed = extraCentavos === pesos * 100;
                  return (
                    <button
                      key={pesos}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() =>
                        onExtraChange(formatPesoInput(String(pesos)))
                      }
                      className={cn(
                        "focus-visible:ring-ring inline-flex min-h-10 items-center justify-center rounded-full px-2 font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        pressed
                          ? "bg-primary-solid text-primary-solid-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      +{peso.format(pesos)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2.5 flex min-h-5 items-start justify-between gap-3">
              <p role="status" className="text-xs font-semibold">
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
              {hasExtra ? (
                <button
                  type="button"
                  onClick={() => onExtraChange("")}
                  aria-label="Clear the extra amount"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -my-2 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X aria-hidden="true" className="size-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-border/70 mt-5 border-t pt-5">
          <h3 id={`${extraId}-order`} className="text-sm font-semibold">
            Order to pay them off
          </h3>
          <ol aria-labelledby={`${extraId}-order`} className="mt-3 grid gap-3">
            {order.map((item, index) => {
              const debt = debts.get(item.id)!;
              return (
                <li key={item.id} className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold tabular-nums",
                      index === 0
                        ? "bg-primary-solid text-primary-solid-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
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
                        : `Cleared ${payoffMonthLabel(today, item.payoffMonth)}`}
                      {index === 0 ? " · extra goes here" : ""}
                    </span>
                  </span>
                  {reorderable ? (
                    <span className="-mr-2 flex shrink-0">
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
            <p className="text-muted-foreground mt-3 text-xs">
              Use the arrows to set your own order.
            </p>
          ) : null}
        </div>

        <details className="group border-border/70 mt-5 border-t pt-4">
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
      </div>
    </DebtSection>
  );
}
