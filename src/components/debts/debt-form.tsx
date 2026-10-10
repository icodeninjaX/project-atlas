"use client";

import { Calculator, Percent, Trash2 } from "lucide-react";
import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DEBT_TYPE_OPTIONS } from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { RelatedGoalField } from "@/components/graph/related-goal-field";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Disclosure } from "@/components/debts/debt-disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtActionState } from "@/lib/debts/actions";
import {
  annualRatePercent,
  projectDebtPayoff,
  type DebtRecord,
  type RateUnit,
} from "@/lib/debts/debt";
import { dueDayFor } from "@/lib/debts/schedule";
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

const STATUS_OPTIONS = [
  { value: "active", label: "Active", hint: "Paying it every month." },
  {
    value: "paused",
    label: "Paused",
    hint: "On hold; no minimum is planned for it.",
  },
  {
    value: "defaulted",
    label: "Defaulted",
    hint: "Behind and not paying; flagged red.",
  },
] as const;

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
  onDeleted,
}: {
  debt?: DebtRecord;
  /** YYYY-MM-DD in Manila; names the payoff month in the estimate. */
  today?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const id = useId();
  const { submit } = useOfflineSync();
  const editing = Boolean(debt);
  const form = useRef<HTMLFormElement>(null);
  const [balance, setBalance] = useState(
    debt ? toInput(debt.current_balance_centavos) : "",
  );
  const [dueDate, setDueDate] = useState(debt?.next_due_date ?? "");
  const [status, setStatus] = useState(
    debt && debt.status !== "paid" ? debt.status : "active",
  );
  const [rateUnit, setRateUnit] = useState<RateUnit>("year");
  const [notes, setNotes] = useState(debt?.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
        setBalance("");
        setMinimum("");
        setRate("");
        setDueDate("");
        setNotes("");
      }
      onSaved?.();
      return result;
    },
    initial,
  );

  const ratePercent = annualRatePercent(Number(rate), rateUnit);
  const ids = {
    balance: `${id}-balance`,
    minimum: `${id}-minimum`,
  };
  const balanceCentavos = parsePesoInput(balance);
  const paidSoFar = debt
    ? debt.original_balance_centavos - debt.current_balance_centavos
    : 0;
  const dueDay = dueDate ? dueDayFor(dueDate, debt?.due_day ?? null) : null;

  const moreSummary = [
    Number(rate) > 0 && Number.isFinite(ratePercent)
      ? `${Number((ratePercent / 12).toFixed(2))}% interest a month`
      : "Interest rate not set",
    notes.trim() ? "Notes added" : null,
    debt
      ? STATUS_OPTIONS.find((option) => option.value === status)?.label
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const deleteDebt = async () => {
    if (!debt) return;
    setDeleting(true);
    const formData = new FormData();
    formData.set("debtId", debt.id);
    const result = await submit("debt.delete", formData);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.message);
      setConfirmingDelete(false);
      return;
    }
    toast.success(result.message);
    onDeleted?.();
  };

  return (
    <form
      id={debt ? undefined : "debt-create-form"}
      ref={form}
      action={action}
      className="grid min-w-0 gap-7"
    >
      {debt && <input type="hidden" name="debtId" value={debt.id} />}

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

      <Section step={2} title="What you owe and when">
        <div className="grid gap-3 min-[26rem]:grid-cols-2">
          <div className="min-w-0 min-[26rem]:col-span-2">
            <label htmlFor={ids.balance} className={fieldLabel}>
              {debt ? "Balance today" : "Amount owed today"}
            </label>
            <div className="mt-1.5">
              <PesoInput
                id={ids.balance}
                name={debt ? "currentBalance" : "balance"}
                value={balance}
                onValueChange={setBalance}
                ariaLabel={
                  debt ? "Balance today in pesos" : "Amount owed in pesos"
                }
                describedBy={`${ids.balance}-hint`}
                placeholder="50,000.00"
              />
            </div>
            <p
              id={`${ids.balance}-hint`}
              className="text-muted-foreground mt-1 text-[0.6875rem] leading-4"
            >
              {debt ? (
                <>
                  Interest, fees, or a new statement changed it? Enter
                  today&apos;s balance.
                  {paidSoFar > 0 ? (
                    <>
                      {" "}
                      The{" "}
                      <MoneyAmount
                        centavos={paidSoFar}
                        className="font-mono"
                      />{" "}
                      you have paid stays in the history.
                    </>
                  ) : null}
                </>
              ) : (
                "What you would need to pay to clear it now. Payments you record bring it down."
              )}
            </p>
          </div>
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
            Next due date
            <Input
              name="nextDueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Next due date"
              aria-describedby={`${id}-due-hint`}
              className="mt-1.5"
            />
            <span
              id={`${id}-due-hint`}
              className="mt-1 block text-[0.6875rem] leading-4"
            >
              {dueDay
                ? `Repeats monthly on day ${dueDay}. Paying the bill moves it to the next month.`
                : "Leave it empty if there is no fixed due date."}
            </span>
          </label>
        </div>
      </Section>

      <Disclosure label="More details" summary={moreSummary}>
        <div className="grid gap-4">
          <div className="min-w-0">
            <label htmlFor={`${id}-rate`} className={fieldLabel}>
              Interest rate
            </label>
            <div className="mt-1.5 flex gap-1.5">
              <span className="relative block min-w-0 flex-1">
                <Input
                  id={`${id}-rate`}
                  name="interestRatePercent"
                  type="number"
                  min="0"
                  max={rateUnit === "month" ? "83" : "1000"}
                  step="0.0001"
                  inputMode="decimal"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="0"
                  aria-label="Interest rate percent"
                  aria-describedby={`${id}-rate-hint`}
                  className="[appearance:textfield] pr-9 text-right font-mono font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Percent
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
                />
              </span>
              <span
                role="radiogroup"
                aria-label="Rate is per"
                className="bg-muted/60 ring-border inline-flex shrink-0 rounded-xl p-1 ring-1"
              >
                {(["month", "year"] as const).map((unit) => (
                  <label key={unit} className="relative">
                    <input
                      type="radio"
                      name="interestRateUnit"
                      value={unit}
                      checked={rateUnit === unit}
                      onChange={() => setRateUnit(unit)}
                      className="peer sr-only"
                    />
                    <span className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground peer-focus-visible:ring-ring flex h-full min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-xs font-semibold peer-checked:shadow-sm peer-focus-visible:ring-2">
                      /{unit === "month" ? "mo" : "yr"}
                    </span>
                  </label>
                ))}
              </span>
            </div>
            <p
              id={`${id}-rate-hint`}
              className="text-muted-foreground mt-1 text-[0.6875rem] leading-4"
            >
              {Number(rate) > 0 && Number.isFinite(ratePercent)
                ? rateUnit === "month"
                  ? `That is ${Number(ratePercent.toFixed(2))}% a year.`
                  : `That is about ${Number((ratePercent / 12).toFixed(2))}% a month.`
                : "Lenders often quote it by the month, like 3% a month."}
            </p>
          </div>
          <label className={cn(fieldLabel, "min-w-0")}>
            Notes
            <Input
              name="notes"
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Account number, payment channel…"
              aria-label="Notes"
              className="mt-1.5"
            />
          </label>
          {debt ? (
            <fieldset className="min-w-0">
              <legend className={fieldLabel}>Status</legend>
              <div className="mt-1.5 grid gap-2 min-[30rem]:grid-cols-3">
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className="min-w-0">
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={status === option.value}
                      onChange={() => setStatus(option.value)}
                      className="peer sr-only"
                    />
                    <span className="border-border bg-card text-muted-foreground hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background flex h-full cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2">
                      <span className="text-xs font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-0.5 text-[0.6875rem] leading-4 font-normal">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {balanceCentavos === 0 ? (
                <p className="text-positive mt-1.5 text-[0.6875rem] leading-4 font-semibold">
                  A balance of zero saves it as paid off.
                </p>
              ) : null}
            </fieldset>
          ) : (
            <RelatedGoalField />
          )}
        </div>
      </Disclosure>

      <Estimate
        balanceCentavos={balanceCentavos}
        minimumCentavos={parsePesoInput(minimum) ?? 0}
        ratePercent={Number.isFinite(ratePercent) ? ratePercent : 0}
        today={today}
      />

      {debt && confirmingDelete ? (
        <div
          role="alert"
          className="bg-destructive/[0.06] ring-destructive/25 rounded-2xl p-3.5 ring-1"
        >
          <p className="text-sm font-semibold">Delete {debt.creditor_name}?</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Its payment history goes with it. Expenses already logged in Money
            stay, since that money really left your accounts. This cannot be
            undone.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              pending={deleting}
              pendingLabel="Deleting…"
              onClick={deleteDebt}
            >
              Delete debt
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 [&>*]:grow min-[26rem]:[&>*]:grow-0">
        {debt && !confirmingDelete ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive min-[26rem]:mr-auto"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        ) : null}
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
