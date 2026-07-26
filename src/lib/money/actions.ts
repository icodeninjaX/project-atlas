"use server";

import { revalidatePath } from "next/cache";
import { pesoInputToCentavos } from "./money";
import { createClient } from "@/lib/supabase/server";
import { accountSchema, transactionSchema } from "@/lib/validation/schemas";

export type MoneyActionState = { success: boolean; message: string };

async function authenticatedClient() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function createAccountAction(
  _state: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const auth = await authenticatedClient();
  if (!auth) return { success: false, message: "Your session is unavailable." };

  let openingBalanceCentavos: number;
  try {
    const value = String(formData.get("openingBalance") || "0");
    const negative = value.trim().startsWith("-");
    openingBalanceCentavos = pesoInputToCentavos(value.replace(/^-/, ""));
    if (negative) openingBalanceCentavos *= -1;
  } catch {
    return { success: false, message: "Enter a valid opening balance." };
  }

  const result = accountSchema.safeParse({
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    institution: formData.get("institution"),
    openingBalanceCentavos,
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the account.",
    };
  }

  const { error } = await auth.supabase.from("financial_accounts").insert({
    user_id: auth.user.id,
    name: result.data.name,
    account_type: result.data.accountType,
    institution: result.data.institution ?? null,
    opening_balance_centavos: result.data.openingBalanceCentavos,
  });
  if (error)
    return { success: false, message: "The account could not be saved." };

  revalidatePath("/money/accounts");
  revalidatePath("/dashboard");
  return { success: true, message: "Account added." };
}

export async function updateAccountAction(
  _state: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const id = String(formData.get("accountId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { success: false, message: "The account could not be found." };
  }

  const auth = await authenticatedClient();
  if (!auth) return { success: false, message: "Your session is unavailable." };

  const result = accountSchema.safeParse({
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    institution: formData.get("institution"),
    openingBalanceCentavos: 0,
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the account.",
    };
  }

  const { error } = await auth.supabase
    .from("financial_accounts")
    .update({
      name: result.data.name,
      account_type: result.data.accountType,
      institution: result.data.institution ?? null,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id);
  if (error)
    return { success: false, message: "The account could not be updated." };

  revalidatePath("/money/accounts");
  revalidatePath("/dashboard");
  return { success: true, message: "Account updated." };
}

export async function archiveAccountAction(formData: FormData) {
  const id = String(formData.get("accountId") ?? "");
  const archived = formData.get("archived") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const auth = await authenticatedClient();
  if (!auth) return;

  await auth.supabase
    .from("financial_accounts")
    .update({ is_archived: archived })
    .eq("id", id)
    .eq("user_id", auth.user.id);
  revalidatePath("/money/accounts");
  revalidatePath("/dashboard");
}

export async function createTransactionAction(
  _state: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const auth = await authenticatedClient();
  if (!auth) return { success: false, message: "Your session is unavailable." };

  let amountCentavos: number;
  try {
    amountCentavos = pesoInputToCentavos(String(formData.get("amount") ?? ""));
  } catch {
    return { success: false, message: "Enter a valid positive amount." };
  }

  const result = transactionSchema.safeParse({
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
    type: formData.get("type"),
    amountCentavos,
    transactionDate: formData.get("transactionDate"),
    merchantOrSource: formData.get("merchantOrSource"),
    description: formData.get("description"),
  });
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Check the transaction.",
    };
  }

  const { error } = await auth.supabase.from("transactions").insert({
    user_id: auth.user.id,
    account_id: result.data.accountId,
    category_id: result.data.categoryId,
    transaction_type: result.data.type,
    amount_centavos: result.data.amountCentavos,
    transaction_date: result.data.transactionDate,
    merchant_or_source: result.data.merchantOrSource ?? null,
    description: result.data.description ?? null,
  });
  if (error)
    return { success: false, message: "The transaction could not be saved." };

  revalidatePath("/money/transactions");
  revalidatePath("/money/accounts");
  revalidatePath("/dashboard");
  return { success: true, message: "Transaction recorded." };
}

export async function createTransferAction(
  _state: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const auth = await authenticatedClient();
  if (!auth) return { success: false, message: "Your session is unavailable." };
  const source = String(formData.get("sourceAccountId") ?? "");
  const destination = String(formData.get("destinationAccountId") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(source) ||
    !/^[0-9a-f-]{36}$/i.test(destination) ||
    source === destination
  ) {
    return { success: false, message: "Choose two different accounts." };
  }
  let amountCentavos: number;
  try {
    amountCentavos = pesoInputToCentavos(String(formData.get("amount") ?? ""));
  } catch {
    return { success: false, message: "Enter a valid positive amount." };
  }
  const transferDate = String(formData.get("transferDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transferDate))
    return { success: false, message: "Choose a transfer date." };
  const { error } = await auth.supabase.from("account_transfers").insert({
    user_id: auth.user.id,
    source_account_id: source,
    destination_account_id: destination,
    amount_centavos: amountCentavos,
    transfer_date: transferDate,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error)
    return { success: false, message: "The transfer could not be saved." };
  revalidatePath("/money/accounts");
  revalidatePath("/money/transactions");
  revalidatePath("/dashboard");
  return { success: true, message: "Transfer recorded." };
}

export async function deleteTransactionAction(formData: FormData) {
  const id = String(formData.get("transactionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const auth = await authenticatedClient();
  if (!auth) return;

  await auth.supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);
  revalidatePath("/money/transactions");
  revalidatePath("/money/accounts");
  revalidatePath("/dashboard");
}
