"use client";

import { ArrowUpRight, CircleCheckBig, PencilLine, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  dashboardCardClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-card";
import {
  DebtStatusPill,
  DebtTypeBadge,
  DueChip,
  RepaidBar,
  debtTypeLabel,
  formatPercent,
} from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { TonePill } from "@/components/money/money-hero";
import { Button } from "@/components/ui/button";
import type { DebtRecord, DebtStrategy } from "@/lib/debts/debt";
import {
  STRATEGY_DETAILS,
  dueStatus,
  payoffMonthLabel,
  repaidShare,
  type DebtPayoff,
} from "@/lib/debts/plan";
import { formatShortDate } from "@/lib/money/history";
import { cn } from "@/lib/utils";

export type LastPayment = { amountCentavos: number; paymentDate: string };

function formatRate(percent: number) {
  return `${Number(percent.toFixed(2))}% a year`;
}

function DebtCard({
  debt,
  rank,
  payoff,
  focus,
  lastPayment,
  highlighted,
  today,
  onEdit,
}: {
  debt: DebtRecord;
  rank: number;
  payoff: DebtPayoff | undefined;
  focus: boolean;
  lastPayment: LastPayment | undefined;
  highlighted: boolean;
  today: string;
  onEdit: () => void;
}) {
  const share = repaidShare(
    debt.original_balance_centavos,
    debt.current_balance_centavos,
  );
  const due =
    debt.status === "active" ? dueStatus(debt.next_due_date, today) : null;
  const href = `/debts/${debt.id}` as Route;

  return (
    <li
      id={`debt-${debt.id}`}
      data-spotlight
      className={cn(
        dashboardCardClass,
        "flex scroll-mt-24 flex-col",
        highlighted && "ring-primary ring-2",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="relative shrink-0">
          <DebtTypeBadge type={debt.debt_type} />
          <span
            aria-hidden="true"
            className={cn(
              "ring-card absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full font-mono text-[0.625rem] font-bold ring-2",
              focus
                ? "bg-primary-solid text-primary-solid-foreground"
                : "bg-muted text-foreground/80",
            )}
          >
            {rank}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-6 font-semibold tracking-[-0.01em] break-words">
            <Link
              href={href}
              className="focus-visible:after:ring-ring rounded-sm outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:ring-2"
            >
              {debt.creditor_name}
            </Link>
          </h3>
          <p className="text-muted-foreground text-xs">
            <span className="sr-only">Number {rank} in the plan. </span>
            {debtTypeLabel(debt.debt_type)} ·{" "}
            {formatRate(debt.interest_rate_percent)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Edit ${debt.creditor_name}`}
          onClick={onEdit}
          className="relative z-10 -mt-1.5 -mr-2 shrink-0"
        >
          <PencilLine aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <MoneyAmount
          centavos={debt.current_balance_centavos}
          quietCentavos
          className="font-mono text-[1.625rem] leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere]"
        />
        <span className="text-muted-foreground text-xs">
          left of{" "}
          <MoneyAmount
            centavos={debt.original_balance_centavos}
            className="font-mono"
          />
        </span>
      </p>
      <RepaidBar share={share} size="sm" className="mt-3" />
      <p className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
        <span>
          <span className="text-foreground font-mono font-semibold">
            {formatPercent(share)}
          </span>{" "}
          repaid
        </span>
        <span>
          {payoff?.payoffMonth ? (
            <>
              Paid off{" "}
              <span className="text-foreground font-mono font-semibold">
                {payoffMonthLabel(today, payoff.payoffMonth)}
              </span>
            </>
          ) : (
            <span className="text-destructive font-medium">
              Not paid off at this pace
            </span>
          )}
        </span>
      </p>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-1.5">
          {focus ? (
            <span className="bg-primary/10 text-primary ring-primary/25 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1">
              <Target aria-hidden="true" className="size-3" />
              Focus now
            </span>
          ) : null}
          <DebtStatusPill status={debt.status} />
          {due ? <DueChip tone={due.tone} label={due.label} /> : null}
          {debt.minimum_payment_centavos > 0 ? (
            <TonePill tone="neutral">
              <MoneyAmount
                centavos={debt.minimum_payment_centavos}
                className="font-mono"
              />{" "}
              a month
            </TonePill>
          ) : (
            <TonePill tone="neutral">No minimum</TonePill>
          )}
        </div>
        <p className="text-muted-foreground border-border mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 text-xs">
          <span>
            {lastPayment ? (
              <>
                Last paid{" "}
                <MoneyAmount
                  centavos={lastPayment.amountCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                on {formatShortDate(lastPayment.paymentDate)}
              </>
            ) : (
              "No payments recorded yet"
            )}
          </span>
          <span
            aria-hidden="true"
            className="text-primary inline-flex items-center gap-0.5 font-semibold"
          >
            Details
            <ArrowUpRight className="size-3.5" />
          </span>
        </p>
      </div>
    </li>
  );
}

/** The open debts as cards, in the order the plan pays them. */
export function DebtList({
  debts,
  payoffs,
  strategy,
  lastPayments,
  highlightId,
  today,
  onEdit,
}: {
  /** Open debts, already in plan order. */
  debts: DebtRecord[];
  payoffs: ReadonlyMap<string, DebtPayoff>;
  strategy: DebtStrategy;
  lastPayments: ReadonlyMap<string, LastPayment>;
  highlightId: string | null;
  today: string;
  onEdit: (debt: DebtRecord) => void;
}) {
  return (
    <section aria-labelledby="debts-list" className="mt-8 sm:mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="debts-list"
          className="text-xl font-semibold tracking-[-0.025em]"
        >
          Open debts
        </h2>
        <p className="text-muted-foreground text-xs">
          In {STRATEGY_DETAILS[strategy].label.toLowerCase()} order:{" "}
          {STRATEGY_DETAILS[strategy].rule.toLowerCase()}
        </p>
      </div>
      <ol className="mt-4 grid gap-4 lg:grid-cols-2">
        {debts.map((debt, index) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            rank={index + 1}
            payoff={payoffs.get(debt.id)}
            focus={index === 0}
            lastPayment={lastPayments.get(debt.id)}
            highlighted={debt.id === highlightId}
            today={today}
            onEdit={() => onEdit(debt)}
          />
        ))}
      </ol>
    </section>
  );
}

/** Debts already at zero, each with what was repaid. */
export function PaidOffList({ debts }: { debts: DebtRecord[] }) {
  const repaid = debts.reduce(
    (sum, debt) => sum + debt.original_balance_centavos,
    0,
  );

  return (
    <section aria-labelledby="debts-paid" className="mt-8 sm:mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="debts-paid"
          className="text-xl font-semibold tracking-[-0.025em]"
        >
          Paid off
        </h2>
        <p className="text-muted-foreground text-xs">
          <MoneyAmount
            centavos={repaid}
            className="text-foreground font-mono font-semibold"
          />{" "}
          repaid across {debts.length} {debts.length === 1 ? "debt" : "debts"}
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {debts.map((debt) => (
          <li
            key={debt.id}
            className={cn(
              dashboardTileClass,
              "relative flex items-center gap-3",
            )}
          >
            <span
              aria-hidden="true"
              className="bg-positive/12 text-positive grid size-9 shrink-0 place-items-center rounded-xl"
            >
              <CircleCheckBig className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold break-words">
                <Link
                  href={`/debts/${debt.id}` as Route}
                  className="focus-visible:after:ring-ring outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:ring-2"
                >
                  {debt.creditor_name}
                </Link>
              </p>
              <p className="text-muted-foreground text-xs">
                {debtTypeLabel(debt.debt_type)}
              </p>
            </div>
            <MoneyAmount
              centavos={debt.original_balance_centavos}
              className="text-muted-foreground font-mono text-xs font-semibold"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
