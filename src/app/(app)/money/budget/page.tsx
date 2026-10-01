import type { BudgetMonthData } from "@/components/money/budget-editor";
import { BudgetWorkspace } from "@/components/money/budget-workspace";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { shiftMonth } from "@/lib/budgets/plan";
import { formatCalendarMonth, resolveCalendarMonth } from "@/lib/dates/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Budget" };

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type BudgetRow = {
  month_start: string;
  expected_income_centavos: number;
  notes: string | null;
  budget_items: Array<{ category_id: string; planned_centavos: number }>;
};

function monthData(
  budget: BudgetRow | undefined,
  spent: Record<string, number>,
): BudgetMonthData {
  return {
    planned: Object.fromEntries(
      (budget?.budget_items ?? []).map((item) => [
        item.category_id,
        Number(item.planned_centavos),
      ]),
    ),
    spent,
    expectedIncomeCentavos: Number(budget?.expected_income_centavos ?? 0),
    hasPlan: Boolean(budget && budget.budget_items.length > 0),
  };
}

export default async function BudgetPage({
  searchParams,
}: PageProps<"/money/budget">) {
  const today = todayInManila();
  const month = resolveCalendarMonth(
    (await searchParams).month,
    today.slice(0, 7),
  );
  const previousMonth = shiftMonth(month, -1);
  const monthStart = `${month}-01`;
  const previousStart = `${previousMonth}-01`;
  const nextStart = `${shiftMonth(month, 1)}-01`;

  const supabase = await createClient();
  // This month and last month come together: last month seeds new plans
  // and gives each category a reference point.
  const [categoriesResult, budgetsResult, expensesResult] = supabase
    ? await Promise.all([
        supabase
          .from("transaction_categories")
          .select("id,name,icon")
          .eq("category_type", "expense")
          .order("name"),
        supabase
          .from("monthly_budgets")
          .select(
            "month_start,expected_income_centavos,notes,budget_items(category_id,planned_centavos)",
          )
          .in("month_start", [previousStart, monthStart]),
        supabase
          .from("transactions")
          .select("category_id,amount_centavos,transaction_date")
          .eq("transaction_type", "expense")
          .gte("transaction_date", previousStart)
          .lt("transaction_date", nextStart),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const spentThisMonth: Record<string, number> = {};
  const spentLastMonth: Record<string, number> = {};
  for (const row of expensesResult.data ?? []) {
    const bucket =
      row.transaction_date < monthStart ? spentLastMonth : spentThisMonth;
    bucket[row.category_id] =
      (bucket[row.category_id] ?? 0) + Number(row.amount_centavos);
  }
  const budgets = (budgetsResult.data ?? []) as BudgetRow[];
  const budget = budgets.find((row) => row.month_start === monthStart);
  const previousBudget = budgets.find(
    (row) => row.month_start === previousStart,
  );

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow={`Money / Budget / ${formatCalendarMonth(month)}`}
        title="Monthly plan"
        description="What you mean to spend in each category, against what you actually record. Overspending is always named in text."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/money/budget" />
      <BudgetWorkspace
        month={month}
        today={today}
        categories={categoriesResult.data ?? []}
        current={monthData(budget, spentThisMonth)}
        previous={monthData(previousBudget, spentLastMonth)}
        notes={budget?.notes ?? null}
      />
    </div>
  );
}
