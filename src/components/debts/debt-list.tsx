"use client";

import { ChevronRight, CircleCheckBig } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { dashboardCardClass } from "@/components/dashboard/dashboard-card";
import {
  DebtTypeBadge,
  RepaidBar,
  debtTypeLabel,
  formatPercent,
} from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import type { DebtRecord } from "@/lib/debts/debt";
import { dueStatus, repaidShare } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

/** The one line under a debt's name: its due date, or why it has none. */
function DebtLine({ debt, today }: { debt: DebtRecord; today: string }) {
  if (debt.status === "paused") return <span>Paused</span>;
  if (debt.status === "defaulted") {
    return <span className="text-destructive font-medium">Defaulted</span>;
  }
  const due = dueStatus(debt.next_due_date, today);
  if (!due) return <span>{debtTypeLabel(debt.debt_type)} · No due date</span>;
  return (
    <span
      className={cn(
        due.tone === "destructive" && "text-destructive font-medium",
        due.tone === "caution" && "text-amber-700 dark:text-amber-300",
      )}
    >
      {due.label}
    </span>
  );
}

function DebtRow({
  debt,
  highlighted,
  today,
}: {
  debt: DebtRecord;
  highlighted: boolean;
  today: string;
}) {
  const share = repaidShare(
    debt.original_balance_centavos,
    debt.current_balance_centavos,
  );

  return (
    <li id={`debt-${debt.id}`} className="scroll-mt-24">
      <Link
        href={`/debts/${debt.id}` as Route}
        className={cn(
          "hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 items-center gap-3 px-3.5 py-3.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-4",
          highlighted && "bg-primary/[0.08]",
        )}
      >
        <DebtTypeBadge type={debt.debt_type} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 text-sm font-semibold break-words">
              {debt.creditor_name}
            </span>
            <MoneyAmount
              centavos={debt.current_balance_centavos}
              className="shrink-0 font-mono text-sm font-semibold"
            />
          </span>
          <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate">
              <DebtLine debt={debt} today={today} />
            </span>
            <span className="shrink-0">{formatPercent(share)} paid</span>
          </span>
          <RepaidBar share={share} size="sm" className="mt-2" />
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
      </Link>
    </li>
  );
}

/** Every open debt as one quiet row; each opens its own page. */
export function DebtList({
  debts,
  highlightId,
  today,
}: {
  /** Open debts, in the order to show them. */
  debts: DebtRecord[];
  highlightId: string | null;
  today: string;
}) {
  return (
    <section
      aria-labelledby="debts-list"
      data-spotlight
      className={cn(dashboardCardClass, "mt-4 sm:mt-5")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="debts-list" className="text-base font-semibold">
          Your debts
        </h2>
        <p className="text-muted-foreground text-xs">
          Tap one to pay, edit, or see its history
        </p>
      </div>
      <ul className="bg-background/55 ring-border/80 divide-border mt-4 divide-y overflow-hidden rounded-2xl ring-1">
        {debts.map((debt) => (
          <DebtRow
            key={debt.id}
            debt={debt}
            highlighted={debt.id === highlightId}
            today={today}
          />
        ))}
      </ul>
    </section>
  );
}

/** Debts already at zero, folded away until asked for. */
export function PaidOffList({ debts }: { debts: DebtRecord[] }) {
  const repaid = debts.reduce(
    (sum, debt) => sum + debt.original_balance_centavos,
    0,
  );

  return (
    <section aria-labelledby="debts-paid" className="mt-4 sm:mt-5">
      <details className={cn(dashboardCardClass, "group")}>
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
          <h2
            id="debts-paid"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <CircleCheckBig
              aria-hidden="true"
              className="text-positive size-4"
            />
            Paid off
          </h2>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <MoneyAmount
              centavos={repaid}
              className="text-foreground font-mono font-semibold"
            />{" "}
            across {debts.length} {debts.length === 1 ? "debt" : "debts"}
            <ChevronRight
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-90"
            />
          </span>
        </summary>
        <ul className="bg-background/55 ring-border/80 divide-border mt-4 divide-y overflow-hidden rounded-2xl ring-1">
          {debts.map((debt) => (
            <li key={debt.id}>
              <Link
                href={`/debts/${debt.id}` as Route}
                className="hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 items-center gap-3 px-3.5 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-4"
              >
                <DebtTypeBadge type={debt.debt_type} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-semibold break-words">
                  {debt.creditor_name}
                </span>
                <MoneyAmount
                  centavos={debt.original_balance_centavos}
                  className="text-muted-foreground font-mono text-xs font-semibold"
                />
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
