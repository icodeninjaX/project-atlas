"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centavosToPesoInput } from "@/lib/money/money";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: MoneyActionState = { success: false, message: "" };

export function BalanceAdjustmentForm({
  accountId,
  accountName,
  currentBalanceCentavos,
  today,
}: {
  accountId: string;
  accountName: string;
  currentBalanceCentavos: number;
  today: string;
}) {
  const [state, action, pending] = useOfflineActionState(
    "account.adjustBalance",
    initial,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form
      action={action}
      className="border-border bg-background/50 mt-3 grid min-w-0 gap-3 rounded-xl border p-3 @[20rem]:grid-cols-2"
    >
      <input type="hidden" name="accountId" value={accountId} />
      <p className="text-muted-foreground text-xs leading-5 @[20rem]:col-span-2">
        Enter the amount you actually have. Atlas records only the difference as
        a correction, so income and expense reports stay accurate.
      </p>
      <label className="text-muted-foreground min-w-0 text-xs">
        New Balance (PHP)
        <Input
          key={currentBalanceCentavos}
          name="targetBalance"
          inputMode="decimal"
          defaultValue={centavosToPesoInput(currentBalanceCentavos)}
          required
          aria-label={`New current balance for ${accountName} in pesos`}
          className="mt-1.5 font-mono"
        />
      </label>
      <label className="text-muted-foreground min-w-0 text-xs">
        Adjustment date
        <Input
          name="adjustmentDate"
          type="date"
          defaultValue={today}
          required
          aria-label={`Balance adjustment date for ${accountName}`}
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground min-w-0 text-xs @[20rem]:col-span-2">
        Note
        <Input
          name="note"
          maxLength={300}
          placeholder="Optional reason, e.g. reconciled with bank app"
          aria-label={`Balance adjustment note for ${accountName}`}
          className="mt-1.5"
        />
      </label>
      <Button
        type="submit"
        disabled={pending}
        className="w-full @[20rem]:col-span-2"
      >
        {pending ? "Adjusting…" : "Save balance adjustment"}
      </Button>
    </form>
  );
}
