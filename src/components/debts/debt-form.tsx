"use client";

import { Calculator, Percent } from "lucide-react";
import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DEBT_TYPE_OPTIONS } from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import { projectDebtPayoff, type DebtRecord } from "@/lib/debts/debt";
import { formatPayoffDuration, payoffMonthLabel } from "@/lib/debts/plan";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initial: DebtActionState = { success: false, message: "" };

const toInput = (centavos: number) =>
  formatPesoInput(centavosToPesoInput(centavos));

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold">
        <span
          aria-hidden="true"
          className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-bold"
        >
          {step}
        </span>
        {title}
      </h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

const fieldLabel = "text-muted-foreground text-xs font-medium";

/** What the entered terms add up to, before anything is saved. */
function Estimate({
  balanceCentavos,
  minimumCentavos,
  ratePercent,
  today,
}: {
  balanceCentavos: number | null;
  minimumCentavos: number;
  ratePercent: number;
  today?: string;
}) {
  let body: ReactNode;
  if (!balanceCentavos) {
    body = "Enter the balance to see when it would be paid off.";
  } else if (minimumCentavos <= 0) {
    body = "Add a minimum payment to see when it would be paid off.";
  } else {
    const projection = projectDebtPayoff({
      balanceCentavos,
      annualInterestRatePercent: ratePercent,
      monthlyPaymentCentavos: minimumCentavos,
    });
    body = projection.paidOff ? (
      <>
        At the minimum, paid off in{" "}
        <span className="text-foreground font-semibold">
          {formatPayoffDuration(projection.months)}
        </span>
        {today ? ` (${payoffMonthLabel(today, projection.months)})` : ""}
        {projection.totalInterestCentavos > 0 ? (
          <>
            , with{" "}
            <MoneyAmount
              centavos={projection.totalInterestCentavos}
              className="text-foreground font-mono font-semibold"
            />{" "}
            in interest.
          </>
        ) : (
          ", with no interest."
        )}
      </>
    ) : (
      <span className="text-destructive font-medium">
        That minimum does not cover the monthly interest, so the balance would
        never shrink.
      </span>
    );
  }

  return (
    <div
      role="status"
      className="bg-primary/[0.06] ring-primary/20 flex gap-3 rounded-2xl p-3.5 text-xs leading-5 ring-1"
    >
      <Calculator
        aria-hidden="true"
        className="text-primary mt-0.5 size-4 shrink-0"
      />
      <p className="text-muted-foreground min-w-0">{body}</p>
    </div>
  );
}

/**
 * Adds a debt, or edits one: who it is owed to, the balance and terms,
 * and its schedule, with an estimate of the payoff as the terms change.
 */
export function DebtForm({
  debt,
  today,
  autoFocus = false,
  onCancel,
  onSaved,
}: {
  debt?: DebtRecord;
  /** YYYY-MM-DD in Manila; names the payoff month in the estimate. */
  today?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const id = useId();
  const { submit } = useOfflineSync();
  const editing = Boolean(debt);
  const form = useRef<HTMLFormElement>(null);
  const [original, setOriginal] = useState(
    debt ? toInput(debt.original_balance_centavos) : "",
  );
  const [current, setCurrent] = useState(
    debt ? toInput(debt.current_balance_centavos) : "",
  );
  const [minimum, setMinimum] = useState(
    debt && debt.minimum_payment_centavos > 0
      ? toInput(debt.minimum_payment_centavos)
      : "",
  );
  const [rate, setRate] = useState(
    debt ? String(debt.interest_rate_percent) : "",
  );

  const [, action, pending] = useActionState(
    async (_state: DebtActionState, formData: FormData) => {
      const result = await submit(
        editing ? "debt.update" : "debt.create",
        formData,
      );
      if (!result.success) {
        toast.error(result.message);
        return result;
      }
      toast.success(result.message);
      if (!editing) {
        form.current?.reset();
        setOriginal("");
        setMinimum("");
        setRate("");
      }
      onSaved?.();
      return result;
    },
    initial,
  );

  const ratePercent = Number(rate);
  const ids = {
    original: `${id}-original`,
    current: `${id}-current`,
    minimum: `${id}-minimum`,
  };

  return (
    <form
      id={debt ? undefined : "debt-create-form"}
      ref={form}
      action={action}
      className="grid min-w-0 gap-7"
    >
      {debt && <input type="hidden" name="debtId" value={debt.id} />}
      {debt ? (
        <input
          type="hidden"
          name="status"
          // A paid debt given a balance again is active again.
          value={
            debt.status === "paid" && (parsePesoInput(current) ?? 0) > 0
              ? "active"
              : debt.status
          }
        />
      ) : null}

      <Section step={1} title="Who it is owed to">
        <label className={fieldLabel}>
          Creditor name
          <Input
            autoFocus={autoFocus}
            name="creditorName"
            required
            maxLength={160}
            defaultValue={debt?.creditor_name}
            placeholder="e.g. Maya Credit"
            aria-label="Creditor name"
            className="mt-1.5"
          />
        </label>
        <fieldset className="min-w-0">
          <legend className={fieldLabel}>Debt type</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2 min-[30rem]:grid-cols-3">
            {DEBT_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <label key={option.value} className="min-w-0">
                  <input
                    type="radio"
                    name="debtType"
                    value={option.value}
                    defaultChecked={
                      (debt?.debt_type ?? "other") === option.value
                    }
                    className="peer sr-only"
                  />
                  <span className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background peer-checked:[&>svg]:text-primary flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 [&>svg]:shrink-0">
                    <Icon aria-hidden="true" className="size-4" />
                    <span className="min-w-0 break-words">{option.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Section step={2} title="Balance and terms">
        <div className="grid gap-3 min-[26rem]:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={ids.original} className={fieldLabel}>
              {debt ? "Original balance" : "Amount owed"}
            </label>
            <div className="mt-1.5">
              <PesoInput
                id={ids.original}
                name="originalBalance"
                value={original}
                onValueChange={setOriginal}
                ariaLabel="Original balance in pesos"
                placeholder="50,000.00"
              />
            </div>
          </div>
          {debt ? (
            <div className="min-w-0">
              <label htmlFor={ids.current} className={fieldLabel}>
                Current balance
              </label>
              <div className="mt-1.5">
                <PesoInput
                  id={ids.current}
                  name="currentBalance"
                  value={current}
                  onValueChange={setCurrent}
                  ariaLabel="Current balance in pesos"
                />
              </div>
            </div>
          ) : null}
          <div className="min-w-0">
            <label htmlFor={ids.minimum} className={fieldLabel}>
              Minimum payment a month
            </label>
            <div className="mt-1.5">
              <PesoInput
                id={ids.minimum}
                name="minimumPayment"
                value={minimum}
                onValueChange={setMinimum}
                ariaLabel="Minimum payment in pesos"
                placeholder="5,000.00"
              />
            </div>
          </div>
          <label className={cn(fieldLabel, "min-w-0")}>
            Annual interest rate
            <span className="relative mt-1.5 block">
              <Input
                name="interestRatePercent"
                type="number"
                min="0"
                max="1000"
                step="0.0001"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="0"
                aria-label="Annual interest rate percent"
                className="[appearance:textfield] pr-9 text-right font-mono font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Percent
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
              />
            </span>
          </label>
        </div>
      </Section>

      <Section step={3} title="Schedule">
        <div className="grid gap-3 min-[26rem]:grid-cols-2">
          <label className={cn(fieldLabel, "min-w-0")}>
            Next due date
            <Input
              name="nextDueDate"
              type="date"
              defaultValue={debt?.next_due_date ?? ""}
              aria-label="Next due date"
              className="mt-1.5"
            />
          </label>
          <label className={cn(fieldLabel, "min-w-0")}>
            Due day of month
            <Input
              name="dueDay"
              type="number"
              min="1"
              max="31"
              defaultValue={debt?.due_day ?? ""}
              placeholder="e.g. 15"
              aria-label="Due day"
              className="mt-1.5"
            />
          </label>
          <label className={cn(fieldLabel, "min-w-0")}>
            Priority order
            <Input
              name="priority"
              type="number"
              min="1"
              defaultValue={debt?.priority ?? 1}
              aria-label="Priority order"
              aria-describedby={`${id}-priority-hint`}
              className="mt-1.5"
            />
            <span
              id={`${id}-priority-hint`}
              className="mt-1 block text-[0.6875rem] leading-4"
            >
              1 comes first in “My priority”.
            </span>
          </label>
          <label className={cn(fieldLabel, "min-w-0")}>
            Notes
            <Input
              name="notes"
              maxLength={2000}
              defaultValue={debt?.notes ?? ""}
              placeholder="Account number, payment channel…"
              aria-label="Notes"
              className="mt-1.5"
            />
          </label>
        </div>
      </Section>

      <Estimate
        balanceCentavos={parsePesoInput(debt ? current : original)}
        minimumCentavos={parsePesoInput(minimum) ?? 0}
        ratePercent={Number.isFinite(ratePercent) ? ratePercent : 0}
        today={today}
      />

      <div className="flex flex-wrap justify-end gap-2 [&>*]:grow min-[26rem]:[&>*]:grow-0">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          pending={pending}
          pendingLabel={debt ? "Saving…" : "Adding…"}
        >
          {debt ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
