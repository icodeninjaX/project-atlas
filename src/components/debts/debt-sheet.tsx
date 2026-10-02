"use client";

import { DebtForm } from "@/components/debts/debt-form";
import { MoneySheet } from "@/components/money/money-sheet";
import type { DebtRecord } from "@/lib/debts/debt";

/**
 * Adds a debt, or with `debt` edits it, in a bottom sheet on phones and a
 * side panel from `sm` up. The form closes the sheet once it saves.
 */
export function DebtSheet({
  open,
  onOpenChange,
  debt,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: DebtRecord | null;
  /** YYYY-MM-DD in Manila. */
  today: string;
}) {
  const close = () => onOpenChange(false);

  return (
    <MoneySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Money / Debts"
      title={debt ? `Edit ${debt.creditor_name}` : "New debt"}
      description={
        debt
          ? "Correct the terms or the schedule. Payments keep their history."
          : "Enter it once as it stands today. Payments you record bring it down."
      }
      closeLabel={debt ? "Close debt editor" : "Close new debt form"}
    >
      {open ? (
        <DebtForm
          key={debt?.id ?? "new"}
          debt={debt ?? undefined}
          today={today}
          autoFocus={!debt}
          onCancel={close}
          onSaved={close}
        />
      ) : null}
    </MoneySheet>
  );
}
