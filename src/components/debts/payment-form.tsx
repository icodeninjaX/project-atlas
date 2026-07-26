"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  recordDebtPaymentAction,
  type DebtActionState,
} from "@/lib/debts/actions";

const initial: DebtActionState = { success: false, message: "" };

export function PaymentForm({
  debtId,
  today,
}: {
  debtId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(
    recordDebtPaymentAction,
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
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_170px_1fr_auto]"
    >
      <input type="hidden" name="debtId" value={debtId} />
      <Input
        name="amount"
        required
        inputMode="decimal"
        placeholder="Payment amount"
        aria-label="Payment amount in pesos"
      />
      <Input
        name="paymentDate"
        type="date"
        defaultValue={today}
        required
        aria-label="Payment date"
      />
      <Input
        name="notes"
        maxLength={300}
        placeholder="Note (optional)"
        aria-label="Payment note"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
