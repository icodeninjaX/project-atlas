"use client";

import { useMemo, useState } from "react";
import {
  BudgetEditor,
  type BudgetEditorSeed,
  type BudgetMonthData,
} from "@/components/money/budget-editor";
import {
  BudgetEnvelopes,
  UnplannedSpending,
} from "@/components/money/budget-envelopes";
import {
  BudgetHero,
  formatMonthLong,
  formatMonthName,
} from "@/components/money/budget-hero";
import {
  buildBudgetPlan,
  monthPace,
  shiftMonth,
  type BudgetCategory,
} from "@/lib/budgets/plan";

type EditorState = {
  open: boolean;
  seed: BudgetEditorSeed;
  focusCategoryId: string | null;
};

/**
 * The budget page body: the month at a glance, each category's envelope,
 * spending outside the plan, and the editor that changes it.
 */
export function BudgetWorkspace({
  month,
  today,
  categories,
  current,
  previous,
  notes,
}: {
  /** YYYY-MM being viewed. */
  month: string;
  /** YYYY-MM-DD in Manila. */
  today: string;
  categories: BudgetCategory[];
  current: BudgetMonthData;
  previous: BudgetMonthData;
  notes: string | null;
}) {
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    seed: "current",
    focusCategoryId: null,
  });
  const plan = useMemo(
    () =>
      buildBudgetPlan({
        categories,
        planned: current.planned,
        spent: current.spent,
      }),
    [categories, current.planned, current.spent],
  );
  const pace = monthPace(month, today);
  const listed = new Set(categories.map((category) => category.id));

  const openEditor = (
    seed: BudgetEditorSeed = "current",
    focusCategoryId: string | null = null,
  ) => setEditor({ open: true, seed, focusCategoryId });

  return (
    <>
      <BudgetHero
        month={month}
        currentMonth={today.slice(0, 7)}
        pace={pace}
        plan={plan}
        hasPlan={current.hasPlan}
        expectedIncomeCentavos={current.expectedIncomeCentavos}
        previousPlanAvailable={previous.hasPlan}
        onEdit={() => openEditor()}
        onCopyPrevious={() => openEditor("previous-plan")}
      />
      <BudgetEnvelopes
        plan={plan}
        onEdit={(categoryId) => openEditor("current", categoryId)}
      />
      <UnplannedSpending
        items={plan.unplanned}
        hasPlan={current.hasPlan}
        canPlan={(categoryId) => listed.has(categoryId)}
        onPlan={(categoryId) => openEditor("current", categoryId)}
      />
      <BudgetEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((state) => ({ ...state, open }))}
        monthLabel={formatMonthLong(month)}
        monthName={formatMonthName(month)}
        previousName={formatMonthName(shiftMonth(month, -1))}
        monthStart={`${month}-01`}
        notes={notes}
        categories={categories}
        current={current}
        previous={previous}
        seed={editor.seed}
        focusCategoryId={editor.focusCategoryId}
        spentLabel={pace.phase === "current" ? "so far" : "spent"}
      />
    </>
  );
}
