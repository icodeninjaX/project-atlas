"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: DebtActionState = { success: false, message: "" };

export function PaymentForm({
  debtId,
  today,
}: {
  debtId: string;
  today: string;
}) {
  const [state, action, pending] = useOfflineActionState(
    "debtPayment.create",
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
      <label className="text-muted-foreground text-xs">
        Payment amount (PHP)
        <Input
          name="amount"
          required
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Payment amount in pesos"
          className="mt-1.5 font-mono"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Payment date
        <Input
          name="paymentDate"
          type="date"
          defaultValue={today}
          required
          aria-label="Payment date"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Payment note
        <Input
          name="notes"
          maxLength={300}
          placeholder="Optional reference or context"
          aria-label="Payment note"
          className="mt-1.5"
        />
      </label>
      <Button
        type="submit"
        pending={pending}
        pendingLabel="Recording…"
        className="self-end"
      >
        Record payment
      </Button>
    </form>
  );
}
