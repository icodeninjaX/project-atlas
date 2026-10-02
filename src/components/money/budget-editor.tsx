"use client";

import { CopyPlus, History } from "lucide-react";
import { useActionState, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/money/category-icon";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { MoneySheet } from "@/components/money/money-sheet";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import type { BudgetActionState } from "@/lib/budgets/actions";
import { roundUpToHundredPesos, type BudgetCategory } from "@/lib/budgets/plan";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import { cn } from "@/lib/utils";

const initial: BudgetActionState = { success: false, message: "" };

/** Where the editor's amounts start: this month's plan or last month's. */
export type BudgetEditorSeed = "current" | "previous-plan";

export type BudgetMonthData = {
  planned: Record<string, number>;
  spent: Record<string, number>;
  expectedIncomeCentavos: number;
  hasPlan: boolean;
};

export function budgetItemInputId(categoryId: string) {
  return `budget-plan-${categoryId}`;
}

const toInput = (centavos: number) =>
  formatPesoInput(centavosToPesoInput(centavos));

function toInputs(amounts: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(amounts).map(([id, centavos]) => [id, toInput(centavos)]),
  );
}

function QuickFill({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-background/60 text-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
    >
      <span aria-hidden="true" className="text-primary">
        {icon}
      </span>
      {children}
    </button>
  );
}

function BudgetEditorForm({
  monthStart,
  monthName,
  previousName,
  notes,
  categories,
  current,
  previous,
  seed,
  spentLabel,
  onSaved,
}: {
  monthStart: string;
  monthName: string;
  previousName: string;
  notes: string | null;
  categories: readonly BudgetCategory[];
  current: BudgetMonthData;
  previous: BudgetMonthData;
  seed: BudgetEditorSeed;
  spentLabel: string;
  onSaved: () => void;
}) {
  const { submit } = useOfflineSync();
  const incomeId = useId();
  const fromPrevious = seed === "previous-plan";
  const [income, setIncome] = useState(() => {
    const centavos =
      fromPrevious && current.expectedIncomeCentavos === 0
        ? previous.expectedIncomeCentavos
        : current.expectedIncomeCentavos;
    return centavos > 0 ? toInput(centavos) : "";
  });
  const [values, setValues] = useState<Record<string, string>>(() =>
    toInputs(fromPrevious ? previous.planned : current.planned),
  );
  const [filledFrom, setFilledFrom] = useState<string | null>(
    fromPrevious ? `${previousName}'s plan` : null,
  );

  const [, action, pending] = useActionState(
    async (_state: BudgetActionState, formData: FormData) => {
      const result = await submit("budget.save", formData);
      if (result.success) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
      return result;
    },
    initial,
  );

  const listed = new Set(categories.map((category) => category.id));
  const previousSpending = Object.fromEntries(
    Object.entries(previous.spent).filter(
      ([id, centavos]) => centavos > 0 && listed.has(id),
    ),
  );
  const canUseSpending = Object.keys(previousSpending).length > 0;

  const incomeCentavos = parsePesoInput(income) ?? 0;
  const plannedCentavos = categories.reduce(
    (sum, category) => sum + (parsePesoInput(values[category.id] ?? "") ?? 0),
    0,
  );
  const plannedCount = categories.filter(
    (category) => (values[category.id] ?? "").trim() !== "",
  ).length;
  const unassigned = incomeCentavos - plannedCentavos;
  const share =
    incomeCentavos > 0 ? Math.min(plannedCentavos / incomeCentavos, 1) : 0;

  function copyPreviousPlan() {
    setValues(toInputs(previous.planned));
    if (incomeCentavos === 0 && previous.expectedIncomeCentavos > 0) {
      setIncome(toInput(previous.expectedIncomeCentavos));
    }
    setFilledFrom(`${previousName}'s plan`);
  }

  function usePreviousSpending() {
    setValues(
      Object.fromEntries(
        Object.entries(previousSpending).map(([id, centavos]) => [
          id,
          toInput(roundUpToHundredPesos(centavos)),
        ]),
      ),
    );
    setFilledFrom(`${previousName}'s spending, rounded up to the next ₱100`);
  }

  return (
    <form action={action} className="@container">
      <input type="hidden" name="monthStart" value={monthStart} />
      <input type="hidden" name="notes" value={notes ?? ""} />

      <div className="border-border bg-card rounded-2xl border p-4">
        <label htmlFor={incomeId} className="text-sm font-semibold">
          Expected income
        </label>
        <p
          id={`${incomeId}-hint`}
          className="text-muted-foreground mt-0.5 text-xs leading-5"
        >
          What you expect to come in during {monthName}.
        </p>
        <div className="mt-3">
          <PesoInput
            id={incomeId}
            name="expectedIncome"
            value={income}
            onValueChange={setIncome}
            describedBy={`${incomeId}-hint`}
            large
          />
        </div>
      </div>

      {previous.hasPlan || canUseSpending ? (
        <div className="mt-5">
          <p className="text-muted-foreground text-xs font-medium">
            Quick start
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {previous.hasPlan ? (
              <QuickFill
                icon={<CopyPlus className="size-3.5" />}
                onClick={copyPreviousPlan}
              >
                Copy {previousName}&apos;s plan
              </QuickFill>
            ) : null}
            {canUseSpending ? (
              <QuickFill
                icon={<History className="size-3.5" />}
                onClick={usePreviousSpending}
              >
                Use {previousName}&apos;s spending
              </QuickFill>
            ) : null}
          </div>
          <p
            role="status"
            className="text-muted-foreground mt-2 min-h-5 text-xs leading-5"
          >
            {filledFrom ? `Filled from ${filledFrom}. Review, then save.` : ""}
          </p>
        </div>
      ) : null}

      <fieldset className="mt-5 min-w-0">
        <legend className="text-sm font-semibold">Spending by category</legend>
        <p className="text-muted-foreground mt-0.5 text-xs leading-5">
          Leave a category blank to keep it out of the plan.
        </p>
        {categories.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Add an expense category first.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {categories.map((category) => {
              const value = values[category.id] ?? "";
              const inputId = budgetItemInputId(category.id);
              const thisMonth = current.spent[category.id] ?? 0;
              const lastMonth = previous.spent[category.id] ?? 0;
              const hint =
                thisMonth > 0 || lastMonth > 0 ? (
                  <>
                    {thisMonth > 0 ? (
                      <>
                        <MoneyAmount
                          centavos={thisMonth}
                          className="font-mono"
                        />{" "}
                        {spentLabel}
                      </>
                    ) : null}
                    {thisMonth > 0 && lastMonth > 0 ? " · " : null}
                    {lastMonth > 0 ? (
                      <>
                        <MoneyAmount
                          centavos={lastMonth}
                          className="font-mono"
                        />{" "}
                        in {previousName}
                      </>
                    ) : null}
                  </>
                ) : null;
              return (
                <li
                  key={category.id}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)_8.5rem] items-center gap-x-3 gap-y-2 rounded-2xl border py-2.5 pr-2.5 pl-3 transition-colors @max-[20rem]:grid-cols-[auto_minmax(0,1fr)]",
                    value.trim()
                      ? "border-primary/30 bg-primary/[0.04]"
                      : "border-border",
                  )}
                >
                  <CategoryBadge
                    icon={category.icon}
                    name={category.name}
                    direction="out"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={inputId}
                      className="block text-sm font-semibold break-words"
                    >
                      {category.name}
                    </label>
                    {hint ? (
                      <p
                        id={`${inputId}-hint`}
                        className="text-muted-foreground mt-0.5 text-xs leading-4"
                      >
                        {hint}
                      </p>
                    ) : null}
                  </div>
                  <div className="@max-[20rem]:col-span-2">
                    <PesoInput
                      id={inputId}
                      name={`item:${category.id}`}
                      value={value}
                      onValueChange={(next) =>
                        setValues((all) => ({ ...all, [category.id]: next }))
                      }
                      describedBy={hint ? `${inputId}-hint` : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {/* Totals stay in view while the list scrolls. The sheet pads its
          bottom for the safe area; the bar takes that padding over so it
          meets the edge instead of floating above a strip of rows. */}
      <div className="border-border bg-background sticky -bottom-[calc(1.5rem+env(safe-area-inset-bottom))] -mx-5 mt-6 -mb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:rounded-b-[calc(1.75rem-1px)] sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <p className="text-muted-foreground">
            Planned{" "}
            <MoneyAmount
              centavos={plannedCentavos}
              className="text-foreground font-mono text-sm font-semibold"
            />
            {incomeCentavos > 0 ? (
              <>
                {" "}
                of{" "}
                <MoneyAmount centavos={incomeCentavos} className="font-mono" />
              </>
            ) : (
              <>
                {" "}
                in{" "}
                {plannedCount === 1
                  ? "1 category"
                  : `${plannedCount} categories`}
              </>
            )}
          </p>
          {incomeCentavos > 0 ? (
            <p
              className={cn(
                "font-medium",
                unassigned < 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <MoneyAmount
                centavos={Math.abs(unassigned)}
                className="font-mono"
              />{" "}
              {unassigned < 0 ? "over income" : "not yet planned"}
            </p>
          ) : null}
        </div>
        {incomeCentavos > 0 ? (
          <div
            aria-hidden="true"
            className={cn(
              "mt-2 h-1.5 overflow-hidden rounded-full",
              unassigned < 0 ? "bg-destructive/15" : "bg-primary/12",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-200",
                unassigned < 0 ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        ) : null}
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Saving…"
          className="mt-3 w-full"
        >
          Save plan
        </Button>
      </div>
    </form>
  );
}

/** The plan editor sheet: income, one amount per category, live totals. */
export function BudgetEditor({
  open,
  onOpenChange,
  monthLabel,
  monthName,
  previousName,
  monthStart,
  notes,
  categories,
  current,
  previous,
  seed,
  focusCategoryId,
  spentLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthLabel: string;
  monthName: string;
  previousName: string;
  monthStart: string;
  notes: string | null;
  categories: readonly BudgetCategory[];
  current: BudgetMonthData;
  previous: BudgetMonthData;
  seed: BudgetEditorSeed;
  focusCategoryId: string | null;
  spentLabel: string;
}) {
  return (
    <MoneySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={monthLabel}
      title={current.hasPlan ? "Edit plan" : `Plan ${monthName}`}
      description="Set what you mean to spend in each category this month."
      closeLabel="Close plan editor"
      onOpenAutoFocus={(event) => {
        if (!focusCategoryId) return;
        const input = document.getElementById(
          budgetItemInputId(focusCategoryId),
        );
        if (!input) return;
        event.preventDefault();
        input.focus({ preventScroll: true });
        input.scrollIntoView({ block: "center" });
      }}
    >
      <BudgetEditorForm
        monthStart={monthStart}
        monthName={monthName}
        previousName={previousName}
        notes={notes}
        categories={categories}
        current={current}
        previous={previous}
        seed={seed}
        spentLabel={spentLabel}
        onSaved={() => onOpenChange(false)}
      />
    </MoneySheet>
  );
}
