"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { AccountLogo } from "@/components/money/account-visuals";
import { CategoryBadge, CategoryIcon } from "@/components/money/category-icon";
import { FlowAmount, MoneyAmount } from "@/components/money/money-amount";
import {
  AmountField,
  DateField,
  focusForNextEntry,
} from "@/components/money/money-fields";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import {
  formatPesoInput,
  parsePesoInput,
  relativeDayLabel,
} from "@/lib/money/history";
import { formatCentavos } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initial: MoneyActionState = { success: false, message: "" };

type TransactionType = "expense" | "income";

export type TransactionFormAccount = {
  id: string;
  name: string;
  account_type?: string;
  provider_id?: string | null;
  current_balance_centavos?: number;
};

export type TransactionFormCategory = {
  id: string;
  name: string;
  category_type: string;
  icon?: string | null;
};

/** A merchant seen before, with the category and type it was last used with. */
export type MerchantMemory = {
  merchant: string;
  type: TransactionType;
  categoryId: string;
};

type EditableTransaction = {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: TransactionType;
  amount_centavos: number;
  transaction_date: string;
  merchant_or_source: string | null;
  description: string | null;
};

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense", icon: ArrowUpRight },
  { value: "income", label: "Income", icon: ArrowDownLeft },
] as const;

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Transaction type</legend>
      <div className="border-border bg-muted/70 mx-auto grid max-w-xs grid-cols-2 gap-1 rounded-full border p-1">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "has-[:focus-visible]:ring-ring relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 sm:min-h-10",
                selected
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4",
                  selected &&
                    (option.value === "income"
                      ? "text-positive"
                      : "text-primary"),
                )}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: TransactionFormCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">Category</legend>
      {categories.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          No categories for this type yet.
        </p>
      ) : (
        // Rem-based columns: larger text means fewer, still-legible tiles.
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,5.5rem),1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))]">
          {categories.map((category) => {
            const selected = value === category.id;
            return (
              <label
                key={category.id}
                className={cn(
                  "has-[:focus-visible]:ring-ring relative flex min-h-[4.75rem] min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2.5 text-center text-[0.6875rem] leading-4 font-medium transition-colors has-[:focus-visible]:ring-2 sm:text-xs",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {/* Covers the tile so native validation points at it. */}
                <input
                  type="radio"
                  name="categoryId"
                  value={category.id}
                  checked={selected}
                  onChange={() => onChange(category.id)}
                  required
                  className="absolute inset-0 cursor-pointer appearance-none rounded-2xl outline-none"
                />
                <span
                  className={cn(
                    "pointer-events-none grid size-9 place-items-center rounded-xl transition-colors",
                    selected
                      ? "bg-primary-solid text-primary-solid-foreground"
                      : "bg-muted text-foreground/80",
                  )}
                >
                  <CategoryIcon
                    icon={category.icon}
                    categoryName={category.name}
                    className="size-[1.125rem]"
                    aria-hidden="true"
                  />
                </span>
                <span className="pointer-events-none line-clamp-2 w-full [overflow-wrap:anywhere] hyphens-auto">
                  {category.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
  legend,
}: {
  accounts: TransactionFormAccount[];
  value: string;
  onChange: (accountId: string) => void;
  legend: string;
}) {
  const idBase = useId();

  if (accounts.length === 0) {
    return (
      <div className="border-border rounded-2xl border border-dashed p-4 text-sm">
        <p className="font-semibold">Add an account first</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Every transaction belongs to a cash, bank, or e-wallet account.
        </p>
        <Link
          href="/money/accounts"
          className="text-primary focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Open accounts <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))]">
        {accounts.map((account) => {
          const selected = value === account.id;
          const balanceId = `${idBase}-${account.id}`;
          return (
            <label
              key={account.id}
              className={cn(
                "has-[:focus-visible]:ring-ring relative flex min-h-14 min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border py-2.5 pr-2 pl-3 transition-colors has-[:focus-visible]:ring-2",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/60 hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="accountId"
                value={account.id}
                checked={selected}
                onChange={() => onChange(account.id)}
                required
                aria-label={account.name}
                aria-describedby={
                  account.current_balance_centavos === undefined
                    ? undefined
                    : balanceId
                }
                className="absolute inset-0 cursor-pointer appearance-none rounded-2xl outline-none"
              />
              <span className="pointer-events-none relative shrink-0">
                <AccountLogo
                  account={{
                    name: account.name,
                    account_type: account.account_type ?? "other",
                    provider_id: account.provider_id,
                  }}
                />
                {selected ? (
                  <span className="bg-primary-solid text-primary-solid-foreground ring-card absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2">
                    <Check
                      aria-hidden="true"
                      className="size-2.5"
                      strokeWidth={3}
                    />
                  </span>
                ) : null}
              </span>
              <span className="pointer-events-none min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm leading-tight font-semibold break-words">
                  {account.name}
                </span>
                {account.current_balance_centavos === undefined ? null : (
                  <span
                    id={balanceId}
                    className="text-muted-foreground mt-0.5 block font-mono text-xs [overflow-wrap:anywhere]"
                  >
                    <MoneyAmount
                      centavos={Number(account.current_balance_centavos)}
                    />
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Records or edits one income or expense. Built for repeat entry: after a
 * successful record the amount, category, and details clear while the type,
 * account, and date stay, so the next entry starts where you are.
 */
export function TransactionForm({
  accounts,
  categories,
  today,
  defaultAccountId,
  transaction,
  merchantMemory = [],
  layout = "full",
  onSuccess,
}: {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  today: string;
  defaultAccountId?: string | null;
  transaction?: EditableTransaction;
  merchantMemory?: MerchantMemory[];
  /** `full` adds the live preview column on wide screens. */
  layout?: "full" | "compact";
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(transaction);
  const { submit } = useOfflineSync();
  const amountRef = useRef<HTMLInputElement>(null);
  const datalistId = useId();

  const [type, setType] = useState<TransactionType>(
    transaction?.transaction_type ?? "expense",
  );
  const [amount, setAmount] = useState(
    transaction
      ? formatPesoInput((Number(transaction.amount_centavos) / 100).toFixed(2))
      : "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [accountId, setAccountId] = useState(() => {
    if (transaction) return transaction.account_id;
    if (
      defaultAccountId &&
      accounts.some((account) => account.id === defaultAccountId)
    ) {
      return defaultAccountId;
    }
    return accounts.length === 1 ? accounts[0]!.id : "";
  });
  const [date, setDate] = useState(transaction?.transaction_date ?? today);
  const [merchant, setMerchant] = useState(
    transaction?.merchant_or_source ?? "",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );

  const [, action, pending] = useActionState(
    async (_state: MoneyActionState, formData: FormData) => {
      const result = await submit(
        isEdit ? "transaction.update" : "transaction.create",
        formData,
      );
      if (!result.success) {
        toast.error(result.message);
        return result;
      }
      toast.success(result.message);
      if (!isEdit) {
        setAmount("");
        setCategoryId("");
        setMerchant("");
        setDescription("");
        focusForNextEntry(amountRef.current);
      }
      onSuccess?.();
      return result;
    },
    initial,
  );

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.category_type === type),
    [categories, type],
  );
  const merchantsForType = useMemo(() => {
    const seen = new Set<string>();
    return merchantMemory.filter((entry) => {
      const key = entry.merchant.toLowerCase();
      if (entry.type !== type || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [merchantMemory, type]);

  const amountCentavos = parsePesoInput(amount);
  const validAmount = amountCentavos !== null && amountCentavos > 0;
  const account = accounts.find((item) => item.id === accountId) ?? null;
  const category = categories.find((item) => item.id === categoryId) ?? null;
  const direction = type === "income" ? "in" : "out";
  const balanceAfter =
    !isEdit && validAmount && account?.current_balance_centavos !== undefined
      ? Number(account.current_balance_centavos) +
        (type === "income" ? amountCentavos : -amountCentavos)
      : null;

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategoryId("");
  }

  function changeMerchant(value: string) {
    setMerchant(value);
    // A merchant you have used before brings back its category.
    if (categoryId) return;
    const remembered = merchantsForType.find(
      (entry) => entry.merchant.toLowerCase() === value.trim().toLowerCase(),
    );
    if (
      remembered &&
      visibleCategories.some((item) => item.id === remembered.categoryId)
    ) {
      setCategoryId(remembered.categoryId);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  const full = layout === "full";
  const submitLabel = isEdit
    ? "Save changes"
    : type === "expense"
      ? "Record expense"
      : "Record income";

  const fields = (
    <div className="min-w-0 space-y-7">
      <TypeToggle value={type} onChange={changeType} />
      <AmountField
        ref={amountRef}
        name="amount"
        value={amount}
        onValueChange={setAmount}
        label={type === "expense" ? "Amount spent" : "Amount received"}
        ariaLabel="Amount in pesos"
        size={full ? "hero" : "compact"}
      />
      <CategoryPicker
        categories={visibleCategories}
        value={categoryId}
        onChange={setCategoryId}
      />
      <AccountPicker
        accounts={accounts}
        value={accountId}
        onChange={setAccountId}
        legend={type === "expense" ? "Paid from" : "Received into"}
      />
      <DateField
        name="transactionDate"
        value={date}
        onValueChange={setDate}
        today={today}
        legend="When"
        ariaLabel="Transaction date"
      />
      <fieldset className="min-w-0">
        <legend className="text-sm font-semibold">
          Details{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-muted-foreground min-w-0 text-xs font-medium">
            {type === "expense" ? "Merchant" : "Source"}
            <Input
              name="merchantOrSource"
              maxLength={160}
              value={merchant}
              onChange={(event) => changeMerchant(event.target.value)}
              list={merchantsForType.length ? datalistId : undefined}
              autoComplete="off"
              placeholder={
                type === "expense" ? "e.g. Jollibee, Meralco" : "e.g. Payroll"
              }
              aria-label="Merchant or source"
              className="mt-1.5"
            />
          </label>
          <label className="text-muted-foreground min-w-0 text-xs font-medium">
            Note
            <Input
              name="description"
              maxLength={300}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything to remember"
              aria-label="Description"
              className="mt-1.5"
            />
          </label>
        </div>
        {merchantsForType.length ? (
          <datalist id={datalistId}>
            {merchantsForType.slice(0, 30).map((entry) => (
              <option key={entry.merchant} value={entry.merchant} />
            ))}
          </datalist>
        ) : null}
      </fieldset>
    </div>
  );

  const summary = (
    <div
      className={cn(
        // Phones: the summary docks as an action bar, so a quick entry is
        // amount, category, record — without scrolling past the details.
        "sticky z-10 -mx-2 min-w-0 space-y-2 rounded-[1.25rem] border p-2 shadow-[0_12px_32px_-12px_rgb(7_10_15/0.45)] backdrop-blur-md",
        full
          ? "bg-card/90 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] group-data-[keyboard=open]/shell:bottom-2 lg:static lg:m-0 lg:space-y-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
          : "bg-background/90 bottom-0",
      )}
    >
      {full ? (
        <div className="border-border bg-background/60 hidden rounded-2xl border p-4 lg:block">
          <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            Preview
          </p>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            <CategoryBadge
              icon={category?.icon}
              name={category?.name}
              direction={direction}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {merchant.trim() || category?.name || "New transaction"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {[category?.name, account?.name].filter(Boolean).join(" · ") ||
                  "Choose a category and account"}
              </p>
            </div>
          </div>
          <div className="border-border mt-3 flex items-baseline justify-between gap-3 border-t pt-3">
            <span className="text-muted-foreground text-xs">
              {relativeDayLabel(date, today)}
            </span>
            <span className="font-mono text-base font-semibold">
              {validAmount ? (
                <FlowAmount centavos={amountCentavos} direction={direction} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {balanceAfter !== null && account ? (
        <p
          className="lg:border-border lg:bg-background/60 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-2 pt-1 text-xs lg:rounded-2xl lg:border lg:px-4 lg:py-3"
          aria-live="polite"
        >
          <span className="text-muted-foreground">
            {account.name} after this
          </span>
          <span className="flex items-center gap-1.5 font-mono font-semibold">
            <span className="text-muted-foreground font-medium">
              <MoneyAmount
                centavos={Number(account.current_balance_centavos)}
              />
            </span>
            <ArrowRight
              className="text-muted-foreground size-3"
              aria-hidden="true"
            />
            <MoneyAmount
              centavos={balanceAfter}
              className={cn(balanceAfter < 0 && "text-destructive")}
            />
          </span>
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || accounts.length === 0}
        pending={pending}
        pendingLabel={isEdit ? "Saving…" : "Recording…"}
        className="w-full"
      >
        {submitLabel}{" "}
        {validAmount && !isEdit ? (
          <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-xs">
            {formatCentavos(amountCentavos)}
          </span>
        ) : null}
      </Button>
    </div>
  );

  const form = (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid min-w-0 gap-7",
        full && "lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-10",
      )}
    >
      {transaction ? (
        <input type="hidden" name="transactionId" value={transaction.id} />
      ) : null}
      {fields}
      {/* No box of its own below lg, so the docked summary can travel the
          whole form; from lg up it is the sticky preview column. */}
      <div
        className={cn(
          "contents",
          full && "lg:sticky lg:top-24 lg:block lg:min-w-0 lg:self-start",
        )}
      >
        {summary}
      </div>
    </form>
  );

  if (!full) return form;

  return (
    <section
      aria-label={isEdit ? "Edit transaction" : "Record a transaction"}
      // overflow-clip, not -hidden: clipping must not create a scroll
      // container, or the docked summary would stick to the card instead
      // of the viewport.
      className="border-border bg-card relative overflow-clip rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.12)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b to-transparent transition-colors duration-300",
          type === "income" ? "from-positive/12" : "from-primary/12",
        )}
      />
      <div className="relative p-5 sm:p-7">{form}</div>
    </section>
  );
}
