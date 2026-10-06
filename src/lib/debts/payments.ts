import type { createClient } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export type DebtPaymentRow = {
  debt_id: string;
  amount_centavos: number | string;
  payment_date: string;
};

const PAYMENT_COLUMNS = "debt_id,amount_centavos,payment_date";

/**
 * The payments the debts page needs, newest first: every payment dated in
 * the month from `monthStart` (inclusive) to `nextMonthStart` (exclusive),
 * plus each debt's latest payment. Each debt's latest is read on its own,
 * so busy debts never crowd a quiet one's last payment out of a shared cap.
 */
export async function loadDebtPagePayments(
  supabase: Supabase,
  debtIds: string[],
  monthStart: string,
  nextMonthStart: string,
): Promise<DebtPaymentRow[]> {
  if (debtIds.length === 0) return [];
  const [monthResult, ...latestResults] = await Promise.all([
    supabase
      .from("debt_payments")
      .select(PAYMENT_COLUMNS)
      .gte("payment_date", monthStart)
      .lt("payment_date", nextMonthStart)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    ...debtIds.map((debtId) =>
      supabase
        .from("debt_payments")
        .select(PAYMENT_COLUMNS)
        .eq("debt_id", debtId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
    ),
  ]);
  const monthRows: DebtPaymentRow[] = monthResult.data ?? [];
  // A latest payment dated inside the month is already among the month's
  // rows, ahead of that debt's others. One dated after the month (planned
  // ahead) leads the list; one from before it follows.
  const latest = latestResults
    .flatMap((result) => result.data ?? [])
    .sort((left, right) => right.payment_date.localeCompare(left.payment_date));
  const later = latest.filter((row) => row.payment_date >= nextMonthStart);
  const earlier = latest.filter((row) => row.payment_date < monthStart);
  return [...later, ...monthRows, ...earlier];
}
