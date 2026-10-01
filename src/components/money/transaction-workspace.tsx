"use client";

import {
  ChevronRight,
  History,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CategoryBadge } from "@/components/money/category-icon";
import { FlowAmount, MoneyAmount } from "@/components/money/money-amount";
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
import { Input } from "@/components/ui/input";
import {
  formatShortDate,
  groupByDate,
  relativeDayLabel,
} from "@/lib/money/history";
import { cn } from "@/lib/utils";

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
  category_icon?: string | null;
};

type TransactionWorkspaceProps = {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  transactions: TransactionHistoryItem[];
  today: string;
  defaultAccountId?: string | null;
  initialView?: TransactionWorkspaceView | null;
  highlightId?: string | null;
  /** Only the account in `?account=` is listed until the filter changes. */
  initialAccountFilter?: string | null;
  /** Shown above History; hidden while recording so the form leads. */
  summary?: ReactNode;
  /** The history query's row cap, to say when older entries are not shown. */
  historyLimit?: number;
};

const VIEWS = [
  {
    value: "record",
    label: "Record a transaction",
    shortLabel: "Record",
    icon: Plus,
  },
  { value: "history", label: "History", shortLabel: "History", icon: History },
] as const;

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];

function transactionTitle(transaction: TransactionHistoryItem) {
  return (
    transaction.merchant_or_source || transaction.category_name || "Transaction"
  );
}

export function TransactionWorkspace({
  accounts,
  categories,
  transactions,
  today,
  defaultAccountId,
  initialView = "history",
  highlightId = null,
  initialAccountFilter = null,
  summary,
  historyLimit,
}: TransactionWorkspaceProps) {
  const [view, setView] = useState<TransactionWorkspaceView>(
    initialView ?? "history",
  );
  const merchantMemory = useMemo<MerchantMemory[]>(
    () =>
      transactions.flatMap((transaction) =>
        transaction.merchant_or_source
          ? [
              {
                merchant: transaction.merchant_or_source,
                type: transaction.transaction_type,
                categoryId: transaction.category_id,
              },
            ]
          : [],
      ),
    [transactions],
  );

  return (
    <div className="mt-6">
      <div
        className="border-border bg-muted/60 grid grid-cols-2 gap-1 rounded-full border p-1 sm:inline-grid sm:min-w-[26rem]"
        role="group"
        aria-label="Transaction view"
      >
        {VIEWS.map(({ value, label, shortLabel, icon: Icon }) => {
          const active = view === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              aria-label={label}
              onClick={() => setView(value)}
              className={cn(
                "focus-visible:ring-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-4 shrink-0", active && "text-primary")}
              />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {view === "record" ? (
        <div id="record-transaction" className="mt-5">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            today={today}
            defaultAccountId={defaultAccountId}
            merchantMemory={merchantMemory}
          />
        </div>
      ) : (
        <>
          {summary ? <div className="mt-5">{summary}</div> : null}
          <TransactionHistory
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            today={today}
            defaultAccountId={defaultAccountId}
            highlightId={highlightId}
            initialAccountFilter={initialAccountFilter}
            merchantMemory={merchantMemory}
            historyLimit={historyLimit}
            onRecord={() => setView("record")}
          />
        </>
      )}
    </div>
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

function TransactionHistory({
  accounts,
  categories,
  transactions,
  today,
  defaultAccountId,
  highlightId,
  initialAccountFilter,
  merchantMemory,
  historyLimit,
  onRecord,
}: Omit<TransactionWorkspaceProps, "initialView" | "summary"> & {
  merchantMemory: MerchantMemory[];
  onRecord: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState(
    initialAccountFilter &&
      transactions.some((item) => item.account_id === initialAccountFilter)
      ? initialAccountFilter
      : "all",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = transactions.find((item) => item.id === editingId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions.filter((item) => {
      if (typeFilter !== "all" && item.transaction_type !== typeFilter) {
        return false;
      }
      if (accountFilter !== "all" && item.account_id !== accountFilter) {
        return false;
      }
      if (!needle) return true;
      return [
        item.merchant_or_source,
        item.category_name,
        item.account_name,
        item.description,
      ].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [accountFilter, query, transactions, typeFilter]);
  const groups = useMemo(
    () => groupByDate(filtered, (item) => item.transaction_date),
    [filtered],
  );
  const filtering =
    query.trim() !== "" || typeFilter !== "all" || accountFilter !== "all";
  const accountOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of transactions) {
      if (!seen.has(item.account_id)) {
        seen.set(item.account_id, item.account_name ?? "Account");
      }
    }
    return [...seen].sort((left, right) => left[1].localeCompare(right[1]));
  }, [transactions]);

  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`transaction-${highlightId}`)
      ?.scrollIntoView({ block: "center" });
  }, [highlightId]);

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setAccountFilter("all");
  }

  return (
    <section
      id="transaction-history"
      aria-labelledby="transaction-history-title"
      className="mt-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="transaction-history-title"
          className="text-lg font-semibold tracking-tight"
        >
          History
        </h2>
        {transactions.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            {filtering
              ? `${filtered.length} of ${transactions.length} shown`
              : historyLimit && transactions.length >= historyLimit
                ? `Latest ${transactions.length} entries`
                : `${transactions.length} ${transactions.length === 1 ? "entry" : "entries"}`}
          </p>
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <div className="border-border bg-card/40 mt-3 grid min-h-56 place-items-center rounded-2xl border border-dashed p-6 text-center">
          <div className="max-w-sm">
            <span className="border-primary/20 bg-primary/10 text-primary mx-auto grid size-11 place-items-center rounded-xl border">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold">
              No money movement recorded
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Record your first income or expense and it will appear here.
            </p>
            <Button type="button" className="mt-4" onClick={onRecord}>
              <Plus className="size-4" aria-hidden="true" />
              Record a transaction
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_14rem]">
            <label className="relative min-w-0">
              <span className="sr-only">Search transactions</span>
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search merchant, category, note"
                aria-label="Search transactions"
                className="bg-card rounded-full pl-10"
              />
            </label>
            <div
              role="group"
              aria-label="Filter by type"
              className="border-border bg-muted/60 grid grid-cols-3 gap-1 rounded-full border p-1"
            >
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={typeFilter === filter.value}
                  onClick={() => setTypeFilter(filter.value)}
                  className={cn(
                    "focus-visible:ring-ring min-h-9 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    typeFilter === filter.value
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {accountOptions.length > 1 ? (
              <select
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value)}
                aria-label="Filter by account"
                className="border-border bg-card focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full min-w-0 rounded-full border px-4 text-base outline-none focus-visible:ring-2 sm:col-span-2 sm:text-sm lg:col-span-1"
              >
                <option value="all">All accounts</option>
                {accountOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <div className="border-border mt-4 grid place-items-center rounded-2xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-semibold">No transactions match</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Try another search or filter.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                <X className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {groups.map((group) => {
                const dayNet = group.items.reduce(
                  (sum, item) =>
                    sum +
                    (item.transaction_type === "income"
                      ? item.amount_centavos
                      : -item.amount_centavos),
                  0,
                );
                const label = relativeDayLabel(group.date, today);
                return (
                  <section
                    key={group.date}
                    aria-label={`${label}, ${group.items.length} ${group.items.length === 1 ? "transaction" : "transactions"}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
                      <h3 className="text-sm font-semibold">
                        {label}
                        {label === "Today" || label === "Yesterday" ? (
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            {formatShortDate(group.date)}
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-muted-foreground font-mono text-xs">
                        <span className="sr-only">Day net </span>
                        <MoneyAmount
                          centavos={dayNet}
                          sign={dayNet === 0 ? "negative" : "always"}
                        />
                      </p>
                    </div>
                    <ul className="border-border bg-card divide-border mt-2 divide-y overflow-hidden rounded-2xl border">
                      {group.items.map((transaction) => {
                        const direction =
                          transaction.transaction_type === "income"
                            ? "in"
                            : "out";
                        const highlighted = highlightId === transaction.id;
                        return (
                          <li
                            key={transaction.id}
                            id={`transaction-${transaction.id}`}
                            className={cn(highlighted && "bg-primary/[0.08]")}
                          >
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              onClick={() => setEditingId(transaction.id)}
                              className="group hover:bg-muted/50 focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                            >
                              <span className="sr-only">Edit</span>{" "}
                              <CategoryBadge
                                icon={transaction.category_icon}
                                name={transaction.category_name}
                                direction={direction}
                              />
                              {/* The amount wraps under the title only
                                  when both cannot share a line. */}
                              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="min-w-[min(100%,9rem)] flex-1">
                                  <span className="block truncate text-sm font-semibold">
                                    {transactionTitle(transaction)}
                                  </span>{" "}
                                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                                    {transaction.category_name ?? "Category"} ·{" "}
                                    {transaction.account_name ?? "Account"}
                                  </span>{" "}
                                  {transaction.description ? (
                                    <span className="text-muted-foreground/90 mt-0.5 block truncate text-xs">
                                      {transaction.description}
                                    </span>
                                  ) : null}
                                </span>{" "}
                                <span className="ml-auto text-right font-mono text-sm font-semibold whitespace-nowrap">
                                  <FlowAmount
                                    centavos={transaction.amount_centavos}
                                    direction={direction}
                                  />
                                </span>
                              </span>
                              <ChevronRight
                                aria-hidden="true"
                                className="text-muted-foreground/60 group-hover:text-foreground hidden size-4 shrink-0 transition-colors sm:block"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <MoneySheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        eyebrow={
          editing
            ? editing.transaction_type === "income"
              ? "Income"
              : "Expense"
            : null
        }
        title={editing ? transactionTitle(editing) : "Transaction"}
        description={
          editing
            ? `${relativeDayLabel(editing.transaction_date, today)} · ${editing.account_name ?? "Account"}`
            : undefined
        }
        closeLabel="Close transaction"
      >
        {editing ? (
          <div className="space-y-5">
            <TransactionForm
              key={editing.id}
              layout="compact"
              accounts={accounts}
              categories={categories}
              today={today}
              defaultAccountId={defaultAccountId}
              transaction={editing}
              merchantMemory={merchantMemory}
              onSuccess={() => setEditingId(null)}
            />
            <div className="border-border border-t pt-3">
              <DeleteTransactionControl
                key={editing.id}
                transactionId={editing.id}
                onDeleted={() => setEditingId(null)}
              />
            </div>
          </div>
        ) : null}
      </MoneySheet>
    </section>
  );
}
