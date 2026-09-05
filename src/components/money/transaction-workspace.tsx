"use client";

import { History, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { TooltipHint } from "@/components/ui/tooltip";
import { formatCentavos } from "@/lib/money/money";
import { TransactionForm } from "./transaction-form";

export type TransactionWorkspaceView = "record" | "history";

export type TransactionHistoryItem = {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: "expense" | "income";
  amount_centavos: number;
  transaction_date: string;
  merchant_or_source: string | null;
  description: string | null;
  account_name: string | null;
  category_name: string | null;
};

type TransactionWorkspaceProps = {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; category_type: string }>;
  transactions: TransactionHistoryItem[];
  today: string;
  defaultAccountId?: string | null;
  initialView?: TransactionWorkspaceView | null;
  highlightId?: string | null;
};

export function TransactionWorkspace({
  accounts,
  categories,
  transactions,
  today,
  defaultAccountId,
  initialView = null,
  highlightId = null,
}: TransactionWorkspaceProps) {
  const [view, setView] = useState<TransactionWorkspaceView | null>(
    initialView,
  );

  return (
    <div className="mt-6">
      <div
        className="grid gap-3 sm:grid-cols-2"
        role="group"
        aria-label="Transaction options"
      >
        <Button
          type="button"
          size="lg"
          variant={view === "record" ? "default" : "secondary"}
          aria-pressed={view === "record"}
          onClick={() => setView("record")}
        >
          <Plus className="size-4" />
          Record a transaction
        </Button>
        <Button
          type="button"
          size="lg"
          variant={view === "history" ? "default" : "secondary"}
          aria-pressed={view === "history"}
          onClick={() => setView("history")}
        >
          <History className="size-4" />
          View transaction history
        </Button>
      </div>

      {view === "record" && (
        <div id="record-transaction" className="mt-4">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            today={today}
            defaultAccountId={defaultAccountId}
          />
        </div>
      )}

      {view === "history" && (
        <TransactionHistory
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          today={today}
          defaultAccountId={defaultAccountId}
          highlightId={highlightId}
        />
      )}
    </div>
  );
}

function TransactionHistory({
  accounts,
  categories,
  transactions,
  today,
  defaultAccountId,
  highlightId,
}: Omit<TransactionWorkspaceProps, "initialView">) {
  const [editing, setEditing] = useState(false);

  return (
    <section
      id="transaction-history"
      className="border-border bg-card mt-4 overflow-hidden rounded-2xl border"
    >
      <div className="border-border flex items-center justify-between gap-4 border-b p-4">
        <h2 className="text-lg font-semibold">History</h2>
        <TooltipHint
          label={
            editing ? "Finish editing history" : "Edit transaction history"
          }
        >
          <Button
            type="button"
            variant={editing ? "default" : "ghost"}
            size="icon"
            disabled={transactions.length === 0}
            aria-label={
              editing
                ? "Finish editing transaction history"
                : "Edit transaction history"
            }
            aria-pressed={editing}
            onClick={() => setEditing((current) => !current)}
          >
            <Pencil className="size-4" />
          </Button>
        </TooltipHint>
      </div>

      {transactions.length === 0 ? (
        <div className="grid min-h-60 place-items-center text-center">
          <div>
            <ReceiptText className="text-primary mx-auto size-6" />
            <p className="mt-4 text-sm font-semibold">
              No money movement recorded.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Add an account, then record the first income or expense.
            </p>
          </div>
        </div>
      ) : (
        transactions.map((transaction) => (
          <div
            key={transaction.id}
            id={`transaction-${transaction.id}`}
            className={`border-border flex items-center gap-4 border-b p-4 last:border-b-0 ${
              highlightId === transaction.id ? "bg-primary/[0.08]" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {transaction.merchant_or_source ||
                  transaction.category_name ||
                  "Transaction"}
              </p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {transaction.transaction_date} ·{" "}
                {transaction.account_name ?? "Account"} ·{" "}
                {transaction.category_name ?? "Category"}
              </p>
            </div>
            <p
              className={`font-mono text-sm font-semibold ${transaction.transaction_type === "income" ? "text-primary" : ""}`}
            >
              <SensitiveValue>
                {transaction.transaction_type === "income" ? "+" : "−"}
                {formatCentavos(transaction.amount_centavos)}
              </SensitiveValue>
            </p>

            {editing && (
              <>
                <details className="relative">
                  <TooltipHint label="Edit transaction">
                    <summary className="text-muted-foreground hover:bg-muted grid size-10 cursor-pointer list-none place-items-center rounded-xl [&::-webkit-details-marker]:hidden">
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit transaction</span>
                    </summary>
                  </TooltipHint>
                  <div className="border-border bg-card absolute right-0 z-10 mt-2 w-[min(90vw,720px)] rounded-2xl border p-3 shadow-xl">
                    <TransactionForm
                      accounts={accounts}
                      categories={categories}
                      today={today}
                      defaultAccountId={defaultAccountId}
                      transaction={transaction}
                    />
                  </div>
                </details>
                <OfflineMutationForm mutation="transaction.delete">
                  <input
                    type="hidden"
                    name="transactionId"
                    value={transaction.id}
                  />
                  <TooltipHint label="Delete transaction">
                    <FormSubmitButton
                      variant="ghost"
                      size="icon"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </FormSubmitButton>
                  </TooltipHint>
                </OfflineMutationForm>
              </>
            )}
          </div>
        ))
      )}
    </section>
  );
}
