import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateSignals,
  getSignalDataWindow,
  type Signal,
  type SignalSourceData,
} from "@/lib/signals/engine";

export class SignalLoadError extends Error {
  constructor() {
    super("Signals could not be calculated from the available data.");
    this.name = "SignalLoadError";
  }
}

function assertSuccessful(
  results: Array<{ error?: { message: string } | null }>,
): void {
  if (results.some((result) => result.error)) {
    throw new SignalLoadError();
  }
}

export async function loadSignals(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<Signal[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new SignalLoadError();

  const window = getSignalDataWindow(now);
  const results = await Promise.all([
    supabase
      .from("transactions")
      .select("category_id,amount_centavos,transaction_date")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", window.oldestTransactionDate)
      .lt("transaction_date", window.nextMonthStart)
      .limit(5000),
    supabase
      .from("transaction_categories")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("category_type", "expense")
      .limit(500),
    supabase
      .from("monthly_budgets")
      .select("id,month_start")
      .eq("user_id", user.id)
      .eq("month_start", window.monthStart)
      .maybeSingle(),
    supabase
      .from("debts")
      .select(
        "id,creditor_name,current_balance_centavos,next_due_date,status,created_at",
      )
      .eq("user_id", user.id)
      .limit(1000),
    supabase
      .from("debt_payments")
      .select("debt_id,amount_centavos,payment_date")
      .eq("user_id", user.id)
      .gte("payment_date", window.monthStart)
      .lt("payment_date", window.nextMonthStart)
      .limit(5000),
    supabase
      .from("tasks")
      .select("id,status,due_at,scheduled_for,completed_at,created_at")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .limit(5000),
    supabase
      .from("tasks")
      .select("id,status,due_at,scheduled_for,completed_at,created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", window.completedTaskLookbackIso)
      .limit(5000),
    supabase
      .from("job_applications")
      .select("id,stage,applied_at,next_action_at,updated_at")
      .eq("user_id", user.id)
      .limit(2000),
    supabase
      .from("job_application_events")
      .select("job_application_id,event_type,occurred_at")
      .eq("user_id", user.id)
      .gte("occurred_at", window.recentCareerIso)
      .limit(5000),
    supabase
      .from("goals")
      .select("id,title,status,target_date,progress_percent,updated_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1000),
    supabase
      .from("goal_milestones")
      .select("id,goal_id,completed_at,updated_at")
      .eq("user_id", user.id)
      .limit(5000),
  ]);

  assertSuccessful(results);
  const [
    transactionResult,
    categoryResult,
    budgetResult,
    debtResult,
    debtPaymentResult,
    activeTaskResult,
    completedTaskResult,
    applicationResult,
    applicationEventResult,
    goalResult,
    milestoneResult,
  ] = results;

  const budget = budgetResult.data;
  const budgetItemResult = budget
    ? await supabase
        .from("budget_items")
        .select("planned_centavos")
        .eq("user_id", user.id)
        .eq("monthly_budget_id", budget.id)
        .limit(1000)
    : { data: [], error: null };
  assertSuccessful([budgetItemResult]);

  const source: SignalSourceData = {
    transactions: (transactionResult.data ?? []).map((transaction) => ({
      categoryId: transaction.category_id,
      amountCentavos: Number(transaction.amount_centavos),
      transactionDate: transaction.transaction_date,
    })),
    categories: (categoryResult.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
    })),
    currentBudget: budget
      ? {
          monthStart: budget.month_start,
          plannedCentavos: (budgetItemResult.data ?? []).reduce(
            (total, item) => total + Number(item.planned_centavos),
            0,
          ),
        }
      : null,
    debts: (debtResult.data ?? []).map((debt) => ({
      id: debt.id,
      creditorName: debt.creditor_name,
      currentBalanceCentavos: Number(debt.current_balance_centavos),
      nextDueDate: debt.next_due_date,
      status: debt.status,
      createdAt: debt.created_at,
    })),
    debtPayments: (debtPaymentResult.data ?? []).map((payment) => ({
      debtId: payment.debt_id,
      amountCentavos: Number(payment.amount_centavos),
      paymentDate: payment.payment_date,
    })),
    tasks: [
      ...(activeTaskResult.data ?? []),
      ...(completedTaskResult.data ?? []),
    ].map((task) => ({
      id: task.id,
      status: task.status,
      dueAt: task.due_at,
      scheduledFor: task.scheduled_for,
      completedAt: task.completed_at,
      createdAt: task.created_at,
    })),
    applications: (applicationResult.data ?? []).map((application) => ({
      id: application.id,
      stage: application.stage,
      appliedAt: application.applied_at,
      nextActionAt: application.next_action_at,
      updatedAt: application.updated_at,
    })),
    applicationEvents: (applicationEventResult.data ?? []).map((event) => ({
      applicationId: event.job_application_id,
      eventType: event.event_type,
      occurredAt: event.occurred_at,
    })),
    goals: (goalResult.data ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      targetDate: goal.target_date,
      progressPercent: goal.progress_percent,
      updatedAt: goal.updated_at,
    })),
    milestones: (milestoneResult.data ?? []).map((milestone) => ({
      id: milestone.id,
      goalId: milestone.goal_id,
      completedAt: milestone.completed_at,
      updatedAt: milestone.updated_at,
    })),
  };

  return generateSignals(source, now);
}
