"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import {
  DebtList,
  PaidOffList,
  type LastPayment,
} from "@/components/debts/debt-list";
import { DebtSheet } from "@/components/debts/debt-sheet";
import {
  DebtsClearHero,
  DebtsHero,
  type NextDue,
} from "@/components/debts/debts-hero";
import { DebtsMethod } from "@/components/debts/debts-method";
import type { PaymentAccount } from "@/components/debts/payment-form";
import { PaymentSheet } from "@/components/debts/payment-sheet";
import { PayoffPlanner } from "@/components/debts/payoff-planner";
import { UpcomingPayments } from "@/components/debts/upcoming-payments";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import type { DebtRecord, DebtStrategy } from "@/lib/debts/debt";
import {
  STRATEGIES,
  dueStatus,
  monthlyInterestCentavos,
  simulatePayoff,
  toPlanDebt,
  type PayoffPlan,
} from "@/lib/debts/plan";
import { parsePesoInput } from "@/lib/money/history";

export type DebtPaymentLite = {
  debtId: string;
  amountCentavos: number;
  paymentDate: string;
};

type SheetState = { open: boolean; debt: DebtRecord | null };

/**
 * The debts page body, in the order a person needs it: what is owed, what
 * is due soon, each open debt with a way to pay it, the plan that orders
 * them, and what is already paid off. The plan's order and any extra
 * amount stay in this tab; the order is also kept in the address.
 */
export function DebtsWorkspace({
  debts: savedDebts,
  payments,
  accounts = [],
  today,
  initialStrategy,
  savedStrategy,
  highlightId,
}: {
  debts: DebtRecord[];
  /** Open accounts a payment can be logged from. */
  accounts?: PaymentAccount[];
  /** Recent payments, newest first. */
  payments: DebtPaymentLite[];
  /** YYYY-MM-DD in Manila. */
  today: string;
  initialStrategy: DebtStrategy;
  savedStrategy: DebtStrategy;
  highlightId: string | null;
}) {
  const [strategy, setStrategy] = useState(initialStrategy);
  const [extra, setExtra] = useState("");
  const [sheet, setSheet] = useState<SheetState>({ open: false, debt: null });
  const [paying, setPaying] = useState<DebtRecord | null>(null);
  const { submit } = useOfflineSync();
  // A new "My priority" order shows at once, until the saved debts return.
  const [reordered, setReordered] = useState<{
    source: DebtRecord[];
    ids: string[];
  } | null>(null);
  const debts = useMemo(() => {
    if (reordered?.source !== savedDebts) return savedDebts;
    const rank = new Map(reordered.ids.map((id, index) => [id, index + 1]));
    return savedDebts.map((debt) => ({
      ...debt,
      priority: rank.get(debt.id) ?? debt.priority,
    }));
  }, [reordered, savedDebts]);

  const open = useMemo(
    () => debts.filter((debt) => debt.status !== "paid"),
    [debts],
  );
  const paid = useMemo(
    () => debts.filter((debt) => debt.status === "paid"),
    [debts],
  );
  const byId = useMemo(
    () => new Map(debts.map((debt) => [debt.id, debt])),
    [debts],
  );
  const extraCentavos = parsePesoInput(extra) ?? 0;

  const { plans, base, minimumsOnly } = useMemo(() => {
    const planDebts = open.map(toPlanDebt);
    const plans = Object.fromEntries(
      STRATEGIES.map((item) => [
        item,
        simulatePayoff(planDebts, { strategy: item, extraCentavos }),
      ]),
    ) as Record<DebtStrategy, PayoffPlan>;
    return {
      plans,
      base:
        extraCentavos > 0
          ? simulatePayoff(planDebts, { strategy })
          : plans[strategy],
      minimumsOnly: simulatePayoff(planDebts, { strategy, rollover: false }),
    };
  }, [extraCentavos, open, strategy]);
  const plan = plans[strategy];
  const payoffs = useMemo(
    () => new Map(plan.debts.map((item) => [item.id, item])),
    [plan],
  );
  const ordered = plan.debts
    .map((item) => byId.get(item.id))
    .filter((debt): debt is DebtRecord => Boolean(debt));

  const lastPayments = useMemo(() => {
    const latest = new Map<string, LastPayment>();
    for (const payment of payments) {
      if (!latest.has(payment.debtId)) latest.set(payment.debtId, payment);
    }
    return latest;
  }, [payments]);

  // Arriving from a "Pay …" suggestion brings that debt into view.
  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`debt-${highlightId}`)
      ?.scrollIntoView({ block: "center" });
  }, [highlightId]);

  const chooseStrategy = (next: DebtStrategy) => {
    setStrategy(next);
    const url = new URL(window.location.href);
    url.searchParams.set("strategy", next);
    url.searchParams.delete("highlight");
    window.history.replaceState(null, "", url);
  };
  const addDebt = () => setSheet({ open: true, debt: null });
  const editDebt = (debt: DebtRecord) => setSheet({ open: true, debt });
  const reorder = async (ids: string[]) => {
    setReordered({ source: savedDebts, ids });
    const formData = new FormData();
    formData.set("order", ids.join(","));
    const result = await submit("debt.reorder", formData);
    if (!result.success) {
      toast.error(result.message);
      setReordered(null);
    }
  };

  const month = today.slice(0, 7);
  const thisMonth = payments.filter((payment) =>
    payment.paymentDate.startsWith(month),
  );
  const active = open.filter((debt) => debt.status === "active");
  const dues = active
    .map((debt) => ({ debt, due: dueStatus(debt.next_due_date, today) }))
    .filter((item) => item.due !== null)
    .sort((a, b) => a.due!.days - b.due!.days);
  const soonest = dues[0];
  const nextDue: NextDue | null = soonest
    ? {
        creditorName: soonest.debt.creditor_name,
        tone: soonest.due!.tone,
        label: soonest.due!.label,
      }
    : null;
  const sum = (items: DebtRecord[], pick: (debt: DebtRecord) => number) =>
    items.reduce((total, debt) => total + pick(debt), 0);
  const borrowed = sum(debts, (debt) => debt.original_balance_centavos);
  const remaining = sum(open, (debt) => debt.current_balance_centavos);

  return (
    <SpotlightArea>
      {open.length === 0 ? (
        <DebtsClearHero
          repaidCentavos={borrowed}
          paidCount={paid.length}
          onAdd={addDebt}
        />
      ) : (
        <>
          <DebtsHero
            plan={base}
            strategy={strategy}
            today={today}
            openCount={open.length}
            activeCount={active.length}
            remainingCentavos={remaining}
            borrowedCentavos={borrowed}
            repaidCentavos={borrowed - remaining}
            minimumsCentavos={sum(
              active,
              (debt) => debt.minimum_payment_centavos,
            )}
            interestThisMonthCentavos={monthlyInterestCentavos(
              open.map(toPlanDebt),
            )}
            paidThisMonthCentavos={thisMonth.reduce(
              (total, payment) => total + payment.amountCentavos,
              0,
            )}
            paymentsThisMonth={thisMonth.length}
            nextDue={nextDue}
            overdueCount={dues.filter((item) => item.due!.days < 0).length}
            onAdd={addDebt}
          />
          {active.length > 0 ? (
            <UpcomingPayments
              debts={active}
              today={today}
              onPay={setPaying}
              onEdit={editDebt}
            />
          ) : null}
          <DebtList
            debts={ordered}
            payoffs={payoffs}
            strategy={strategy}
            lastPayments={lastPayments}
            highlightId={highlightId}
            today={today}
            onEdit={editDebt}
            onPay={setPaying}
            onReorder={reorder}
          />
          <PayoffPlanner
            plans={plans}
            base={base}
            minimumsOnly={minimumsOnly}
            strategy={strategy}
            onStrategyChange={chooseStrategy}
            extra={extra}
            onExtraChange={setExtra}
            debts={byId}
            today={today}
          />
        </>
      )}
      {paid.length > 0 ? <PaidOffList debts={paid} /> : null}
      {open.length > 0 ? <DebtsMethod saved={savedStrategy} /> : null}
      <DebtSheet
        open={sheet.open}
        onOpenChange={(next) => setSheet((state) => ({ ...state, open: next }))}
        debt={sheet.debt}
        today={today}
      />
      <PaymentSheet
        debt={paying}
        onOpenChange={(next) => {
          if (!next) setPaying(null);
        }}
        accounts={accounts}
        today={today}
      />
    </SpotlightArea>
  );
}
