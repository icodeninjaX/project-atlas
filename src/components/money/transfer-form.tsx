"use client";

import {
  ArrowDownUp,
  ArrowRight,
  ChevronDown,
  WalletCards,
} from "lucide-react";
import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { AccountLogo } from "@/components/money/account-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import {
  AmountField,
  DateField,
  focusForNextEntry,
} from "@/components/money/money-fields";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import { parsePesoInput } from "@/lib/money/history";
import { formatCentavos } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initialState: MoneyActionState = {
  success: false,
  message: "",
};

export type TransferAccount = {
  id: string;
  name: string;
  account_type?: string;
  provider_id?: string | null;
  current_balance_centavos?: number;
};

/**
 * One end of a transfer. The native select keeps the platform picker and
 * its accessibility; the tile drawn under it shows the chosen account.
 */
function AccountEnd({
  label,
  name,
  ariaLabel,
  placeholder,
  accounts,
  value,
  onChange,
  invalid,
}: {
  label: string;
  name: string;
  ariaLabel: string;
  placeholder: string;
  accounts: TransferAccount[];
  value: string;
  onChange: (accountId: string) => void;
  invalid?: boolean;
}) {
  const account = accounts.find((item) => item.id === value) ?? null;

  return (
    <label
      className={cn(
        "focus-within:ring-ring/40 relative block min-w-0 rounded-2xl border p-3.5 transition-colors focus-within:ring-2",
        invalid
          ? "border-destructive"
          : account
            ? "border-border bg-background/60"
            : "border-border bg-background/60 border-dashed",
      )}
    >
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
      <span className="mt-2 flex min-w-0 items-center gap-3">
        {account ? (
          <AccountLogo
            account={{
              name: account.name,
              account_type: account.account_type ?? "other",
              provider_id: account.provider_id,
            }}
            size="md"
          />
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
            {account?.name ?? placeholder}
          </span>
          {account?.current_balance_centavos !== undefined ? (
            <span className="text-muted-foreground block truncate font-mono text-xs">
              <MoneyAmount
                centavos={Number(account.current_balance_centavos)}
              />
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
      </span>
      <select
        name={name}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="absolute inset-0 size-full cursor-pointer rounded-2xl opacity-0"
      >
        <option value="">{placeholder}</option>
        {accounts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function BalanceShift({
  account,
  deltaCentavos,
}: {
  account: TransferAccount;
  deltaCentavos: number;
}) {
  const before = Number(account.current_balance_centavos);
  const after = before + deltaCentavos;
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-xs">
      <span className="text-muted-foreground min-w-0 truncate">
        {account.name}
      </span>
      <span className="flex items-center gap-1.5 font-mono font-semibold">
        <span className="text-muted-foreground font-medium">
          <MoneyAmount centavos={before} />
        </span>
        <ArrowRight
          className="text-muted-foreground size-3"
          aria-hidden="true"
        />
        <MoneyAmount
          centavos={after}
          className={cn(after < 0 && "text-destructive")}
        />
      </span>
    </li>
  );
}

export function TransferForm({
  accounts,
  today,
}: {
  accounts: TransferAccount[];
  today: string;
}) {
  const { submit } = useOfflineSync();
  const amountRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const canTransfer = accounts.length >= 2;

  const [, action, pending] = useActionState(
    async (_state: MoneyActionState, formData: FormData) => {
      const result = await submit("transfer.create", formData);
      if (!result.success) {
        toast.error(result.message);
        return result;
      }
      toast.success(result.message);
      setAmount("");
      setDescription("");
      focusForNextEntry(amountRef.current);
      return result;
    },
    initialState,
  );

  const source = accounts.find((account) => account.id === sourceId) ?? null;
  const destination =
    accounts.find((account) => account.id === destinationId) ?? null;
  const sameAccount = Boolean(sourceId) && sourceId === destinationId;
  const amountCentavos = parsePesoInput(amount);
  const validAmount = amountCentavos !== null && amountCentavos > 0;
  const showShift =
    validAmount &&
    source?.current_balance_centavos !== undefined &&
    destination?.current_balance_centavos !== undefined &&
    !sameAccount;

  function swap() {
    setSourceId(destinationId);
    setDestinationId(sourceId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sameAccount) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card relative min-w-0 overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.12)]"
    >
      <div
        aria-hidden="true"
        className="from-primary/12 pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b to-transparent"
      />
      <div className="relative grid min-w-0 gap-7 p-5 sm:p-7">
        <AmountField
          ref={amountRef}
          name="amount"
          value={amount}
          onValueChange={setAmount}
          label="Amount to move"
          ariaLabel="Transfer amount in pesos"
        />

        <div className="grid min-w-0 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
          <AccountEnd
            label="From"
            name="sourceAccountId"
            ariaLabel="Source account"
            placeholder="Choose source account"
            accounts={accounts}
            value={sourceId}
            onChange={setSourceId}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={swap}
            disabled={!sourceId && !destinationId}
            aria-label="Swap source and destination"
            className="mx-auto rounded-full"
          >
            <ArrowDownUp className="size-4 sm:rotate-90" aria-hidden="true" />
          </Button>
          <AccountEnd
            label="To"
            name="destinationAccountId"
            ariaLabel="Destination account"
            placeholder="Choose destination account"
            accounts={accounts}
            value={destinationId}
            onChange={setDestinationId}
            invalid={sameAccount}
          />
        </div>
        {sameAccount ? (
          <p role="alert" className="text-destructive -mt-4 text-sm">
            Choose two different accounts.
          </p>
        ) : null}

        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <DateField
            name="transferDate"
            value={date}
            onValueChange={setDate}
            today={today}
            legend="When"
            ariaLabel="Transfer date"
          />
          <label className="text-muted-foreground min-w-0 self-end text-xs font-medium">
            Note <span className="font-normal">(optional)</span>
            <Input
              name="description"
              maxLength={240}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. weekly spending load"
              aria-label="Transfer description"
              className="mt-1.5"
            />
          </label>
        </div>

        {!canTransfer ? (
          <p
            role="status"
            className="border-border bg-background text-muted-foreground rounded-2xl border px-4 py-3 text-sm"
          >
            Add at least two active accounts before recording a transfer.
          </p>
        ) : null}

        {showShift && source && destination ? (
          <div aria-live="polite">
            <p className="text-muted-foreground text-xs font-medium">
              Balances after this transfer
            </p>
            <ul className="border-border bg-background/60 divide-border mt-2 divide-y rounded-2xl border">
              <BalanceShift account={source} deltaCentavos={-amountCentavos} />
              <BalanceShift
                account={destination}
                deltaCentavos={amountCentavos}
              />
            </ul>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending || !canTransfer || sameAccount}
          pending={pending}
          pendingLabel="Recording…"
          className="w-full"
        >
          Record transfer{" "}
          {validAmount ? (
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-xs">
              {formatCentavos(amountCentavos)}
            </span>
          ) : null}
        </Button>
      </div>
    </form>
  );
}
