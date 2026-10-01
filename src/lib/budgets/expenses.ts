import type { createClient } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export type ExpenseRow = {
  category_id: string;
  amount_centavos: number;
  transaction_date: string;
};

/** PostgREST returns at most this many rows per request (`max_rows`). */
export const EXPENSE_PAGE_SIZE = 1000;

/**
 * Every expense dated from `from` (inclusive) to `to` (exclusive), read a
 * page at a time so a busy stretch is never cut off at the row cap. Ordered
 * by id so the pages do not overlap or skip.
 */
export async function fetchExpensesBetween(
  supabase: Supabase,
  from: string,
  to: string,
  pageSize = EXPENSE_PAGE_SIZE,
): Promise<ExpenseRow[]> {
  const rows: ExpenseRow[] = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("category_id,amount_centavos,transaction_date")
      .eq("transaction_type", "expense")
      .gte("transaction_date", from)
      .lt("transaction_date", to)
      .order("id")
      .range(start, start + pageSize - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
