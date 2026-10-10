"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import { DebtList, PaidOffList } from "@/components/debts/debt-list";
import { DebtSheet } from "@/components/debts/debt-sheet";
import { DebtsClearHero, DebtsHero } from "@/components/debts/debts-hero";
import type { PaymentAccount } from "@/components/debts/payment-form";
import { PaymentSheet } from "@/components/debts/payment-sheet";
import { PayoffPlanner } from "@/components/debts/payoff-planner";
import { UpcomingPayments } from "@/components/debts/upcoming-payments";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import type { DebtRecord, DebtStrategy } from "@/lib/debts/debt";
import {
  STRATEGIES,
  dueStatus,
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
 * Open debts for the list: the soonest due first, then the rest by size,
 * so the list reads the same whichever payoff order is chosen.
 */
function byUrgency(debts: DebtRecord[], today: string) {
  const days = (debt: DebtRecord) =>
    debt.status === "active"
      ? (dueStatus(debt.next_due_date, today)?.days ?? Infinity)
      : Infinity;
  return [...debts].sort(
    (left, right) =>
      days(left) - days(right) ||
      right.current_balance_centavos - left.current_balance_centavos,
  );
}

/**
 * The debts page body, one question per section: how much is owed, what
 * to pay next, what each debt looks like, and when it all ends. The plan's
 * order and any extra amount stay in this tab; the order is also kept in
 * the address.
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
  // A new "My own order" shows at once, until the saved debts return.
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
    () => new Map(open.map((debt) => [debt.id, debt])),
    [open],
  );
  const extraCentavos = parsePesoInput(extra) ?? 0;

  const { plans, base } = useMemo(() => {
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
    };
  }, [extraCentavos, open, strategy]);

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
  const active = open.filter((debt) => debt.status === "active");
  const sum = (items: DebtRecord[], pick: (debt: DebtRecord) => number) =>
    items.reduce((total, debt) => total + pick(debt), 0);
  const overdueCount = active.filter(
    (debt) => (dueStatus(debt.next_due_date, today)?.days ?? 0) < 0,
  ).length;

  return (
    <SpotlightArea>
      {open.length === 0 ? (
        <DebtsClearHero
          repaidCentavos={sum(debts, (debt) => debt.original_balance_centavos)}
          paidCount={paid.length}
          onAdd={addDebt}
        />
      ) : (
        <>
          <DebtsHero
            plan={base}
            today={today}
            remainingCentavos={sum(
              open,
              (debt) => debt.current_balance_centavos,
            )}
            owedInAllCentavos={sum(
              debts,
              (debt) => debt.original_balance_centavos,
            )}
            minimumsCentavos={sum(
              active,
              (debt) => debt.minimum_payment_centavos,
            )}
            paidThisMonthCentavos={payments
              .filter((payment) => payment.paymentDate.startsWith(month))
              .reduce((total, payment) => total + payment.amountCentavos, 0)}
            overdueCount={overdueCount}
            onAdd={addDebt}
          />
          {/* Phones read top to bottom; wide screens put what to pay
              beside the plan. */}
          <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-6">
            {/* On phones the left column melts away so "Paid off" can
                close the page, after the plan. */}
            <div className="contents lg:block lg:min-w-0">
              {active.length > 0 ? (
                <UpcomingPayments
                  debts={active}
                  today={today}
                  onPay={setPaying}
                  onEdit={editDebt}
                />
              ) : null}
              <DebtList
                debts={byUrgency(open, today)}
                highlightId={highlightId}
                today={today}
              />
              {paid.length > 0 ? (
                <div className="order-last lg:order-none">
                  <PaidOffList debts={paid} />
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <PayoffPlanner
                plans={plans}
                base={base}
                strategy={strategy}
                onStrategyChange={chooseStrategy}
                extra={extra}
                onExtraChange={setExtra}
                debts={byId}
                today={today}
                savedStrategy={savedStrategy}
                onReorder={reorder}
              />
            </div>
          </div>
        </>
      )}
      {open.length === 0 && paid.length > 0 ? (
        <PaidOffList debts={paid} />
      ) : null}
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
