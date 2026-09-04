"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

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
  const [state, action, pending] = useOfflineActionState(
    account ? "account.update" : "account.create",
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
      className={cn(
        "border-border grid min-w-0 gap-4 rounded-2xl border p-4",
        account
          ? "bg-background/50 grid-cols-1 @[20rem]:grid-cols-2"
          : "bg-card sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_160px_auto]",
      )}
    >
      {account && <input type="hidden" name="accountId" value={account.id} />}
      <label className="text-muted-foreground min-w-0 text-xs">
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
      <label className="text-muted-foreground min-w-0 text-xs">
        Account type
        <select
          name="accountType"
          defaultValue={account?.account_type ?? "cash"}
          aria-label="Account type"
          className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="e_wallet">E-wallet</option>
          <option value="savings">Savings</option>
          <option value="investment">Investment</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label
        className={cn(
          "text-muted-foreground min-w-0 text-xs",
          account && "@[20rem]:col-span-2",
        )}
      >
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
        <label className="text-muted-foreground min-w-0 text-xs">
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
      <Button
        type="submit"
        pending={pending}
        pendingLabel={account ? "Saving…" : "Adding…"}
        className={cn("self-end", account && "w-full @[20rem]:col-span-2")}
      >
        {account ? "Save changes" : "Add account"}
      </Button>
    </form>
  );
}
