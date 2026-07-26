"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDebtAction, type DebtActionState } from "@/lib/debts/actions";

const initial: DebtActionState = { success: false, message: "" };

export function DebtForm() {
  const [state, action, pending] = useActionState(createDebtAction, initial);
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
      <Input
        name="creditorName"
        required
        maxLength={160}
        placeholder="Creditor name"
        aria-label="Creditor name"
      />
      <select
        name="debtType"
        defaultValue="other"
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
        aria-label="Original balance in pesos"
      />
      <Input
        name="minimumPayment"
        inputMode="decimal"
        defaultValue="0.00"
        placeholder="Minimum payment"
        aria-label="Minimum payment in pesos"
      />
      <Input
        name="interestRatePercent"
        type="number"
        min="0"
        max="1000"
        step="0.0001"
        defaultValue="0"
        aria-label="Annual interest rate percent"
      />
      <Input name="nextDueDate" type="date" aria-label="Next due date" />
      <Input
        name="dueDay"
        type="number"
        min="1"
        max="31"
        placeholder="Due day"
        aria-label="Due day"
      />
      <div className="flex gap-2">
        <Input
          name="priority"
          type="number"
          min="1"
          defaultValue="1"
          aria-label="Priority order"
        />
        <Button className="shrink-0" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
