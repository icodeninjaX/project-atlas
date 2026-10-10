"use server";

import { revalidatePath } from "next/cache";
import {
  linkCreatedRecordToGoal,
  relatedGoalIdFrom,
  withGoalLinkMessage,
} from "@/lib/graph/link";
import { formatCentavos, pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { debtPaymentSchema, debtSchema } from "@/lib/validation/schemas";
import { offlineEntityId } from "@/lib/offline/server";
import { manilaClock, manilaIsoDate } from "@/lib/tasks/task-view";
import { annualRatePercent } from "./debt";
import { dueDayFor, followingDueDate } from "./schedule";

export type DebtActionState = { success: boolean; message: string };

const UUID = /^[0-9a-f-]{36}$/i;

const shortDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

async function auth() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

type Session = NonNullable<Awaited<ReturnType<typeof auth>>>;

function revalidateDebt(id?: string) {
  revalidatePath("/debts");
  if (id) revalidatePath(`/debts/${id}`);
  revalidatePath("/money/runway");
  revalidatePath("/dashboard");
}

function revalidateMoney() {
  revalidatePath("/money/transactions");
  revalidatePath("/money/accounts");
}

/** The rate as typed, a year's worth whether it was entered by month or year. */
function rateFrom(formData: FormData) {
  return annualRatePercent(
    Number(formData.get("interestRatePercent") || 0),
    formData.get("interestRateUnit") === "month" ? "month" : "year",
  );
}

/**
 * The due date and the day it repeats on. The form sends only the date;
 * older queued edits may still carry a due day of their own.
 */
function scheduleFrom(formData: FormData, savedDueDay: number | null) {
  const nextDueDate = String(formData.get("nextDueDate") ?? "") || undefined;
  const sentDueDay = formData.get("dueDay");
  const dueDay = nextDueDate
    ? dueDayFor(nextDueDate, savedDueDay)
    : sentDueDay
      ? Number(sentDueDay)
      : undefined;
  return { nextDueDate, dueDay };
}

async function paidTotal(session: Session, debtId: string) {
  const { data, error } = await session.supabase
    .from("debt_payments")
    .select("amount_centavos")
    .eq("debt_id", debtId)
    .eq("user_id", session.user.id);
  if (error) return null;
  return (data ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount_centavos),
    0,
  );
}

export async function createDebtAction(
  _state: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };

  let balanceCentavos: number;
  let minimumPaymentCentavos: number;
  try {
    balanceCentavos = pesoInputToCentavos(
      String(formData.get("balance") ?? formData.get("originalBalance") ?? ""),
    );
    minimumPaymentCentavos = pesoInputToCentavos(
      String(formData.get("minimumPayment") || "0"),
    );
  } catch {
    return { success: false, message: "Enter valid peso balances." };
  }

  // A new debt goes to the end of "My priority" unless a queued older
  // form says otherwise.
  let priority = Number(formData.get("priority") || 0);
  if (!priority) {
    const { data: last } = await session.supabase
      .from("debts")
      .select("priority")
      .eq("user_id", session.user.id)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();
    priority = Number(last?.priority ?? 0) + 1;
  }

  const schedule = scheduleFrom(formData, null);
  const result = debtSchema.safeParse({
    creditorName: formData.get("creditorName"),
    debtType: formData.get("debtType"),
    originalBalanceCentavos: balanceCentavos,
    interestRatePercent: rateFrom(formData),
    minimumPaymentCentavos,
    dueDay: schedule.dueDay,
    nextDueDate: schedule.nextDueDate,
    status: "active",
    priority,
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the debt.",
    };

  const { data: created, error } = await session.supabase
    .from("debts")
    .insert({
      ...(offlineEntityId(formData) ? { id: offlineEntityId(formData) } : {}),
      user_id: session.user.id,
      creditor_name: result.data.creditorName,
      debt_type: result.data.debtType,
      original_balance_centavos: result.data.originalBalanceCentavos,
      current_balance_centavos: result.data.originalBalanceCentavos,
      interest_rate_percent: result.data.interestRatePercent,
      minimum_payment_centavos: result.data.minimumPaymentCentavos,
      due_day: result.data.dueDay ?? null,
      next_due_date: result.data.nextDueDate ?? null,
      status: result.data.status,
      priority: result.data.priority,
      notes: result.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { success: false, message: "The debt could not be saved." };
  const link = await linkCreatedRecordToGoal(
    session.supabase,
    session.user.id,
    "debt",
    created.id,
    relatedGoalIdFrom(formData),
  );

  revalidateDebt();
  if (link.linked) revalidatePath("/goals");
  return { success: true, message: withGoalLinkMessage("Debt added.", link) };
}

/**
 * Saves a debt's terms. The balance entered is what is owed today: the
 * amount owed in all is set to it plus every payment so far, so payments
 * keep their history and the balance stays put when the next one lands.
 */
export async function updateDebtAction(
  _state: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
  const id = String(formData.get("debtId") ?? "");
  if (!UUID.test(id))
    return { success: false, message: "The debt could not be found." };
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };

  const { data: existing } = await session.supabase
    .from("debts")
    .select("priority,due_day")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!existing)
    return { success: false, message: "The debt could not be found." };

  let balanceCentavos: number;
  let minimumPaymentCentavos: number;
  try {
    balanceCentavos = pesoInputToCentavos(
      String(formData.get("currentBalance") ?? ""),
    );
    minimumPaymentCentavos = pesoInputToCentavos(
      String(formData.get("minimumPayment") || "0"),
    );
  } catch {
    return { success: false, message: "Enter valid peso balances." };
  }
  const paid = await paidTotal(session, id);
  if (paid === null)
    return { success: false, message: "The debt could not be updated." };
  if (balanceCentavos + paid <= 0)
    return {
      success: false,
      message:
        "Enter what is still owed. To remove a debt with no payments, delete it.",
    };

  const requested = String(formData.get("status") ?? "active");
  const status =
    balanceCentavos === 0
      ? "paid"
      : requested === "paused" || requested === "defaulted"
        ? requested
        : "active";
  const schedule = scheduleFrom(
    formData,
    existing.due_day === null ? null : Number(existing.due_day),
  );
  const result = debtSchema.safeParse({
    creditorName: formData.get("creditorName"),
    debtType: formData.get("debtType"),
    originalBalanceCentavos: balanceCentavos + paid,
    interestRatePercent: rateFrom(formData),
    minimumPaymentCentavos,
    dueDay: schedule.dueDay,
    nextDueDate: schedule.nextDueDate,
    status,
    priority: Number(formData.get("priority") || existing.priority),
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the debt.",
    };
  const { error } = await session.supabase
    .from("debts")
    .update({
      creditor_name: result.data.creditorName,
      debt_type: result.data.debtType,
      original_balance_centavos: result.data.originalBalanceCentavos,
      current_balance_centavos: balanceCentavos,
      interest_rate_percent: result.data.interestRatePercent,
      minimum_payment_centavos: result.data.minimumPaymentCentavos,
      due_day: result.data.dueDay ?? null,
      next_due_date: result.data.nextDueDate ?? null,
      status: result.data.status,
      priority: result.data.priority,
      notes: result.data.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error)
    return { success: false, message: "The debt could not be updated." };
  revalidateDebt(id);
  return { success: true, message: "Debt updated." };
}

/** Removes a debt and its payments. Expenses logged in Money stay. */
export async function deleteDebtAction(
  formData: FormData,
): Promise<DebtActionState> {
  const id = String(formData.get("debtId") ?? "");
  if (!UUID.test(id))
    return { success: false, message: "The debt could not be found." };
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };
  const { error } = await session.supabase
    .from("debts")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error)
    return { success: false, message: "The debt could not be deleted." };
  revalidateDebt(id);
  return { success: true, message: "Debt deleted." };
}

/** Saves "My priority": the debts in the order given, first to last. */
export async function reorderDebtsAction(
  formData: FormData,
): Promise<DebtActionState> {
  const ids = String(formData.get("order") ?? "")
    .split(",")
    .filter(Boolean);
  if (
    ids.length === 0 ||
    ids.length > 200 ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => UUID.test(id))
  )
    return { success: false, message: "The order could not be saved." };
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };
  const results = await Promise.all(
    ids.map((id, index) =>
      session.supabase
        .from("debts")
        .update({ priority: index + 1 })
        .eq("id", id)
        .eq("user_id", session.user.id),
    ),
  );
  if (results.some((result) => result.error))
    return { success: false, message: "The order could not be saved." };
  revalidateDebt();
  return { success: true, message: "Priority order saved." };
}

/** The person's Debt Payment expense category, made if it is missing. */
async function debtPaymentCategoryId(session: Session) {
  const { data } = await session.supabase
    .from("transaction_categories")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("category_type", "expense")
    .ilike("name", "debt payment")
    .limit(1)
    .maybeSingle();
  if (data) return data.id as string;
  const { data: created } = await session.supabase
    .from("transaction_categories")
    .insert({
      user_id: session.user.id,
      name: "Debt Payment",
      category_type: "expense",
      icon: "landmark",
    })
    .select("id")
    .single();
  return (created?.id as string | undefined) ?? null;
}

/**
 * Records a payment. With an account, it is also logged in Money as a
 * Debt Payment expense from that account. Marked as settling the bill
 * due, it moves the debt's next due date on a month.
 */
export async function recordDebtPaymentAction(
  _state: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };

  let amountCentavos: number;
  try {
    amountCentavos = pesoInputToCentavos(String(formData.get("amount") ?? ""));
  } catch {
    return { success: false, message: "Enter a valid positive payment." };
  }
  const result = debtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    amountCentavos,
    paymentDate: formData.get("paymentDate"),
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the payment.",
    };
  const accountId = String(formData.get("accountId") ?? "");
  if (accountId && !UUID.test(accountId))
    return { success: false, message: "Choose an account from the list." };

  const { data: debt } = await session.supabase
    .from("debts")
    .select("creditor_name,current_balance_centavos,next_due_date,due_day")
    .eq("id", result.data.debtId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!debt) return { success: false, message: "The debt could not be found." };
  const balance = Number(debt.current_balance_centavos);
  if (result.data.amountCentavos > balance)
    return {
      success: false,
      message: `That is more than the ${formatCentavos(balance)} still owed.`,
    };

  let transactionId: string | null = null;
  let accountName: string | null = null;
  if (accountId) {
    const [{ data: account }, categoryId] = await Promise.all([
      session.supabase
        .from("financial_accounts")
        .select("name")
        .eq("id", accountId)
        .eq("user_id", session.user.id)
        .eq("is_archived", false)
        .maybeSingle(),
      debtPaymentCategoryId(session),
    ]);
    if (!account || !categoryId)
      return {
        success: false,
        message: "That account could not be used. Choose another.",
      };
    accountName = account.name as string;
    const now = new Date();
    const { data: transaction, error } = await session.supabase
      .from("transactions")
      .insert({
        user_id: session.user.id,
        account_id: accountId,
        category_id: categoryId,
        transaction_type: "expense",
        amount_centavos: result.data.amountCentavos,
        transaction_date: result.data.paymentDate,
        transaction_time:
          manilaIsoDate(now) === result.data.paymentDate
            ? manilaClock(now)
            : null,
        merchant_or_source: debt.creditor_name,
        description: result.data.notes ?? "Debt payment",
      })
      .select("id")
      .single();
    if (error)
      return {
        success: false,
        message: "The payment could not be logged from that account.",
      };
    transactionId = transaction.id as string;
  }

  const { error } = await session.supabase.from("debt_payments").insert({
    ...(offlineEntityId(formData) ? { id: offlineEntityId(formData) } : {}),
    user_id: session.user.id,
    debt_id: result.data.debtId,
    amount_centavos: result.data.amountCentavos,
    payment_date: result.data.paymentDate,
    transaction_id: transactionId,
    notes: result.data.notes ?? null,
  });
  if (error) {
    if (transactionId) {
      await session.supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", session.user.id);
    }
    return {
      success: false,
      message:
        "The payment exceeds the remaining balance or could not be saved.",
    };
  }

  const parts = ["Payment recorded."];
  const cleared = result.data.amountCentavos === balance;
  if (formData.get("settlesDue") === "on" && debt.next_due_date && !cleared) {
    const savedDueDay = debt.due_day === null ? null : Number(debt.due_day);
    const next = followingDueDate(debt.next_due_date, savedDueDay);
    const { error: scheduleError } = await session.supabase
      .from("debts")
      .update({
        next_due_date: next,
        due_day: savedDueDay ?? dueDayFor(debt.next_due_date, null),
      })
      .eq("id", result.data.debtId)
      .eq("user_id", session.user.id);
    parts.push(
      scheduleError
        ? "The next due date could not be moved; change it in Edit."
        : `Next due ${shortDate.format(new Date(`${next}T00:00:00Z`))}.`,
    );
  }
  if (cleared) parts.push("This debt is paid off.");
  if (accountName) parts.push(`Logged as an expense from ${accountName}.`);

  revalidateDebt(result.data.debtId);
  if (transactionId) revalidateMoney();
  return { success: true, message: parts.join(" ") };
}

/** Deletes a payment, and the Money expense it logged, if any. */
export async function deleteDebtPaymentAction(
  formData: FormData,
): Promise<DebtActionState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  const debtId = String(formData.get("debtId") ?? "");
  if (!UUID.test(paymentId) || !UUID.test(debtId))
    return { success: false, message: "The payment could not be found." };
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };
  const { data: payment } = await session.supabase
    .from("debt_payments")
    .select("transaction_id")
    .eq("id", paymentId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  const { error } = await session.supabase
    .from("debt_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", session.user.id);
  if (error)
    return { success: false, message: "The payment could not be deleted." };
  const transactionId = payment?.transaction_id as string | null | undefined;
  if (transactionId) {
    await session.supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", session.user.id);
    revalidateMoney();
  }
  revalidateDebt(debtId);
  return {
    success: true,
    message: transactionId
      ? "Payment deleted, with its expense in Money."
      : "Payment deleted.",
  };
}
