"use client";

import { ChevronDown, ChevronRight, HandCoins } from "lucide-react";
import { useState } from "react";
import {
  DebtSection,
  debtRowsClass,
  debtSurfaceClass,
} from "@/components/debts/debt-section";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import type { DebtRecord } from "@/lib/debts/debt";
import { dueStatus, type DueTone } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

/** How far ahead the list looks: about one billing cycle. */
export const UPCOMING_DAYS = 30;

/** Later bills shown before "Show more". */
const VISIBLE_LATER = 3;

const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
});

const toneText: Record<DueTone, string> = {
  destructive: "text-destructive",
  caution: "text-amber-700 dark:text-amber-300",
  neutral: "text-muted-foreground",
};

function DateTile({
  iso,
  tone,
  size = "md",
}: {
  iso: string;
  tone: DueTone;
  size?: "md" | "lg";
}) {
  const date = new Date(`${iso}T00:00:00Z`);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl text-center ring-1",
        size === "lg" ? "w-14 py-2" : "w-11 py-1.5",
        tone === "destructive"
          ? "bg-destructive/10 text-destructive ring-destructive/25"
          : "bg-background/70 ring-border/80",
      )}
    >
      <span className="text-[0.625rem] leading-none font-semibold uppercase opacity-75">
        {monthShort.format(date)}
      </span>
      <span
        className={cn(
          "mt-0.5 font-mono leading-none font-semibold tabular-nums",
          size === "lg" ? "text-xl" : "text-base",
        )}
      >
        {date.getUTCDate()}
      </span>
    </span>
  );
}

type Upcoming = {
  debt: DebtRecord;
  due: NonNullable<ReturnType<typeof dueStatus>>;
};

/** The bill to pay first, with the page's one strong button. */
function NextPayment({
  item,
  onPay,
}: {
  item: Upcoming;
  onPay: (debt: DebtRecord) => void;
}) {
  const { debt, due } = item;
  const overdue = due.tone === "destructive";
  return (
    <div
      data-spotlight
      className={cn(
        debtSurfaceClass,
        "p-5 sm:p-6",
        overdue &&
          "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--destructive)_9%,transparent),transparent_55%)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <DateTile iso={debt.next_due_date!} tone={due.tone} size="lg" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", toneText[due.tone])}>
            {due.label}
          </p>
          <p className="mt-0.5 text-lg leading-snug font-semibold tracking-[-0.02em] break-words">
            {debt.creditor_name}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {debt.minimum_payment_centavos > 0 ? "Minimum due" : "No minimum"}
          </p>
          <p className="mt-0.5 font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">
            {debt.minimum_payment_centavos > 0 ? (
              <MoneyAmount
                centavos={debt.minimum_payment_centavos}
                quietCentavos
              />
            ) : (
              "—"
            )}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          aria-label={`Pay ${debt.creditor_name}`}
          onClick={() => onPay(debt)}
          className="rounded-full px-6 max-sm:w-full"
        >
          <HandCoins aria-hidden="true" className="size-4" />
          Pay now
        </Button>
      </div>
    </div>
  );
}

/**
 * What to pay next: the most urgent bill as a card of its own, then the
 * rest due within a month as quiet rows that open the payment form.
 * Hidden when there is nothing to show.
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
  const [showAll, setShowAll] = useState(false);
  const upcoming = debts
    .map((debt) => ({ debt, due: dueStatus(debt.next_due_date, today) }))
    .filter(
      (item): item is Upcoming =>
        item.due !== null && item.due.days <= UPCOMING_DAYS,
    )
    .sort((a, b) => a.due.days - b.due.days);
  const undated = debts.filter((debt) => !debt.next_due_date);
  const total = upcoming.reduce(
    (sum, item) => sum + item.debt.minimum_payment_centavos,
    0,
  );
  if (upcoming.length === 0 && undated.length === 0) return null;
  const [first, ...later] = upcoming;
  const shown = showAll ? later : later.slice(0, VISIBLE_LATER);
  const folded = later.length - VISIBLE_LATER;

  return (
    <DebtSection
      id="debts-upcoming"
      title="Up next"
      meta={
        upcoming.length > 0 ? (
          <>
            <MoneyAmount
              centavos={total}
              className="text-foreground font-mono font-semibold tabular-nums"
            />{" "}
            due in {UPCOMING_DAYS} days
          </>
        ) : undefined
      }
    >
      {first ? (
        <NextPayment item={first} onPay={onPay} />
      ) : (
        <p
          className={cn(
            debtSurfaceClass,
            "text-muted-foreground px-5 py-4 text-sm",
          )}
        >
          Nothing due in the next {UPCOMING_DAYS} days.
        </p>
      )}

      {later.length > 0 ? (
        <div className={cn(debtSurfaceClass, "mt-3")}>
          <ul className={debtRowsClass}>
            {shown.map(({ debt, due }) => (
              <li key={debt.id}>
                <button
                  type="button"
                  aria-label={`Pay ${debt.creditor_name}`}
                  onClick={() => onPay(debt)}
                  className="hover:bg-muted/50 focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <DateTile iso={debt.next_due_date!} tone={due.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-words">
                      {debt.creditor_name}
                    </span>
                    <span className={cn("block text-xs", toneText[due.tone])}>
                      {due.relative}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {debt.minimum_payment_centavos > 0 ? (
                      <MoneyAmount
                        centavos={debt.minimum_payment_centavos}
                        quietCentavos
                        className="block font-mono text-sm font-semibold tabular-nums"
                      />
                    ) : null}
                    <span className="text-primary block text-xs font-semibold">
                      Pay
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="text-muted-foreground -mr-1 size-4 shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
          {folded > 0 ? (
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className="text-primary hover:bg-muted/40 focus-visible:ring-ring border-border/70 flex min-h-12 w-full items-center justify-center gap-1 border-t text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              {showAll ? "Show fewer" : `Show ${folded} more`}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform",
                  showAll && "rotate-180",
                )}
              />
            </button>
          ) : null}
        </div>
      ) : null}

      {undated.length > 0 ? (
        <p className="text-muted-foreground mt-3 px-1 text-xs leading-6">
          No due date yet:{" "}
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
          . Add one to get reminders here.
        </p>
      ) : null}
    </DebtSection>
  );
}
