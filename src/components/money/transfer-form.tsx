"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initialState: MoneyActionState = {
  success: false,
  message: "",
};

export function TransferForm({
  accounts,
  today,
}: {
  accounts: Array<{ id: string; name: string }>;
  today: string;
}) {
  const [state, action, pending] = useOfflineActionState(
    "transfer.create",
    initialState,
  );
  const form = useRef<HTMLFormElement>(null);
  const canTransfer = accounts.length >= 2;

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      form.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      ref={form}
      action={action}
      className="border-border bg-card grid min-w-0 gap-4 rounded-2xl border p-5 sm:grid-cols-2 sm:p-6"
    >
      <label className="text-muted-foreground min-w-0 text-xs">
        From account
        <select
          name="sourceAccountId"
          required
          aria-label="Source account"
          className="border-border bg-background focus:border-primary/60 focus:ring-primary/20 mt-1.5 min-h-11 w-full min-w-0 rounded-xl border px-3 text-sm transition-[border-color,box-shadow] outline-none focus:ring-2"
        >
          <option value="">Choose source account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted-foreground min-w-0 text-xs">
        To account
        <select
          name="destinationAccountId"
          required
          aria-label="Destination account"
          className="border-border bg-background focus:border-primary/60 focus:ring-primary/20 mt-1.5 min-h-11 w-full min-w-0 rounded-xl border px-3 text-sm transition-[border-color,box-shadow] outline-none focus:ring-2"
        >
          <option value="">Choose destination account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted-foreground min-w-0 text-xs">
        Amount (PHP)
        <Input
          name="amount"
          required
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Transfer amount in pesos"
          className="mt-1.5 font-mono"
        />
      </label>
      <label className="text-muted-foreground min-w-0 text-xs">
        Transfer date
        <Input
          name="transferDate"
          type="date"
          defaultValue={today}
          required
          aria-label="Transfer date"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground min-w-0 text-xs sm:col-span-2">
        Description
        <Input
          name="description"
          maxLength={240}
          placeholder="Optional note about this transfer"
          aria-label="Transfer description"
          className="mt-1.5"
        />
      </label>
      {!canTransfer ? (
        <p
          role="status"
          className="border-border bg-background text-muted-foreground rounded-xl border px-3 py-2 text-sm sm:col-span-2"
        >
          Add at least two active accounts before recording a transfer.
        </p>
      ) : null}
      <div className="flex justify-end sm:col-span-2">
        <Button
          type="submit"
          disabled={pending || !canTransfer}
          pending={pending}
          pendingLabel="Recording…"
          className="w-full sm:w-auto sm:min-w-44"
        >
          Record transfer
        </Button>
      </div>
    </form>
  );
}
