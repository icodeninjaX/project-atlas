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
      <label className="text-muted-foreground text-xs">
        Account name
        <Input
          name="name"
          required
          maxLength={120}
          defaultValue={account?.name}
          placeholder="e.g. Maya wallet"
          aria-label="Account name"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Account type
        <select
          name="accountType"
          defaultValue={account?.account_type ?? "cash"}
          aria-label="Account type"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="e_wallet">E-wallet</option>
          <option value="savings">Savings</option>
          <option value="investment">Investment</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Institution
        <Input
          name="institution"
          maxLength={120}
          defaultValue={account?.institution ?? ""}
          placeholder="Optional bank or provider"
          aria-label="Institution"
          className="mt-1.5"
        />
      </label>
      {!account && (
        <label className="text-muted-foreground text-xs">
          Opening balance (PHP)
          <Input
            name="openingBalance"
            inputMode="decimal"
            defaultValue="0.00"
            required
            aria-label="Opening balance in pesos"
            className="mt-1.5 font-mono"
          />
        </label>
      )}
      <Button type="submit" disabled={pending} className="self-end">
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
