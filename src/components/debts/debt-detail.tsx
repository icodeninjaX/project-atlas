"use client";

import {
  ArrowLeft,
  ChartLine,
  HandCoins,
  History,
  PencilLine,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import { DebtSheet } from "@/components/debts/debt-sheet";
import {
  DebtStatusPill,
  DebtTypeBadge,
  DueChip,
  RepaidBar,
  debtTypeLabel,
  formatPercent,
} from "@/components/debts/debt-visuals";
import { PaymentForm } from "@/components/debts/payment-form";
import { PayoffCurve, type CurveSeries } from "@/components/debts/payoff-curve";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import {
  HeroStat,
  MoneyHeroShell,
  type HeroTone,
} from "@/components/money/money-hero";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { DebtRecord } from "@/lib/debts/debt";
import {
  dueStatus,
  formatPayoffDuration,
  monthlyInterestCentavos,
  payoffMonthLabel,
  repaidShare,
  simulatePayoff,
  toPlanDebt,
  type PayoffPlan,
} from "@/lib/debts/plan";
import {
  formatPesoInput,
  formatShortDate,
  parsePesoInput,
} from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import { cn } from "@/lib/utils";

export type DebtPaymentRecord = {
  id: string;
  amount_centavos: number;
  payment_date: string;
  notes: string | null;
};

const monthHeading = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const weekday = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
});
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatRate(percent: number) {
  return `${Number(percent.toFixed(2))}%`;
}

function DetailHero({
  debt,
  base,
  today,
  onEdit,
}: {
  debt: DebtRecord;
  base: PayoffPlan;
  today: string;
  onEdit: () => void;
}) {
  const share = repaidShare(
    debt.original_balance_centavos,
    debt.current_balance_centavos,
  );
  const repaid = debt.original_balance_centavos - debt.current_balance_centavos;
  const due =
    debt.status === "active" ? dueStatus(debt.next_due_date, today) : null;
  const paid = debt.status === "paid";
  const tone: HeroTone = paid
    ? "positive"
    : debt.status === "defaulted" || due?.tone === "destructive"
      ? "destructive"
      : "neutral";
  const interest = monthlyInterestCentavos([toPlanDebt(debt)]);

  return (
    <MoneyHeroShell labelledBy="debt-heading" tone={tone} className="mt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DebtTypeBadge type={debt.debt_type} size="lg" />
          <div className="min-w-0">
            <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {debtTypeLabel(debt.debt_type)}
            </p>
            <h1
              id="debt-heading"
              className="mt-0.5 text-2xl leading-tight font-semibold tracking-[-0.035em] break-words sm:text-3xl"
            >
              {debt.creditor_name}
            </h1>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onEdit}
          className="shrink-0 max-sm:size-11 max-sm:px-0"
        >
          <PencilLine className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">Edit debt</span>
        </Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-medium">
              {paid ? "Balance" : "Still owed"}
            </p>
            <DebtStatusPill status={debt.status} />
            {due && due.tone !== "neutral" ? (
              <DueChip tone={due.tone} label={due.label} />
            ) : null}
          </div>
          <p className="mt-2">
            <MoneyAmount
              centavos={debt.current_balance_centavos}
              quietCentavos
              className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(2.5rem,12.5vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.055em] [overflow-wrap:anywhere] text-transparent [&_span]:opacity-100"
            />
          </p>
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            <MoneyAmount
              centavos={repaid}
              className="text-foreground font-mono font-semibold"
            />{" "}
            repaid of{" "}
            <MoneyAmount
              centavos={debt.original_balance_centavos}
              className="font-mono"
            />{" "}
            borrowed.
          </p>
          <RepaidBar share={share} className="mt-4" />
          <p className="text-muted-foreground mt-2 text-xs">
            <span className="text-foreground font-mono font-semibold">
              {formatPercent(share)}
            </span>{" "}
            repaid
          </p>
          {debt.notes ? (
            <p className="bg-background/55 ring-border/80 text-muted-foreground mt-5 rounded-2xl p-3.5 text-xs leading-5 break-words ring-1">
              {debt.notes}
            </p>
          ) : null}
        </div>

        <dl className="max-sm:border-border grid grid-cols-2 gap-x-6 gap-y-5 max-sm:border-t max-sm:pt-5 sm:gap-3 @max-[17rem]:grid-cols-1">
          <HeroStat
            label="Minimum payment"
            value={<MoneyAmount centavos={debt.minimum_payment_centavos} />}
            note={debt.due_day ? `Due on day ${debt.due_day}` : "Each month"}
          />
          <HeroStat
            label="Interest rate"
            value={`${formatRate(debt.interest_rate_percent)} a year`}
            note={
              interest > 0 ? (
                <>
                  About{" "}
                  <MoneyAmount centavos={interest} className="font-mono" /> this
                  month
                </>
              ) : (
                "No interest"
              )
            }
          />
          <HeroStat
            label="Next due"
            value={
              debt.next_due_date
                ? formatShortDate(debt.next_due_date)
                : "Not set"
            }
            tone={due?.tone === "destructive" ? "destructive" : undefined}
            note={
              due ? due.relative : paid ? "Nothing more due" : "Add it in Edit"
            }
          />
          <HeroStat
            label="Paid off"
            value={
              paid
                ? "Done"
                : base.status === "paid_off"
                  ? payoffMonthLabel(today, base.months ?? 0)
                  : "Not yet"
            }
            tone={
              paid
                ? "positive"
                : base.status === "stalled"
                  ? "destructive"
                  : undefined
            }
            note={
              paid
                ? "Balance is zero"
                : base.status === "paid_off"
                  ? `In ${formatPayoffDuration(base.months ?? 0)} at the minimum`
                  : debt.minimum_payment_centavos > 0
                    ? "The minimum does not cover interest"
                    : "No minimum set"
            }
          />
        </dl>
      </div>
    </MoneyHeroShell>
  );
}

function Outlook({
  debt,
  base,
  today,
  className,
}: {
  debt: DebtRecord;
  base: PayoffPlan;
  today: string;
  className?: string;
}) {
  const id = useId();
  const [extra, setExtra] = useState("");
  const extraCentavos = parsePesoInput(extra) ?? 0;
  const boosted = useMemo(
    () =>
      extraCentavos > 0
        ? simulatePayoff([{ ...toPlanDebt(debt), active: true }], {
            strategy: "avalanche",
            extraCentavos,
          })
        : null,
    [debt, extraCentavos],
  );
  const minimum = debt.minimum_payment_centavos;
  const presets =
    minimum > 0
      ? [
          { label: "+25%", centavos: Math.round(minimum / 4 / 100) * 100 },
          { label: "+50%", centavos: Math.round(minimum / 2 / 100) * 100 },
          { label: "Double", centavos: minimum },
        ].filter((preset) => preset.centavos > 0)
      : [];

  const shown = boosted ?? base;
  const finished = [base, boosted].filter(
    (plan): plan is PayoffPlan => plan?.status === "paid_off",
  );
  const months = Math.max(...finished.map((plan) => plan.months ?? 0), 1);
  const series: CurveSeries[] = [];
  if (base.status === "paid_off" || boosted) {
    series.push({
      key: "minimum",
      label: "At the minimum",
      balances: base.balances,
      color: boosted
        ? "color-mix(in srgb, var(--muted-foreground) 70%, transparent)"
        : "var(--primary)",
    });
  }
  if (boosted) {
    series.push({
      key: "extra",
      label: `With ${peso.format(extraCentavos / 100)} more`,
      balances: boosted.balances,
      color: "var(--primary)",
    });
  }
  const drawable = finished.length > 0;
  const savedMonths =
    boosted?.status === "paid_off" && base.status === "paid_off"
      ? (base.months ?? 0) - (boosted.months ?? 0)
      : 0;
  const savedInterest =
    boosted?.status === "paid_off" && base.status === "paid_off"
      ? base.totalInterestCentavos - boosted.totalInterestCentavos
      : 0;
  const yearly = drawable
    ? Array.from(
        new Set([
          ...Array.from(
            { length: Math.floor(months / 12) },
            (_, year) => (year + 1) * 12,
          ),
          months,
        ]),
      )
    : [];

  return (
    <section
      aria-labelledby="outlook-title"
      data-spotlight
      className={cn(dashboardCardClass, className)}
    >
      <DashboardCardHeading
        id="outlook-title"
        icon={ChartLine}
        title="Payoff outlook"
        description="The balance month by month, and what paying more does."
      />

      <div className="mt-5 grid gap-x-6 gap-y-3 min-[26rem]:grid-cols-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {boosted ? "With the extra" : "At the minimum"}
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-2xl leading-none font-semibold tracking-[-0.04em]",
              shown.status !== "paid_off" && "text-destructive text-lg",
            )}
          >
            {shown.status === "paid_off"
              ? payoffMonthLabel(today, shown.months ?? 0)
              : "Not paid off"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {shown.status === "paid_off"
              ? `In ${formatPayoffDuration(shown.months ?? 0)}`
              : minimum > 0 || extraCentavos > 0
                ? "Payments do not cover the interest"
                : "Set a minimum or try an amount"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Interest to pay</p>
          <p className="mt-1 font-mono text-2xl leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere]">
            {shown.status === "paid_off" ? (
              <MoneyAmount centavos={shown.totalInterestCentavos} />
            ) : (
              "—"
            )}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {shown.status === "paid_off" ? (
              <>
                <MoneyAmount
                  centavos={shown.totalPaidCentavos}
                  className="font-mono"
                />{" "}
                paid in all
              </>
            ) : (
              "Keeps growing"
            )}
          </p>
        </div>
      </div>

      {boosted ? (
        <p role="status" className="mt-3">
          <span
            className={cn(
              "inline-block max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              savedMonths > 0 || savedInterest > 0 || base.status !== "paid_off"
                ? "bg-positive/10 text-positive ring-positive/25"
                : "bg-background/60 text-muted-foreground ring-border",
            )}
          >
            {boosted.status !== "paid_off" ? (
              "Still not enough to outpace interest"
            ) : base.status !== "paid_off" ? (
              "Now it gets paid off"
            ) : savedMonths > 0 || savedInterest > 0 ? (
              <>
                {savedMonths > 0
                  ? `${formatPayoffDuration(savedMonths)} sooner`
                  : null}
                {savedMonths > 0 && savedInterest > 0 ? " · " : null}
                {savedInterest > 0 ? (
                  <>
                    <SensitiveValue>
                      {peso.format(savedInterest / 100)}
                    </SensitiveValue>{" "}
                    less interest
                  </>
                ) : null}
              </>
            ) : (
              "Same finish"
            )}
          </span>
        </p>
      ) : null}

      {drawable ? (
        <div className="mt-5">
          <PayoffCurve
            series={series}
            months={months}
            today={today}
            label="Projected balance until it is paid off"
          />
          <details className="group mt-4">
            <summary className="text-muted-foreground hover:text-foreground inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold sm:min-h-0">
              Show the balance year by year
            </summary>
            <div className="mt-2 max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1.5 font-medium">
                      Month
                    </th>
                    {series.map((item) => (
                      <th
                        key={item.key}
                        scope="col"
                        className="py-1.5 pl-3 text-right font-medium"
                      >
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {yearly.map((month) => (
                    <tr key={month} className="border-t">
                      <th scope="row" className="py-1.5 font-sans font-medium">
                        {payoffMonthLabel(today, month)}
                      </th>
                      {series.map((item) => (
                        <td key={item.key} className="py-1.5 pl-3 text-right">
                          <MoneyAmount
                            centavos={
                              item.balances[
                                Math.min(month, item.balances.length - 1)
                              ] ?? 0
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ) : null}

      <div className="bg-background/55 ring-border/80 mt-5 rounded-2xl p-4 ring-1">
        <label htmlFor={id} className="text-sm font-semibold">
          Pay more each month
        </label>
        <p
          id={`${id}-hint`}
          className="text-muted-foreground mt-0.5 text-xs leading-5"
        >
          On top of the minimum. Only this page changes; nothing is saved.
        </p>
        <div className="mt-3">
          <PesoInput
            id={id}
            value={extra}
            onValueChange={setExtra}
            describedBy={`${id}-hint`}
          />
        </div>
        {presets.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const pressed = extraCentavos === preset.centavos;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() =>
                    setExtra(
                      pressed
                        ? ""
                        : formatPesoInput(centavosToPesoInput(preset.centavos)),
                    )
                  }
                  className={cn(
                    "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
                    pressed
                      ? "bg-primary/10 text-foreground ring-primary"
                      : "bg-background/60 text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {preset.label}
                  <span className="sr-only">
                    {preset.label === "Double"
                      ? " the minimum"
                      : " on the minimum"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-4 text-xs leading-5">
        Assumes the rate stays at {formatRate(debt.interest_rate_percent)} a
        year, compounding monthly, no new borrowing, and every payment on time.
      </p>
    </section>
  );
}

function PaymentRow({
  payment,
  debtId,
  highlighted,
  today,
}: {
  payment: DebtPaymentRecord;
  debtId: string;
  highlighted: boolean;
  today: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const date = new Date(`${payment.payment_date}T00:00:00Z`);

  return (
    <li
      id={`payment-${payment.id}`}
      className={cn(
        "flex min-w-0 scroll-mt-24 items-center gap-3 px-4 py-3",
        highlighted && "bg-primary/[0.08]",
      )}
    >
      <span
        aria-hidden="true"
        className="bg-background/70 ring-border/80 grid w-11 shrink-0 place-items-center rounded-xl py-1.5 text-center ring-1"
      >
        <span className="font-mono text-base leading-none font-semibold">
          {date.getUTCDate()}
        </span>
        <span className="text-muted-foreground mt-0.5 text-[0.625rem] leading-none font-medium uppercase">
          {weekday.format(date)}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-semibold [overflow-wrap:anywhere]">
          <MoneyAmount centavos={payment.amount_centavos} />
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs break-words">
          {payment.payment_date === today
            ? "Today"
            : formatShortDate(payment.payment_date)}
          {payment.notes ? ` · ${payment.notes}` : ""}
        </p>
      </div>
      {confirming ? (
        <OfflineMutationForm
          mutation="debtPayment.delete"
          onResult={(result) => {
            if (!result.success) setConfirming(false);
          }}
          className="flex shrink-0 items-center gap-1"
        >
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="debtId" value={debtId} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
          <FormSubmitButton
            variant="destructive"
            size="sm"
            pendingLabel="Deleting…"
          >
            Delete
          </FormSubmitButton>
        </OfflineMutationForm>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete payment"
          onClick={() => setConfirming(true)}
          className="shrink-0"
        >
          <Trash2 className="text-muted-foreground size-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

function PaymentHistory({
  debtId,
  payments,
  highlightId,
  today,
  className,
}: {
  debtId: string;
  payments: DebtPaymentRecord[];
  highlightId: string | null;
  today: string;
  className?: string;
}) {
  const total = payments.reduce(
    (sum, payment) => sum + payment.amount_centavos,
    0,
  );
  const months = useMemo(() => {
    const groups: Array<{ month: string; items: DebtPaymentRecord[] }> = [];
    for (const payment of payments) {
      const month = payment.payment_date.slice(0, 7);
      const group = groups.at(-1);
      if (group?.month === month) group.items.push(payment);
      else groups.push({ month, items: [payment] });
    }
    return groups;
  }, [payments]);

  return (
    <section
      aria-labelledby="history-title"
      data-spotlight
      className={cn(dashboardCardClass, className)}
    >
      <DashboardCardHeading
        id="history-title"
        icon={History}
        title="Payment history"
        description={
          payments.length === 0 ? (
            "Payments you record appear here, newest first."
          ) : (
            <>
              {payments.length} {payments.length === 1 ? "payment" : "payments"}{" "}
              · <MoneyAmount centavos={total} className="font-mono" /> in all
            </>
          )
        }
      />
      {payments.length === 0 ? (
        <div className="border-border mt-5 grid place-items-center rounded-2xl border border-dashed px-5 py-10 text-center">
          <HandCoins aria-hidden="true" className="text-primary size-5" />
          <p className="mt-3 text-sm font-semibold">No payments recorded yet</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-5">
            Each one you record comes off the balance and moves the payoff date
            closer.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4">
          {months.map((group) => (
            <div key={group.month}>
              <h3 className="text-muted-foreground flex items-baseline justify-between gap-3 px-1 text-xs font-semibold">
                <span>
                  {monthHeading.format(new Date(`${group.month}-01T00:00:00Z`))}
                </span>
                <MoneyAmount
                  centavos={group.items.reduce(
                    (sum, payment) => sum + payment.amount_centavos,
                    0,
                  )}
                  className="font-mono"
                />
              </h3>
              <ul className="bg-background/55 ring-border/80 divide-border mt-2 divide-y overflow-hidden rounded-2xl ring-1">
                {group.items.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    debtId={debtId}
                    highlighted={payment.id === highlightId}
                    today={today}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** One debt: where it stands, a payment, the outlook, and its history. */
export function DebtDetail({
  debt,
  payments,
  today,
  highlightPaymentId,
}: {
  debt: DebtRecord;
  /** Newest first. */
  payments: DebtPaymentRecord[];
  /** YYYY-MM-DD in Manila. */
  today: string;
  highlightPaymentId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const base = useMemo(
    () =>
      simulatePayoff([{ ...toPlanDebt(debt), active: true }], {
        strategy: "avalanche",
      }),
    [debt],
  );
  const open = debt.status !== "paid";

  useEffect(() => {
    if (!highlightPaymentId) return;
    document
      .getElementById(`payment-${highlightPaymentId}`)
      ?.scrollIntoView({ block: "center" });
  }, [highlightPaymentId]);

  return (
    <SpotlightArea>
      <Link
        href="/debts"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All debts
      </Link>
      <DetailHero
        debt={debt}
        base={base}
        today={today}
        onEdit={() => setEditing(true)}
      />
      {/* Wide screens: the payment and its history on the left, the
          outlook on the right. Phones read them in source order. */}
      <div
        className={cn(
          "mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5",
          open &&
            "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start",
        )}
      >
        {open ? (
          <section
            id="record-payment"
            aria-labelledby="payment-title"
            data-spotlight
            className={cn(dashboardCardClass, "scroll-mt-24 lg:col-start-1")}
          >
            <DashboardCardHeading
              id="payment-title"
              icon={HandCoins}
              title="Record a payment"
              description="It comes off the balance as soon as it is saved."
            />
            <div className="mt-5">
              <PaymentForm
                debtId={debt.id}
                today={today}
                balanceCentavos={debt.current_balance_centavos}
                minimumCentavos={debt.minimum_payment_centavos}
              />
            </div>
          </section>
        ) : null}
        {open ? (
          <Outlook
            debt={debt}
            base={base}
            today={today}
            className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
          />
        ) : null}
        <PaymentHistory
          debtId={debt.id}
          payments={payments}
          highlightId={highlightPaymentId}
          today={today}
          className="lg:col-start-1"
        />
      </div>
      <DebtSheet
        open={editing}
        onOpenChange={setEditing}
        debt={debt}
        today={today}
      />
    </SpotlightArea>
  );
}
