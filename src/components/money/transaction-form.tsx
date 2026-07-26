"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTransactionAction,
  type MoneyActionState,
} from "@/lib/money/actions";

const initial: MoneyActionState = { success: false, message: "" };

export function TransactionForm({
  accounts,
  categories,
  today,
}: {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; category_type: string }>;
  today: string;
}) {
  const [state, action, pending] = useActionState(
    createTransactionAction,
    initial,
  );
  const [type, setType] = useState<"expense" | "income">("expense");
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
      <select
        name="type"
        value={type}
        onChange={(event) =>
          setType(event.target.value as "expense" | "income")
        }
        aria-label="Transaction type"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <select
        name="accountId"
        required
        aria-label="Account"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
      >
        <option value="">Choose account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <select
        name="categoryId"
        required
        aria-label="Category"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
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
      <Input
        name="amount"
        inputMode="decimal"
        required
        placeholder="0.00"
        aria-label="Amount in pesos"
      />
      <Input
        name="transactionDate"
        type="date"
        defaultValue={today}
        required
        aria-label="Transaction date"
      />
      <Input
        name="merchantOrSource"
        maxLength={160}
        placeholder="Merchant or source"
        aria-label="Merchant or source"
      />
      <Input
        name="description"
        maxLength={300}
        placeholder="Description (optional)"
        aria-label="Description"
      />
      <Button type="submit" disabled={pending || accounts.length === 0}>
        {pending ? "Recording…" : "Record transaction"}
      </Button>
    </form>
  );
}
