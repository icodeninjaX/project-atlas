"use client";

import { MoneyAmount } from "@/components/money/money-amount";
import { MoneySheet } from "@/components/money/money-sheet";
import {
  PaymentForm,
  type PaymentAccount,
} from "@/components/debts/payment-form";
import type { DebtRecord } from "@/lib/debts/debt";

/**
 * Records a payment for one debt without leaving the list: a bottom sheet
 * on phones and a side panel from `sm` up. It closes once the payment saves.
 */
export function PaymentSheet({
  debt,
  onOpenChange,
  accounts,
  today,
}: {
  /** The debt being paid; null keeps the sheet closed. */
  debt: DebtRecord | null;
  onOpenChange: (open: boolean) => void;
  accounts: PaymentAccount[];
  /** YYYY-MM-DD in Manila. */
  today: string;
}) {
  return (
    <MoneySheet
      open={debt !== null}
      onOpenChange={onOpenChange}
      eyebrow="Money / Debts"
      title={debt ? `Pay ${debt.creditor_name}` : "Record a payment"}
      description={
        debt ? (
          <>
            <MoneyAmount
              centavos={debt.current_balance_centavos}
              className="text-foreground font-mono font-semibold"
            />{" "}
            still owed
            {debt.minimum_payment_centavos > 0 ? (
              <>
                {" "}
                ·{" "}
                <MoneyAmount
                  centavos={debt.minimum_payment_centavos}
                  className="font-mono"
                />{" "}
                minimum
              </>
            ) : null}
          </>
        ) : undefined
      }
      closeLabel="Close payment form"
    >
      {debt ? (
        <PaymentForm
          key={debt.id}
          debtId={debt.id}
          today={today}
          balanceCentavos={debt.current_balance_centavos}
          minimumCentavos={debt.minimum_payment_centavos}
          nextDueDate={debt.status === "active" ? debt.next_due_date : null}
          dueDay={debt.due_day}
          accounts={accounts}
          onSaved={() => onOpenChange(false)}
        />
      ) : null}
    </MoneySheet>
  );
}
