"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTransferAction,
  type MoneyActionState,
} from "@/lib/money/actions";

export function TransferForm({
  accounts,
  today,
}: {
  accounts: Array<{ id: string; name: string }>;
  today: string;
}) {
  const [state, action, pending] = useActionState(createTransferAction, {
    success: false,
    message: "",
  } satisfies MoneyActionState);
  const form = useRef<HTMLFormElement>(null);
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
      className="border-border bg-card mt-4 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_150px_auto]"
    >
      <select
        name="sourceAccountId"
        required
        aria-label="Source account"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="">From account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <select
        name="destinationAccountId"
        required
        aria-label="Destination account"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="">To account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <Input
        name="amount"
        required
        inputMode="decimal"
        placeholder="Amount"
        aria-label="Transfer amount in pesos"
      />
      <Input
        name="transferDate"
        type="date"
        defaultValue={today}
        required
        aria-label="Transfer date"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record transfer"}
      </Button>
      <Input
        name="description"
        maxLength={240}
        placeholder="Description (optional)"
        aria-label="Transfer description"
        className="sm:col-span-2 lg:col-span-4"
      />
    </form>
  );
}
