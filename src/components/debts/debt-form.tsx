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
      <label className="text-muted-foreground text-xs">
        Creditor name
        <Input
          name="creditorName"
          required
          maxLength={160}
          defaultValue={debt?.creditor_name}
          placeholder="e.g. Maya Credit"
          aria-label="Creditor name"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Debt type
        <select
          name="debtType"
          defaultValue={debt?.debt_type ?? "other"}
          aria-label="Debt type"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="online_lending">Online lending</option>
          <option value="credit_card">Credit card</option>
          <option value="personal_loan">Personal loan</option>
          <option value="family">Family</option>
          <option value="installment">Installment</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Original balance (PHP)
        <Input
          name="originalBalance"
          required
          inputMode="decimal"
          placeholder="e.g. 50000"
          defaultValue={
            debt ? (debt.original_balance_centavos / 100).toFixed(2) : undefined
          }
          aria-label="Original balance in pesos"
          className="mt-1.5"
        />
      </label>
      {debt && (
        <label className="text-muted-foreground text-xs">
          Current balance (PHP)
          <Input
            name="currentBalance"
            required
            inputMode="decimal"
            defaultValue={(debt.current_balance_centavos / 100).toFixed(2)}
            placeholder="e.g. 37500"
            aria-label="Current balance in pesos"
            className="mt-1.5"
          />
        </label>
      )}
      <label className="text-muted-foreground text-xs">
        Minimum payment (PHP)
        <Input
          name="minimumPayment"
          inputMode="decimal"
          defaultValue={
            debt ? (debt.minimum_payment_centavos / 100).toFixed(2) : "0.00"
          }
          placeholder="e.g. 5000"
          aria-label="Minimum payment in pesos"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Annual interest rate (%)
        <Input
          name="interestRatePercent"
          type="number"
          min="0"
          max="1000"
          step="0.0001"
          defaultValue={debt?.interest_rate_percent ?? 0}
          aria-label="Annual interest rate percent"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Next due date
        <Input
          name="nextDueDate"
          type="date"
          defaultValue={debt?.next_due_date ?? ""}
          aria-label="Next due date"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Due day of month
        <Input
          name="dueDay"
          type="number"
          min="1"
          max="31"
          defaultValue={debt?.due_day ?? ""}
          placeholder="e.g. 15"
          aria-label="Due day"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2">
        Notes
        <Input
          name="notes"
          maxLength={2000}
          defaultValue={debt?.notes ?? ""}
          placeholder="Add useful payment details (optional)"
          aria-label="Notes"
          className="mt-1.5"
        />
      </label>
      <div className="flex items-end gap-2">
        <label className="text-muted-foreground min-w-0 flex-1 text-xs">
          Priority order
          <Input
            name="priority"
            type="number"
            min="1"
            defaultValue={debt?.priority ?? 1}
            aria-label="Priority order"
            className="mt-1.5"
          />
        </label>
        <Button className="shrink-0" type="submit" disabled={pending}>
          {pending ? "Saving…" : debt ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
