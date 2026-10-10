"use client";

import {
  CalendarCheck,
  ChevronDown,
  CircleCheckBig,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { AccountLogo } from "@/components/money/account-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { DateField, PesoInput } from "@/components/money/money-fields";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import { followingDueDate, settlesDueByDefault } from "@/lib/debts/schedule";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initial: DebtActionState = { success: false, message: "" };

/** Where the last payment came from, so the next one starts there. */
const ACCOUNT_KEY = "atlas:debt-payment-account";

const toInput = (centavos: number) =>
  formatPesoInput(centavosToPesoInput(centavos));

const monthDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});
const formatDay = (iso: string) =>
  monthDay.format(new Date(`${iso}T00:00:00Z`));

export type PaymentAccount = {
  id: string;
  name: string;
  account_type: string;
  provider_id: string | null;
  current_balance_centavos: number;
};

function readSavedAccount(accountIds: string[]) {
  try {
    const saved = window.localStorage.getItem(ACCOUNT_KEY) ?? "";
    return saved && accountIds.includes(saved) ? saved : "";
  } catch {
    return "";
  }
}

function saveAccount(id: string) {
  try {
    window.localStorage.setItem(ACCOUNT_KEY, id);
  } catch {
    // Remembering the account is a convenience only.
  }
}

/** What the typed amount does to the balance, before it is recorded. */
function Preview({
  amountCentavos,
  balanceCentavos,
}: {
  amountCentavos: number | null;
  balanceCentavos: number;
}) {
  if (!amountCentavos) return null;
  const left = balanceCentavos - amountCentavos;
  if (left < 0) {
    return (
      <p className="text-destructive flex items-start gap-2 text-xs leading-5 font-medium">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0"
        />
        <span>
          That is more than the{" "}
          <MoneyAmount centavos={balanceCentavos} className="font-mono" /> still
          owed.
        </span>
      </p>
    );
  }
  if (left === 0) {
    return (
      <p className="text-positive flex items-start gap-2 text-xs leading-5 font-semibold">
        <CircleCheckBig
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0"
        />
        This clears the debt.
      </p>
    );
  }
  return (
    <p className="text-muted-foreground text-xs leading-5">
      Leaves{" "}
      <MoneyAmount
        centavos={left}
        className="text-foreground font-mono font-semibold"
      />{" "}
      to pay.
    </p>
  );
}

/** The account the money left, drawn as a tile over a native select. */
function AccountPicker({
  accounts,
  value,
  onChange,
  amountCentavos,
}: {
  accounts: PaymentAccount[];
  value: string;
  onChange: (id: string) => void;
  amountCentavos: number | null;
}) {
  const id = useId();
  const account = accounts.find((item) => item.id === value) ?? null;
  const short =
    account && amountCentavos !== null
      ? amountCentavos > account.current_balance_centavos
      : false;

  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold">
        Paid from
      </p>
      <label
        className={cn(
          "focus-within:ring-ring/40 relative mt-2 flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition-colors focus-within:ring-2",
          account
            ? "border-border bg-background/60"
            : "border-border bg-background/60 border-dashed",
        )}
      >
        {account ? (
          <AccountLogo account={account} size="md" />
        ) : (
          <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full sm:size-10">
            <WalletCards className="size-4" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm font-semibold",
              !account && "text-muted-foreground",
            )}
          >
            {account?.name ?? "Not logged in Money"}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {account ? (
              <>
                <MoneyAmount
                  centavos={account.current_balance_centavos}
                  className="font-mono"
                />{" "}
                available
              </>
            ) : (
              "Choose an account to log it as an expense"
            )}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
        <select
          name="accountId"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-labelledby={`${id}-label`}
          className="absolute inset-0 size-full cursor-pointer rounded-2xl opacity-0"
        >
          <option value="">Not logged in Money</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-muted-foreground mt-1.5 text-xs leading-5">
        {account ? (
          short ? (
            <span className="text-destructive font-medium">
              More than {account.name} holds; it will go below zero.
            </span>
          ) : (
            <>
              Also saved as a Debt Payment expense, so {account.name}&apos;s
              balance stays right.
            </>
          )
        ) : (
          "Only the debt changes. Pick an account if this money came from one you track."
        )}
      </p>
    </div>
  );
}

/**
 * Records a payment against a debt: the amount first, with the minimum and
 * the full balance one tap away, then the date, the account it came from,
 * and whether it settles the bill that is due.
 */
export function PaymentForm({
  debtId,
  today,
  balanceCentavos,
  minimumCentavos,
  nextDueDate = null,
  dueDay = null,
  accounts = [],
  onSaved,
}: {
  debtId: string;
  /** YYYY-MM-DD in Manila. */
  today: string;
  balanceCentavos: number;
  minimumCentavos: number;
  nextDueDate?: string | null;
  dueDay?: number | null;
  /** Open accounts the payment can be logged from. */
  accounts?: PaymentAccount[];
  onSaved?: () => void;
}) {
  const id = useId();
  const { submit } = useOfflineSync();
  const form = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState("");
  // Null follows the date; a tick or untick from the person sticks.
  const [settles, setSettles] = useState<boolean | null>(null);

  const accountIds = accounts.map((account) => account.id).join(",");
  useEffect(() => {
    // Read after mount: storage is not available on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountId(readSavedAccount(accountIds.split(",")));
  }, [accountIds]);

  const [, action, pending] = useActionState(
    async (_state: DebtActionState, formData: FormData) => {
      const result = await submit("debtPayment.create", formData);
      if (!result.success) {
        toast.error(result.message);
        return result;
      }
      toast.success(result.message);
      saveAccount(String(formData.get("accountId") ?? ""));
      form.current?.reset();
      setAmount("");
      setDate(today);
      setSettles(null);
      onSaved?.();
      return result;
    },
    initial,
  );

  const amountCentavos = parsePesoInput(amount);
  const tooMuch = amountCentavos !== null && amountCentavos > balanceCentavos;
  const clears = amountCentavos === balanceCentavos;
  const shortcuts = [
    minimumCentavos > 0 && minimumCentavos < balanceCentavos
      ? { label: "Minimum", centavos: minimumCentavos }
      : null,
    { label: "Full balance", centavos: balanceCentavos },
  ].filter((item) => item !== null);
  const settlesDue = settles ?? settlesDueByDefault(nextDueDate, date);
  const showSchedule = Boolean(nextDueDate) && !clears;

  return (
    <form
      ref={form}
      action={action}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5"
    >
      <input type="hidden" name="debtId" value={debtId} />
      <div>
        <label htmlFor={`${id}-amount`} className="text-sm font-semibold">
          Amount
        </label>
        <div className="mt-2">
          <PesoInput
            id={`${id}-amount`}
            name="amount"
            value={amount}
            onValueChange={setAmount}
            ariaLabel="Payment amount in pesos"
            describedBy={`${id}-preview`}
            large
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => {
            const pressed = amountCentavos === shortcut.centavos;
            return (
              <button
                key={shortcut.label}
                type="button"
                aria-pressed={pressed}
                onClick={() => setAmount(toInput(shortcut.centavos))}
                className={cn(
                  "focus-visible:ring-ring inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-1.5 rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
                  pressed
                    ? "bg-primary/10 text-foreground ring-primary"
                    : "bg-background/60 text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                )}
              >
                {shortcut.label}
                {shortcut.label === "Minimum" ? (
                  <MoneyAmount
                    centavos={shortcut.centavos}
                    className="font-mono font-medium opacity-80"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div id={`${id}-preview`} aria-live="polite" className="mt-2.5 min-h-5">
          <Preview
            amountCentavos={amountCentavos}
            balanceCentavos={balanceCentavos}
          />
        </div>
      </div>
      <DateField
        name="paymentDate"
        value={date}
        onValueChange={setDate}
        today={today}
        legend="Paid on"
        ariaLabel="Payment date"
      />
      {accounts.length > 0 ? (
        <AccountPicker
          accounts={accounts}
          value={accountId}
          onChange={setAccountId}
          amountCentavos={amountCentavos}
        />
      ) : null}
      {showSchedule && nextDueDate ? (
        <label className="bg-background/55 ring-border/80 has-[:checked]:bg-primary/[0.06] has-[:checked]:ring-primary/40 flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 ring-1 transition-colors">
          <input
            type="checkbox"
            name="settlesDue"
            checked={settlesDue}
            onChange={(event) => setSettles(event.target.checked)}
            className="accent-primary mt-0.5 size-4 shrink-0"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <CalendarCheck
                aria-hidden="true"
                className="text-primary size-4 shrink-0"
              />
              This pays the bill due {formatDay(nextDueDate)}
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
              {settlesDue
                ? `Next due moves to ${formatDay(followingDueDate(nextDueDate, dueDay))}.`
                : `Leave it unticked for an extra payment; ${formatDay(nextDueDate)} stays due.`}
            </span>
          </span>
        </label>
      ) : null}
      <label className="text-sm font-semibold">
        Note
        <Input
          name="notes"
          maxLength={300}
          placeholder="Reference number or channel (optional)"
          aria-label="Payment note"
          className="mt-2 font-normal"
        />
      </label>
      <Button
        type="submit"
        size="lg"
        pending={pending}
        pendingLabel="Recording…"
        disabled={tooMuch}
        className="w-full"
      >
        Record payment
      </Button>
    </form>
  );
}
