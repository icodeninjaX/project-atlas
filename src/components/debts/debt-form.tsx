"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: DebtActionState = { success: false, message: "" };

export function DebtForm({
  debt,
}: {
  debt?: {
    id: string;
    creditor_name: string;
    debt_type: string;
    original_balance_centavos: number;
    current_balance_centavos: number;
    interest_rate_percent: number;
    minimum_payment_centavos: number;
    due_day: number | null;
    next_due_date: string | null;
    status: string;
    priority: number;
    notes: string | null;
  };
}) {
  const [state, action, pending] = useOfflineActionState(
    debt ? "debt.update" : "debt.create",
    initial,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
    if (state.success) form.current?.reset();
  }, [state]);

  return (
    <form
      ref={form}
      action={action}
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {debt && <input type="hidden" name="debtId" value={debt.id} />}
      {debt && <input type="hidden" name="status" value={debt.status} />}
      <Input
        name="creditorName"
        required
        maxLength={160}
        defaultValue={debt?.creditor_name}
        placeholder="Creditor name"
        aria-label="Creditor name"
      />
      <select
        name="debtType"
        defaultValue={debt?.debt_type ?? "other"}
        aria-label="Debt type"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="online_lending">Online lending</option>
        <option value="credit_card">Credit card</option>
        <option value="personal_loan">Personal loan</option>
        <option value="family">Family</option>
        <option value="installment">Installment</option>
        <option value="other">Other</option>
      </select>
      <Input
        name="originalBalance"
        required
        inputMode="decimal"
        placeholder="Original balance"
        defaultValue={
          debt ? (debt.original_balance_centavos / 100).toFixed(2) : undefined
        }
        aria-label="Original balance in pesos"
      />
      {debt && (
        <Input
          name="currentBalance"
          required
          inputMode="decimal"
          defaultValue={(debt.current_balance_centavos / 100).toFixed(2)}
          placeholder="Current balance"
          aria-label="Current balance in pesos"
        />
      )}
      <Input
        name="minimumPayment"
        inputMode="decimal"
        defaultValue={
          debt ? (debt.minimum_payment_centavos / 100).toFixed(2) : "0.00"
        }
        placeholder="Minimum payment"
        aria-label="Minimum payment in pesos"
      />
      <Input
        name="interestRatePercent"
        type="number"
        min="0"
        max="1000"
        step="0.0001"
        defaultValue={debt?.interest_rate_percent ?? 0}
        aria-label="Annual interest rate percent"
      />
      <Input
        name="nextDueDate"
        type="date"
        defaultValue={debt?.next_due_date ?? ""}
        aria-label="Next due date"
      />
      <Input
        name="dueDay"
        type="number"
        min="1"
        max="31"
        defaultValue={debt?.due_day ?? ""}
        placeholder="Due day"
        aria-label="Due day"
      />
      <Input
        name="notes"
        maxLength={2000}
        defaultValue={debt?.notes ?? ""}
        placeholder="Notes (optional)"
        aria-label="Notes"
        className="sm:col-span-2"
      />
      <div className="flex gap-2">
        <Input
          name="priority"
          type="number"
          min="1"
          defaultValue={debt?.priority ?? 1}
          aria-label="Priority order"
        />
        <Button className="shrink-0" type="submit" disabled={pending}>
          {pending ? "Saving…" : debt ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
