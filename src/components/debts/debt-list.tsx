"use client";

import { ChevronRight, CircleCheckBig } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  DebtSection,
  debtRowsClass,
  debtSurfaceClass,
} from "@/components/debts/debt-section";
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
          "hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 items-center gap-3.5 px-4 py-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-5",
          highlighted && "bg-primary/[0.08]",
        )}
      >
        <DebtTypeBadge type={debt.debt_type} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 text-[0.9375rem] font-semibold tracking-[-0.01em] break-words">
              {debt.creditor_name}
            </span>
            <MoneyAmount
              centavos={debt.current_balance_centavos}
              quietCentavos
              className="shrink-0 font-mono text-[0.9375rem] font-semibold tracking-[-0.02em] tabular-nums"
            />
          </span>
          <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate">
              <DebtLine debt={debt} today={today} />
            </span>
            <span className="shrink-0 tabular-nums">
              {formatPercent(share)} paid
            </span>
          </span>
          <RepaidBar share={share} size="sm" className="mt-2.5" />
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground/70 -mr-1 size-4 shrink-0"
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
    <DebtSection
      id="debts-list"
      title="Your debts"
      meta={`${debts.length} open`}
    >
      <ul data-spotlight className={cn(debtSurfaceClass, debtRowsClass)}>
        {debts.map((debt) => (
          <DebtRow
            key={debt.id}
            debt={debt}
            highlighted={debt.id === highlightId}
            today={today}
          />
        ))}
      </ul>
    </DebtSection>
  );
}

/** Debts already at zero, folded away until asked for. */
export function PaidOffList({ debts }: { debts: DebtRecord[] }) {
  const repaid = debts.reduce(
    (sum, debt) => sum + debt.original_balance_centavos,
    0,
  );

  return (
    <section aria-labelledby="debts-paid" className="mt-8 sm:mt-10">
      <details className={cn(debtSurfaceClass, "group")}>
        <summary className="hover:bg-muted/40 flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors sm:px-5 [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="bg-positive/12 text-positive grid size-10 shrink-0 place-items-center rounded-xl"
          >
            <CircleCheckBig className="size-[1.125rem]" />
          </span>
          <span className="min-w-0 flex-1">
            <h2 id="debts-paid" className="text-[0.9375rem] font-semibold">
              Paid off
            </h2>
            <span className="text-muted-foreground block text-xs">
              <MoneyAmount
                centavos={repaid}
                className="font-mono tabular-nums"
              />{" "}
              cleared across {debts.length}{" "}
              {debts.length === 1 ? "debt" : "debts"}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
          />
        </summary>
        <ul className={cn(debtRowsClass, "border-border/70 border-t")}>
          {debts.map((debt) => (
            <li key={debt.id}>
              <Link
                href={`/debts/${debt.id}` as Route}
                className="hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 items-center gap-3.5 px-4 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-5"
              >
                <DebtTypeBadge type={debt.debt_type} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-semibold break-words">
                  {debt.creditor_name}
                </span>
                <MoneyAmount
                  centavos={debt.original_balance_centavos}
                  className="text-muted-foreground font-mono text-xs font-semibold tabular-nums"
                />
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
