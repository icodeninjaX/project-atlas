import { describe, expect, it, vi } from "vitest";
import { fetchExpensesBetween, type ExpenseRow } from "./expenses";

function fakeSupabase(total: number, failAt?: number) {
  const ranges: Array<[number, number]> = [];
  const filters: unknown[][] = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((...args: unknown[]) => (filters.push(["eq", ...args]), builder)),
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
      const data: ExpenseRow[] = [];
      for (let index = start; index <= Math.min(end, total - 1); index += 1) {
        data.push({
          category_id: "food",
          amount_centavos: 100,
          transaction_date: "2026-10-01",
        });
      }
      return { data, error: null };
    }),
  };
  const supabase = { from: vi.fn(() => builder) };
  return { supabase, ranges, filters, builder };
}

type Client = Parameters<typeof fetchExpensesBetween>[0];

describe("fetchExpensesBetween", () => {
  it("reads past the row cap a page at a time", async () => {
    const fake = fakeSupabase(2_350);
    const rows = await fetchExpensesBetween(
      fake.supabase as unknown as Client,
      "2026-09-01",
      "2026-11-01",
    );

    expect(rows).toHaveLength(2_350);
    expect(fake.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(fake.builder.order).toHaveBeenCalledWith("id");
    expect(fake.filters).toContainEqual(["eq", "transaction_type", "expense"]);
    expect(fake.filters).toContainEqual([
      "gte",
      "transaction_date",
      "2026-09-01",
    ]);
    expect(fake.filters).toContainEqual([
      "lt",
      "transaction_date",
      "2026-11-01",
    ]);
  });

  it("asks once more when a page comes back exactly full", async () => {
    const fake = fakeSupabase(1_000);
    const rows = await fetchExpensesBetween(
      fake.supabase as unknown as Client,
      "2026-09-01",
      "2026-11-01",
    );

    expect(rows).toHaveLength(1_000);
    expect(fake.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("keeps what it read when a later page fails", async () => {
    const fake = fakeSupabase(2_500, 1_000);
    const rows = await fetchExpensesBetween(
      fake.supabase as unknown as Client,
      "2026-09-01",
      "2026-11-01",
    );

    expect(rows).toHaveLength(1_000);
  });
});
