"use server";

import { revalidatePath } from "next/cache";
import { pesoInputToCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";
import { debtPaymentSchema, debtSchema } from "@/lib/validation/schemas";

export type DebtActionState = { success: boolean; message: string };

async function auth() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function createDebtAction(
  _state: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
  const session = await auth();
  if (!session)
    return { success: false, message: "Your session is unavailable." };

  let originalBalanceCentavos: number;
  let minimumPaymentCentavos: number;
  try {
    originalBalanceCentavos = pesoInputToCentavos(
      String(formData.get("originalBalance") ?? ""),
    );
    minimumPaymentCentavos = pesoInputToCentavos(
      String(formData.get("minimumPayment") || "0"),
    );
  } catch {
    return { success: false, message: "Enter valid peso balances." };
  }
  const dueDayValue = formData.get("dueDay");
  const result = debtSchema.safeParse({
    creditorName: formData.get("creditorName"),
    debtType: formData.get("debtType"),
    originalBalanceCentavos,
    interestRatePercent: Number(formData.get("interestRatePercent") || 0),
    minimumPaymentCentavos,
    dueDay: dueDayValue ? Number(dueDayValue) : undefined,
    nextDueDate: formData.get("nextDueDate") || undefined,
    status: "active",
    priority: Number(formData.get("priority") || 1),
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the debt.",
    };

  const { error } = await session.supabase.from("debts").insert({
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
  });
  if (error) return { success: false, message: "The debt could not be saved." };

  revalidatePath("/debts");
  revalidatePath("/dashboard");
  return { success: true, message: "Debt added." };
}

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

  const { error } = await session.supabase.from("debt_payments").insert({
    user_id: session.user.id,
    debt_id: result.data.debtId,
    amount_centavos: result.data.amountCentavos,
    payment_date: result.data.paymentDate,
    notes: result.data.notes ?? null,
  });
  if (error)
    return {
      success: false,
      message:
        "The payment exceeds the remaining balance or could not be saved.",
    };

  revalidatePath("/debts");
  revalidatePath(`/debts/${result.data.debtId}`);
  revalidatePath("/dashboard");
  return {
    success: true,
    message: "Payment recorded and balance recalculated.",
  };
}

export async function deleteDebtPaymentAction(formData: FormData) {
  const paymentId = String(formData.get("paymentId") ?? "");
  const debtId = String(formData.get("debtId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(paymentId) || !/^[0-9a-f-]{36}$/i.test(debtId))
    return;
  const session = await auth();
  if (!session) return;
  await session.supabase
    .from("debt_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", session.user.id);
  revalidatePath("/debts");
  revalidatePath(`/debts/${debtId}`);
  revalidatePath("/dashboard");
}
