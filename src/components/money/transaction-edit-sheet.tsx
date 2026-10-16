"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { MoneySheet } from "@/components/money/money-sheet";
import {
  TransactionForm,
  type MerchantMemory,
  type TransactionFormAccount,
  type TransactionFormCategory,
} from "@/components/money/transaction-form";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { relativeDayLabel } from "@/lib/money/history";

export type EditableTransactionItem = {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: "expense" | "income";
  amount_centavos: number;
  transaction_date: string;
  transaction_time: string | null;
  merchant_or_source: string | null;
  description: string | null;
  account_name: string | null;
  category_name: string | null;
};

export function transactionTitle(transaction: {
  merchant_or_source: string | null;
  category_name: string | null;
}) {
  return (
    transaction.merchant_or_source || transaction.category_name || "Transaction"
  );
}

function DeleteTransactionControl({
  transactionId,
  onDeleted,
}: {
  transactionId: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:text-destructive w-full justify-start"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete transaction
      </Button>
    );
  }

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-2xl border p-4">
      <p className="text-sm font-semibold">Delete this transaction?</p>
      <p className="text-muted-foreground mt-1 text-xs leading-5">
        Its account balance and monthly totals will no longer include it. This
        cannot be undone.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(false)}
        >
          Keep it
        </Button>
        <OfflineMutationForm
          mutation="transaction.delete"
          onResult={(result) => {
            if (result.success) onDeleted();
          }}
        >
          <input type="hidden" name="transactionId" value={transactionId} />
          <FormSubmitButton
            variant="destructive"
            pendingLabel="Deleting…"
            className="w-full"
          >
            Delete
          </FormSubmitButton>
        </OfflineMutationForm>
      </div>
    </div>
  );
}

/** Edit or delete one recorded transaction, in a sheet. */
export function TransactionEditSheet({
  transaction,
  accounts,
  categories,
  today,
  defaultAccountId,
  merchantMemory,
  onClose,
}: {
  transaction: EditableTransactionItem | null;
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  today: string;
  defaultAccountId?: string | null;
  merchantMemory?: MerchantMemory[];
  onClose: () => void;
}) {
  return (
    <MoneySheet
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      eyebrow={
        transaction
          ? transaction.transaction_type === "income"
            ? "Income"
            : "Expense"
          : null
      }
      title={transaction ? transactionTitle(transaction) : "Transaction"}
      description={
        transaction
          ? `${relativeDayLabel(transaction.transaction_date, today)} · ${transaction.account_name ?? "Account"}`
          : undefined
      }
      closeLabel="Close transaction"
    >
      {transaction ? (
        <div className="space-y-5">
          <TransactionForm
            key={transaction.id}
            layout="compact"
            accounts={accounts}
            categories={categories}
            today={today}
            defaultAccountId={defaultAccountId}
            transaction={transaction}
            merchantMemory={merchantMemory}
            onSuccess={onClose}
          />
          <div className="border-border border-t pt-3">
            <DeleteTransactionControl
              key={transaction.id}
              transactionId={transaction.id}
              onDeleted={onClose}
            />
          </div>
        </div>
      ) : null}
    </MoneySheet>
  );
}

/** Merchants seen in these transactions, for the form's suggestions. */
export function merchantMemoryOf(
  transactions: ReadonlyArray<
    Pick<
      EditableTransactionItem,
      "merchant_or_source" | "transaction_type" | "category_id"
    >
  >,
): MerchantMemory[] {
  return transactions.flatMap((transaction) =>
    transaction.merchant_or_source
      ? [
          {
            merchant: transaction.merchant_or_source,
            type: transaction.transaction_type,
            categoryId: transaction.category_id,
          },
        ]
      : [],
  );
}
