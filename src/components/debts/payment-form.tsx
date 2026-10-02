"use client";

import { CircleCheckBig, TriangleAlert } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { MoneyAmount } from "@/components/money/money-amount";
import { DateField, PesoInput } from "@/components/money/money-fields";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initial: DebtActionState = { success: false, message: "" };

const toInput = (centavos: number) =>
  formatPesoInput(centavosToPesoInput(centavos));

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

/**
 * Records a payment against a debt: the amount first, with the minimum and
 * the full balance one tap away, then the date and an optional note.
 */
export function PaymentForm({
  debtId,
  today,
  balanceCentavos,
  minimumCentavos,
}: {
  debtId: string;
  /** YYYY-MM-DD in Manila. */
  today: string;
  balanceCentavos: number;
  minimumCentavos: number;
}) {
  const id = useId();
  const { submit } = useOfflineSync();
  const form = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  const [, action, pending] = useActionState(
    async (_state: DebtActionState, formData: FormData) => {
      const result = await submit("debtPayment.create", formData);
      if (!result.success) {
        toast.error(result.message);
        return result;
      }
      toast.success(result.message);
      form.current?.reset();
      setAmount("");
      setDate(today);
      return result;
    },
    initial,
  );

  const amountCentavos = parsePesoInput(amount);
  const tooMuch = amountCentavos !== null && amountCentavos > balanceCentavos;
  const shortcuts = [
    minimumCentavos > 0 && minimumCentavos < balanceCentavos
      ? { label: "Minimum", centavos: minimumCentavos }
      : null,
    { label: "Full balance", centavos: balanceCentavos },
  ].filter((item) => item !== null);

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
