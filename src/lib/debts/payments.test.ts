import { describe, expect, it } from "vitest";
import { loadDebtPagePayments, type DebtPaymentRow } from "./payments";

type Filter = { op: string; column: string; value: string };

/** Answers each query from `rows`, honoring the filters the loader uses. */
function fakeSupabase(rows: DebtPaymentRow[]) {
  const queries: Filter[][] = [];
  const from = () => {
    const filters: Filter[] = [];
    let limit: number | undefined;
    queries.push(filters);
    const run = () => {
      const data = rows
        .filter((row) =>
          filters.every(({ op, column, value }) => {
            const cell = String(row[column as keyof DebtPaymentRow]);
            if (op === "eq") return cell === value;
            if (op === "gte") return cell >= value;
            return cell < value;
          }),
        )
        .sort((left, right) =>
          right.payment_date.localeCompare(left.payment_date),
        )
        .slice(0, limit);
      return Promise.resolve({ data, error: null });
    };
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => (
        filters.push({ op: "eq", column, value }),
        builder
      ),
      gte: (column: string, value: string) => (
        filters.push({ op: "gte", column, value }),
        builder
      ),
      lt: (column: string, value: string) => (
        filters.push({ op: "lt", column, value }),
        builder
      ),
      order: () => builder,
      limit: (count: number) => ((limit = count), run()),
      then: (resolve: (value: unknown) => unknown) => run().then(resolve),
    };
    return builder;
  };
  return { supabase: { from }, queries };
}

type Client = Parameters<typeof loadDebtPagePayments>[0];

const payment = (
  debt_id: string,
  payment_date: string,
  amount_centavos = 100,
): DebtPaymentRow => ({ debt_id, payment_date, amount_centavos });

describe("loadDebtPagePayments", () => {
  it("keeps a quiet debt's last payment however busy the others are", async () => {
    const busy = Array.from({ length: 600 }, (_, index) =>
      payment("busy", `2026-${String(1 + (index % 9)).padStart(2, "0")}-15`),
    );
    const fake = fakeSupabase([...busy, payment("quiet", "2024-03-02", 5_000)]);

    const rows = await loadDebtPagePayments(
      fake.supabase as unknown as Client,
      ["busy", "quiet"],
      "2026-10-01",
      "2026-11-01",
    );

    expect(rows.find((row) => row.debt_id === "quiet")).toEqual(
      payment("quiet", "2024-03-02", 5_000),
    );
    // One month query plus one latest-payment query per debt.
    expect(fake.queries).toHaveLength(3);
  });

  it("lists every payment this month, newest first, then earlier latests", async () => {
    const fake = fakeSupabase([
      payment("a", "2026-10-03"),
      payment("a", "2026-10-20"),
      payment("b", "2026-10-11"),
      payment("c", "2026-09-30"),
      payment("c", "2026-08-01"),
    ]);

    const rows = await loadDebtPagePayments(
      fake.supabase as unknown as Client,
      ["a", "b", "c"],
      "2026-10-01",
      "2026-11-01",
    );

    expect(rows).toEqual([
      payment("a", "2026-10-20"),
      payment("b", "2026-10-11"),
      payment("a", "2026-10-03"),
      payment("c", "2026-09-30"),
    ]);
  });

  it("leads with a payment dated after this month, which is that debt's latest", async () => {
    const fake = fakeSupabase([
      payment("a", "2026-12-01"),
      payment("a", "2026-10-05"),
    ]);

    const rows = await loadDebtPagePayments(
      fake.supabase as unknown as Client,
      ["a"],
      "2026-10-01",
      "2026-11-01",
    );

    expect(rows).toEqual([
      payment("a", "2026-12-01"),
      payment("a", "2026-10-05"),
    ]);
  });

  it("skips the queries when there are no debts", async () => {
    const fake = fakeSupabase([]);
    await expect(
      loadDebtPagePayments(
        fake.supabase as unknown as Client,
        [],
        "2026-10-01",
        "2026-11-01",
      ),
    ).resolves.toEqual([]);
    expect(fake.queries).toHaveLength(0);
  });
});
