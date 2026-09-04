import "server-only";

import {
  calculateRunway,
  type RunwayBudget,
  type RunwaySource,
} from "@/lib/runway/engine";
import { createClient } from "@/lib/supabase/server";

function manilaMonthStart(now: Date): string {
  return (
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    }).format(now) + "-01"
  );
}

function threeMonthsBefore(monthStart: string): string {
  const value = new Date(`${monthStart}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() - 3);
  return value.toISOString().slice(0, 10);
}

export type RunwayWorkspace = {
  source: RunwaySource;
  analysis: ReturnType<typeof calculateRunway>;
  monthStart: string;
};

export async function loadRunwayWorkspace(
  now = new Date(),
): Promise<RunwayWorkspace | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const monthStart = manilaMonthStart(now);
  const historyStart = threeMonthsBefore(monthStart);
  const [
    accountsResult,
    categoriesResult,
    profileResult,
    debtsResult,
    totalsResult,
    budgetsResult,
  ] = await Promise.all([
    supabase
      .from("financial_account_balances")
      .select(
        "id,name,account_type,current_balance_centavos,include_in_runway,is_archived",
      )
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("transaction_categories")
      .select("id,name,is_essential,is_system")
      .eq("user_id", user.id)
      .eq("category_type", "expense")
      .order("name"),
    supabase
      .from("profiles")
      .select("monthly_net_income_centavos")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("debts")
      .select(
        "id,creditor_name,current_balance_centavos,interest_rate_percent,minimum_payment_centavos,status",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("creditor_name"),
    supabase.rpc("runway_monthly_totals", {
      p_start_date: historyStart,
      p_end_date: monthStart,
    }),
    supabase
      .from("monthly_budgets")
      .select("id,month_start,expected_income_centavos")
      .eq("user_id", user.id)
      .lte("month_start", monthStart)
      .order("month_start", { ascending: false }),
  ]);

  const errors = [
    accountsResult.error,
    categoriesResult.error,
    profileResult.error,
    debtsResult.error,
    totalsResult.error,
    budgetsResult.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error("Runway data could not be loaded.");
  }

  const budgetIds = (budgetsResult.data ?? []).map((budget) => budget.id);
  const { data: budgetItems, error: budgetItemsError } = budgetIds.length
    ? await supabase
        .from("budget_items")
        .select("monthly_budget_id,category_id,planned_centavos")
        .eq("user_id", user.id)
        .in("monthly_budget_id", budgetIds)
    : { data: [], error: null };
  if (budgetItemsError)
    throw new Error("Runway budget data could not be loaded.");

  const selectedCategoryIds = new Set(
    (categoriesResult.data ?? [])
      .filter(
        (category) =>
          category.is_essential &&
          category.name.toLowerCase() !== "debt payment",
      )
      .map((category) => category.id),
  );
  const budget = (budgetsResult.data ?? []).reduce<RunwayBudget | null>(
    (latest, candidate) => {
      if (latest) return latest;
      const items = (budgetItems ?? [])
        .filter((item) => item.monthly_budget_id === candidate.id)
        .map((item) => ({
          categoryId: item.category_id,
          plannedCentavos: Number(item.planned_centavos),
        }));
      return items.some(
        (item) =>
          selectedCategoryIds.has(item.categoryId) && item.plannedCentavos > 0,
      )
        ? {
            monthStart: candidate.month_start,
            expectedIncomeCentavos: Number(candidate.expected_income_centavos),
            items,
          }
        : null;
    },
    null,
  );

  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("runway_target_months")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferencesError)
    throw new Error("Runway preferences could not be loaded.");

  const source: RunwaySource = {
    accounts: (accountsResult.data ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      accountType: account.account_type,
      currentBalanceCentavos: Number(account.current_balance_centavos),
      includeInRunway: account.include_in_runway,
      isArchived: account.is_archived,
    })),
    categories: (categoriesResult.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      isEssential: category.is_essential,
      isSystem: category.is_system,
    })),
    monthlyTotals: (
      (totalsResult.data ?? []) as Array<{
        month_start: string;
        category_id: string;
        transaction_type: string;
        amount_centavos: number;
      }>
    ).map((total) => ({
      monthStart: total.month_start,
      categoryId: total.category_id,
      transactionType: total.transaction_type as "income" | "expense",
      amountCentavos: Number(total.amount_centavos),
    })),
    budget,
    debts: (debtsResult.data ?? []).map((debt) => ({
      id: debt.id,
      creditorName: debt.creditor_name,
      currentBalanceCentavos: Number(debt.current_balance_centavos),
      interestRatePercent: Number(debt.interest_rate_percent),
      minimumPaymentCentavos: Number(debt.minimum_payment_centavos),
      status: debt.status,
    })),
    profileMonthlyNetIncomeCentavos: Number(
      profileResult.data?.monthly_net_income_centavos ?? 0,
    ),
    targetMonths: Number(preferences?.runway_target_months ?? 3),
  };

  return { source, analysis: calculateRunway(source, now), monthStart };
}
