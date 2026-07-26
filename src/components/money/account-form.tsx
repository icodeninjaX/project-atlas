"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAccountAction,
  updateAccountAction,
  type MoneyActionState,
} from "@/lib/money/actions";

const initial: MoneyActionState = { success: false, message: "" };

export function AccountForm({
  account,
}: {
  account?: {
    id: string;
    name: string;
    account_type: string;
    institution: string | null;
  };
}) {
  const submitAction = account ? updateAccountAction : createAccountAction;
  const [state, action, pending] = useActionState(submitAction, initial);
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
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_160px_1fr_160px_auto]"
    >
      {account && <input type="hidden" name="accountId" value={account.id} />}
      <Input
        name="name"
        required
        maxLength={120}
        defaultValue={account?.name}
        placeholder="Account name"
        aria-label="Account name"
      />
      <select
        name="accountType"
        defaultValue={account?.account_type ?? "cash"}
        aria-label="Account type"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="cash">Cash</option>
        <option value="bank">Bank</option>
        <option value="e_wallet">E-wallet</option>
        <option value="savings">Savings</option>
        <option value="investment">Investment</option>
        <option value="other">Other</option>
      </select>
      <Input
        name="institution"
        maxLength={120}
        defaultValue={account?.institution ?? ""}
        placeholder="Institution (optional)"
        aria-label="Institution"
      />
      {!account && (
        <Input
          name="openingBalance"
          inputMode="decimal"
          defaultValue="0.00"
          required
          aria-label="Opening balance in pesos"
        />
      )}
      <Button type="submit" disabled={pending}>
        {pending
          ? account
            ? "Saving…"
            : "Adding…"
          : account
            ? "Save changes"
            : "Add account"}
      </Button>
    </form>
  );
}
