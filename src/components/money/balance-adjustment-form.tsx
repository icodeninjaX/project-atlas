"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { cn } from "@/lib/utils";

const initial: MoneyActionState = { success: false, message: "" };

function parseSignedPesoInput(value: string): number | null {
  const negative = value.trim().startsWith("-");
  const centavos = parsePesoInput(value.trim().replace(/^-/, ""));
  if (centavos === null) return null;
  return negative ? -centavos : centavos;
}

/**
 * Reconciles an account with reality. The person types what they actually
 * have; the form shows the correction ATLAS will record before they save.
 * Remount with a new `key` when the balance changes to reset the field.
 */
export function BalanceAdjustmentForm({
  accountId,
  accountName,
  currentBalanceCentavos,
  today,
}: {
  accountId: string;
  accountName: string;
  currentBalanceCentavos: number;
  today: string;
}) {
  const [state, action, pending] = useOfflineActionState(
    "account.adjustBalance",
    initial,
  );
  const [target, setTarget] = useState(
    centavosToPesoInput(currentBalanceCentavos),
  );
  const targetCentavos = parseSignedPesoInput(target);
  const difference =
    targetCentavos === null ? null : targetCentavos - currentBalanceCentavos;

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid min-w-0 gap-4">
      <input type="hidden" name="accountId" value={accountId} />
      <div className="border-border bg-background/60 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border">
        <div className="min-w-0 p-3.5">
          <p className="text-muted-foreground text-xs">ATLAS shows</p>
          <p className="mt-1 font-mono text-base font-semibold [overflow-wrap:anywhere]">
            <MoneyAmount centavos={currentBalanceCentavos} />
          </p>
        </div>
        <div
          className="border-border min-w-0 border-l p-3.5"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-xs">Correction</p>
          <p
            className={cn(
              "mt-1 font-mono text-base font-semibold [overflow-wrap:anywhere]",
              difference !== null && difference > 0 && "text-positive",
            )}
          >
            {difference === null ? (
              "—"
            ) : difference === 0 ? (
              <span className="text-muted-foreground">None needed</span>
            ) : (
              <MoneyAmount centavos={difference} sign="always" />
            )}
          </p>
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        Enter the amount you actually have. ATLAS records only the difference as
        a correction, so income and expense reports stay accurate.
      </p>
      <label className="text-muted-foreground min-w-0 text-xs font-medium">
        Actual balance now (PHP)
        <Input
          name="targetBalance"
          inputMode="decimal"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          required
          aria-label={`New current balance for ${accountName} in pesos`}
          className="mt-1.5 font-mono text-lg font-semibold sm:text-base"
        />
      </label>
      <div className="grid gap-4 @[22rem]:grid-cols-2">
        <label className="text-muted-foreground min-w-0 text-xs font-medium">
          Adjustment date
          <Input
            name="adjustmentDate"
            type="date"
            defaultValue={today}
            required
            aria-label={`Balance adjustment date for ${accountName}`}
            className="mt-1.5"
          />
        </label>
        <label className="text-muted-foreground min-w-0 text-xs font-medium">
          Note
          <Input
            name="note"
            maxLength={300}
            placeholder="e.g. matched the bank app"
            aria-label={`Balance adjustment note for ${accountName}`}
            className="mt-1.5"
          />
        </label>
      </div>
      <Button
        type="submit"
        pending={pending}
        pendingLabel="Adjusting…"
        className="w-full"
      >
        Save balance adjustment
      </Button>
    </form>
  );
}
