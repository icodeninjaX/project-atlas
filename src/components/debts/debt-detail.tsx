"use client";

import {
  ChartLine,
  HandCoins,
  History,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { DebtSheet } from "@/components/debts/debt-sheet";
import {
  DebtStatusPill,
  DebtTypeBadge,
  RepaidBar,
  debtTypeLabel,
  formatPercent,
} from "@/components/debts/debt-visuals";
import type { PaymentAccount } from "@/components/debts/payment-form";
import { PaymentSheet } from "@/components/debts/payment-sheet";
import { PayoffCurve, type CurveSeries } from "@/components/debts/payoff-curve";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { MoneyHeroShell, type HeroTone } from "@/components/money/money-hero";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { BackLink } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { DebtRecord } from "@/lib/debts/debt";
import {
  dueStatus,
  formatPayoffDuration,
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
  /** The account it was logged from in Money, if it still has a name. */
  account_name?: string | null;
  /** Whether it was also logged in Money as an expense. */
  logged?: boolean;
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

function monthlyRate(annualPercent: number) {
  return `${Number((annualPercent / 12).toFixed(2))}%`;
}

function Fact({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "destructive" | "positive";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-base font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-lg",
          tone === "destructive" && "text-destructive",
          tone === "positive" && "text-positive",
        )}
      >
        {value}
      </dd>
      {note ? (
        <dd className="text-muted-foreground mt-0.5 text-xs">{note}</dd>
      ) : null}
    </div>
  );
}

/** One debt at a glance: what is left, what is due, and what to do. */
function DetailHero({
  debt,
  today,
  onPay,
  onEdit,
}: {
  debt: DebtRecord;
  today: string;
  onPay: () => void;
  onEdit: () => void;
}) {
  const share = repaidShare(
    debt.original_balance_centavos,
    debt.current_balance_centavos,
  );
  const repaid = debt.original_balance_centavos - debt.current_balance_centavos;
  const paid = debt.status === "paid";
  const due =
    debt.status === "active" ? dueStatus(debt.next_due_date, today) : null;
  const tone: HeroTone = paid
    ? "positive"
    : debt.status === "defaulted" || due?.tone === "destructive"
      ? "destructive"
      : "neutral";

  return (
    <MoneyHeroShell labelledBy="debt-heading" tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DebtTypeBadge type={debt.debt_type} size="lg" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
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
          <span className="max-sm:sr-only">Edit</span>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-xs">
          {paid ? "Balance" : "Still owed"}
        </p>
        <DebtStatusPill status={debt.status} />
      </div>
      <p className="mt-2">
        <MoneyAmount
          centavos={debt.current_balance_centavos}
          quietCentavos
          className="font-mono text-[clamp(2.5rem,12vw,4rem)] leading-[0.95] font-semibold tracking-[-0.055em] [overflow-wrap:anywhere]"
        />
      </p>
      <div className="mt-4 max-w-xl">
        <RepaidBar share={share} />
        <p className="text-muted-foreground mt-2 text-xs">
          <span className="text-foreground font-semibold">
            {formatPercent(share)} paid off
          </span>{" "}
          · <MoneyAmount centavos={repaid} className="font-mono" /> of{" "}
          <MoneyAmount
            centavos={debt.original_balance_centavos}
            className="font-mono"
          />
        </p>
      </div>

      {paid ? null : (
        <dl className="border-border mt-6 grid grid-cols-3 gap-4 border-t pt-5">
          <Fact
            label="Next due"
            value={
              debt.next_due_date ? formatShortDate(debt.next_due_date) : "—"
            }
            note={due ? due.relative : "No due date"}
            tone={due?.tone === "destructive" ? "destructive" : undefined}
          />
          <Fact
            label="Minimum"
            value={<MoneyAmount centavos={debt.minimum_payment_centavos} />}
            note="a month"
          />
          <Fact
            label="Interest"
            value={
              debt.interest_rate_percent > 0
                ? monthlyRate(debt.interest_rate_percent)
                : "None"
            }
            note={debt.interest_rate_percent > 0 ? "a month" : undefined}
          />
        </dl>
      )}

      {debt.notes ? (
        <p className="text-muted-foreground mt-5 text-xs leading-5 break-words">
          {debt.notes}
        </p>
      ) : null}

      {paid ? null : (
        <div className="mt-6 flex [&>*]:grow sm:[&>*]:grow-0">
          <Button type="button" size="lg" onClick={onPay}>
            <HandCoins className="size-4" aria-hidden="true" />
            Record payment
          </Button>
        </div>
      )}
    </MoneyHeroShell>
  );
}

/** When it ends at the minimum, and what paying more does. */
function Outlook({
  debt,
  today,
  className,
}: {
  debt: DebtRecord;
  today: string;
  className?: string;
}) {
  const id = useId();
  const [extra, setExtra] = useState("");
  const extraCentavos = parsePesoInput(extra) ?? 0;
  const base = useMemo(
    () =>
      simulatePayoff([{ ...toPlanDebt(debt), active: true }], {
        strategy: "avalanche",
      }),
    [debt],
  );
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
  const bothDone = boosted?.status === "paid_off" && base.status === "paid_off";
  const savedMonths = bothDone
    ? (base.months ?? 0) - (boosted!.months ?? 0)
    : 0;
  const savedInterest = bothDone
    ? base.totalInterestCentavos - boosted!.totalInterestCentavos
    : 0;

  return (
    <section
      aria-labelledby="outlook-title"
      data-spotlight
      className={cn(dashboardCardClass, className)}
    >
      <DashboardCardHeading
        id="outlook-title"
        icon={ChartLine}
        title="When it will be paid off"
        description="At today's rate, if every payment is on time."
      />

      <div className="mt-5 grid gap-x-6 gap-y-3 min-[26rem]:grid-cols-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {boosted ? "With the extra" : "Paying the minimum"}
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
          <p className="text-muted-foreground text-xs">Interest you will pay</p>
          <p className="mt-1 font-mono text-2xl leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere]">
            {shown.status === "paid_off" ? (
              <MoneyAmount centavos={shown.totalInterestCentavos} />
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {finished.length > 0 ? (
        <div className="mt-5">
          <PayoffCurve
            series={series}
            months={months}
            today={today}
            label="Projected balance until it is paid off"
          />
        </div>
      ) : null}

      <div className="mt-5">
        <label htmlFor={id} className="text-sm font-semibold">
          What if you pay more each month?
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
          <PesoInput id={id} value={extra} onValueChange={setExtra} />
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
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
                          : formatPesoInput(
                              centavosToPesoInput(preset.centavos),
                            ),
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
        <p role="status" className="mt-2 min-h-5 text-xs font-semibold">
          {!boosted ? (
            <span className="text-muted-foreground font-normal">
              On top of the minimum. Nothing is saved.
            </span>
          ) : boosted.status !== "paid_off" ? (
            <span className="text-destructive">
              Still not enough to outpace interest
            </span>
          ) : base.status !== "paid_off" ? (
            <span className="text-positive">Now it gets paid off</span>
          ) : savedMonths > 0 || savedInterest > 0 ? (
            <span className="text-positive">
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
            </span>
          ) : (
            <span className="text-muted-foreground">Same finish</span>
          )}
        </p>
      </div>
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
          {payment.account_name ? ` · from ${payment.account_name}` : ""}
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
          {payment.logged ? (
            <span className="text-muted-foreground mr-1 hidden text-[0.6875rem] leading-4 min-[26rem]:inline">
              Its Money expense goes too.
            </span>
          ) : null}
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
        title="Payments"
        description={
          payments.length === 0 ? (
            "None recorded yet."
          ) : (
            <>
              {payments.length} {payments.length === 1 ? "payment" : "payments"}{" "}
              · <MoneyAmount centavos={total} className="font-mono" /> in all
            </>
          )
        }
      />
      {payments.length > 0 ? (
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
      ) : null}
    </section>
  );
}

/** One debt: where it stands, its payments, and when it ends. */
export function DebtDetail({
  debt,
  payments,
  today,
  highlightPaymentId,
  accounts = [],
}: {
  debt: DebtRecord;
  /** Newest first. */
  payments: DebtPaymentRecord[];
  /** YYYY-MM-DD in Manila. */
  today: string;
  highlightPaymentId: string | null;
  /** Open accounts a payment can be logged from. */
  accounts?: PaymentAccount[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const open = debt.status !== "paid";

  useEffect(() => {
    if (!highlightPaymentId) return;
    document
      .getElementById(`payment-${highlightPaymentId}`)
      ?.scrollIntoView({ block: "center" });
  }, [highlightPaymentId]);

  return (
    <>
      <BackLink href="/debts">All debts</BackLink>
      <DetailHero
        debt={debt}
        today={today}
        onPay={() => setPaying(true)}
        onEdit={() => setEditing(true)}
      />
      <div
        className={cn(
          "mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5",
          open && "lg:grid-cols-2 lg:items-start",
        )}
      >
        <PaymentHistory
          debtId={debt.id}
          payments={payments}
          highlightId={highlightPaymentId}
          today={today}
        />
        {open ? <Outlook debt={debt} today={today} /> : null}
      </div>
      <PaymentSheet
        debt={paying ? debt : null}
        onOpenChange={setPaying}
        accounts={accounts}
        today={today}
      />
      <DebtSheet
        open={editing}
        onOpenChange={setEditing}
        debt={debt}
        today={today}
        onDeleted={() => router.replace("/debts")}
      />
    </>
  );
}
