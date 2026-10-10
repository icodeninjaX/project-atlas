"use client";

import { CalendarClock, HandCoins } from "lucide-react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { DueChip } from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import type { DebtRecord } from "@/lib/debts/debt";
import { dueStatus } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

/** How far ahead the list looks: about one billing cycle. */
export const UPCOMING_DAYS = 30;

const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
});

/**
 * The bills to pay next: every active debt due within a month or already
 * overdue, soonest first, each one tap from a payment.
 */
export function UpcomingPayments({
  debts,
  today,
  onPay,
  onEdit,
}: {
  /** Active debts. */
  debts: DebtRecord[];
  /** YYYY-MM-DD in Manila. */
  today: string;
  onPay: (debt: DebtRecord) => void;
  onEdit: (debt: DebtRecord) => void;
}) {
  const upcoming = debts
    .map((debt) => ({ debt, due: dueStatus(debt.next_due_date, today) }))
    .filter(
      (item): item is { debt: DebtRecord; due: NonNullable<typeof item.due> } =>
        item.due !== null && item.due.days <= UPCOMING_DAYS,
    )
    .sort((a, b) => a.due.days - b.due.days);
  const undated = debts.filter((debt) => !debt.next_due_date);
  const total = upcoming.reduce(
    (sum, item) => sum + item.debt.minimum_payment_centavos,
    0,
  );
  const overdue = upcoming.filter((item) => item.due.days < 0).length;

  return (
    <section
      aria-labelledby="debts-upcoming"
      data-spotlight
      className={cn(dashboardCardClass, "mt-4 sm:mt-5")}
    >
      <DashboardCardHeading
        id="debts-upcoming"
        icon={CalendarClock}
        tone={overdue > 0 ? "attention" : "default"}
        title="Due soon"
        description={
          upcoming.length === 0 ? (
            `Nothing due in the next ${UPCOMING_DAYS} days.`
          ) : (
            <>
              <MoneyAmount
                centavos={total}
                className="text-foreground font-mono font-semibold"
              />{" "}
              in minimums over the next {UPCOMING_DAYS} days
              {overdue > 0 ? `, ${overdue} of them overdue` : ""}. Paying one
              moves it to next month.
            </>
          )
        }
      />
      {upcoming.length > 0 ? (
        <ul className="bg-background/55 ring-border/80 divide-border mt-5 divide-y overflow-hidden rounded-2xl ring-1">
          {upcoming.map(({ debt, due }) => {
            const date = new Date(`${debt.next_due_date}T00:00:00Z`);
            return (
              <li
                key={debt.id}
                className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3 sm:flex-nowrap sm:px-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid w-11 shrink-0 place-items-center rounded-xl py-1.5 text-center ring-1",
                    due.tone === "destructive"
                      ? "bg-destructive/10 text-destructive ring-destructive/25"
                      : "bg-background/70 ring-border/80",
                  )}
                >
                  <span className="text-[0.625rem] leading-none font-semibold uppercase opacity-75">
                    {monthShort.format(date)}
                  </span>
                  <span className="mt-0.5 font-mono text-base leading-none font-semibold">
                    {date.getUTCDate()}
                  </span>
                </span>
                <div className="min-w-0 flex-[1_1_8rem]">
                  <p className="text-sm font-semibold break-words">
                    {debt.creditor_name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <DueChip tone={due.tone} label={due.relative} />
                    {debt.minimum_payment_centavos > 0 ? (
                      <span>
                        <MoneyAmount
                          centavos={debt.minimum_payment_centavos}
                          className="text-foreground font-mono font-semibold"
                        />{" "}
                        minimum
                      </span>
                    ) : (
                      <span>No minimum set</span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={due.tone === "neutral" ? "secondary" : "default"}
                  aria-label={`Pay ${debt.creditor_name}`}
                  onClick={() => onPay(debt)}
                  className="shrink-0 max-sm:grow"
                >
                  <HandCoins aria-hidden="true" className="size-4" />
                  Pay
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {undated.length > 0 ? (
        <p className="text-muted-foreground mt-4 text-xs leading-6">
          {undated.length === 1
            ? "1 active debt has no due date: "
            : `${undated.length} active debts have no due date: `}
          {undated.map((debt, index) => (
            <span key={debt.id}>
              {index > 0 ? ", " : null}
              <button
                type="button"
                onClick={() => onEdit(debt)}
                className="text-primary focus-visible:ring-ring rounded-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {debt.creditor_name}
                <span className="sr-only">, set its due date</span>
              </button>
            </span>
          ))}
          . Add one to see it here.
        </p>
      ) : null}
    </section>
  );
}
