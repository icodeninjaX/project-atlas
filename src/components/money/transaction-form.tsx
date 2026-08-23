"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: MoneyActionState = { success: false, message: "" };

export function TransactionForm({
  accounts,
  categories,
  today,
  transaction,
}: {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; category_type: string }>;
  today: string;
  transaction?: {
    id: string;
    account_id: string;
    category_id: string;
    transaction_type: "expense" | "income";
    amount_centavos: number;
    transaction_date: string;
    merchant_or_source: string | null;
    description: string | null;
  };
}) {
  const [state, action, pending] = useOfflineActionState(
    transaction ? "transaction.update" : "transaction.create",
    initial,
  );
  const [type, setType] = useState<"expense" | "income">(
    transaction?.transaction_type ?? "expense",
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
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {transaction && (
        <input type="hidden" name="transactionId" value={transaction.id} />
      )}
      <label className="text-muted-foreground text-xs">
        Transaction type
        <select
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "expense" | "income")
          }
          aria-label="Transaction type"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Account
        <select
          name="accountId"
          required
          defaultValue={transaction?.account_id ?? ""}
          aria-label="Account"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="">Choose account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Category
        <select
          name="categoryId"
          required
          defaultValue={transaction?.category_id ?? ""}
          aria-label="Category"
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="">Choose category</option>
          {categories
            .filter((category) => category.category_type === type)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Amount (PHP)
        <Input
          name="amount"
          inputMode="decimal"
          required
          placeholder="0.00"
          defaultValue={
            transaction
              ? (Number(transaction.amount_centavos) / 100).toFixed(2)
              : undefined
          }
          aria-label="Amount in pesos"
          className="mt-1.5 font-mono"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Transaction date
        <Input
          name="transactionDate"
          type="date"
          defaultValue={transaction?.transaction_date ?? today}
          required
          aria-label="Transaction date"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Merchant or source
        <Input
          name="merchantOrSource"
          maxLength={160}
          defaultValue={transaction?.merchant_or_source ?? ""}
          placeholder="e.g. Grocery or payroll"
          aria-label="Merchant or source"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Description
        <Input
          name="description"
          maxLength={300}
          defaultValue={transaction?.description ?? ""}
          placeholder="Optional context"
          aria-label="Description"
          className="mt-1.5"
        />
      </label>
      <Button
        type="submit"
        disabled={pending || accounts.length === 0}
        className="self-end"
      >
        {pending
          ? "Saving…"
          : transaction
            ? "Save changes"
            : "Record transaction"}
      </Button>
    </form>
  );
}
