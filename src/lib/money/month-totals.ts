import type { createClient } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/** PostgREST returns at most this many rows per request (`max_rows`). */
export const MONTH_TOTALS_PAGE_SIZE = 1000;

export type IncomeExpenseTotals = {
  incomeCentavos: number;
  expenseCentavos: number;
  /** Every transaction in the range, whatever its type. */
  entryCount: number;
};

/**
 * Income and expense totals across every account for transactions dated
 * from `from` (inclusive) to `to` (exclusive). Rows are read a page at a
 * time, ordered by id, so a busy month is never cut off at the row cap.
 */
export async function fetchIncomeExpenseTotals(
  supabase: Supabase,
  from: string,
  to: string,
  pageSize = MONTH_TOTALS_PAGE_SIZE,
): Promise<IncomeExpenseTotals> {
  const totals: IncomeExpenseTotals = {
    incomeCentavos: 0,
    expenseCentavos: 0,
    entryCount: 0,
  };
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("transaction_type,amount_centavos")
      .gte("transaction_date", from)
      .lt("transaction_date", to)
      .order("id")
      .range(start, start + pageSize - 1);
    if (error || !data) break;
    for (const row of data) {
      const amount = Number(row.amount_centavos);
      if (row.transaction_type === "income") totals.incomeCentavos += amount;
      if (row.transaction_type === "expense") totals.expenseCentavos += amount;
    }
    totals.entryCount += data.length;
    if (data.length < pageSize) break;
  }
  return totals;
}
