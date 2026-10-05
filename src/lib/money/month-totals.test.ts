import { describe, expect, it, vi } from "vitest";
import { fetchIncomeExpenseTotals } from "./month-totals";

type Row = { transaction_type: string; amount_centavos: number | string };

function fakeSupabase(rows: Row[], failAt?: number) {
  const ranges: Array<[number, number]> = [];
  const filters: unknown[][] = [];
  const builder = {
    select: vi.fn(() => builder),
    gte: vi.fn(
      (...args: unknown[]) => (filters.push(["gte", ...args]), builder),
    ),
    lt: vi.fn((...args: unknown[]) => (filters.push(["lt", ...args]), builder)),
    order: vi.fn(() => builder),
    range: vi.fn(async (start: number, end: number) => {
      ranges.push([start, end]);
      if (failAt !== undefined && start >= failAt) {
        return { data: null, error: { message: "boom" } };
      }
      return { data: rows.slice(start, end + 1), error: null };
    }),
  };
  const supabase = { from: vi.fn(() => builder) };
  return { supabase, ranges, filters, builder };
}

type Client = Parameters<typeof fetchIncomeExpenseTotals>[0];

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    transaction_type: index % 4 === 0 ? "income" : "expense",
    amount_centavos: index % 2 === 0 ? 100 : "250",
  }));

describe("fetchIncomeExpenseTotals", () => {
  it("totals a month past the row cap a page at a time", async () => {
    const fake = fakeSupabase(rows(2_350));
    const totals = await fetchIncomeExpenseTotals(
      fake.supabase as unknown as Client,
      "2026-10-01",
      "2026-11-01",
    );

    // 588 income rows (every 4th, all even → 100 each); the other 1,762
    // are expenses: 587 even rows at 100 and 1,175 odd rows at 250.
    expect(totals).toEqual({
      incomeCentavos: 58_800,
      expenseCentavos: 58_700 + 293_750,
      entryCount: 2_350,
    });
    expect(fake.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(fake.builder.order).toHaveBeenCalledWith("id");
    expect(fake.filters).toEqual([
      ["gte", "transaction_date", "2026-10-01"],
      ["lt", "transaction_date", "2026-11-01"],
      ["gte", "transaction_date", "2026-10-01"],
      ["lt", "transaction_date", "2026-11-01"],
      ["gte", "transaction_date", "2026-10-01"],
      ["lt", "transaction_date", "2026-11-01"],
    ]);
  });

  it("stops after an exactly full final page", async () => {
    const fake = fakeSupabase(rows(4), undefined);
    await fetchIncomeExpenseTotals(
      fake.supabase as unknown as Client,
      "2026-10-01",
      "2026-11-01",
      2,
    );
    expect(fake.ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("keeps what it read when a later page fails", async () => {
    const fake = fakeSupabase(rows(3), 2);
    const totals = await fetchIncomeExpenseTotals(
      fake.supabase as unknown as Client,
      "2026-10-01",
      "2026-11-01",
      2,
    );
    expect(totals).toEqual({
      incomeCentavos: 100,
      expenseCentavos: 250,
      entryCount: 2,
    });
  });
});
