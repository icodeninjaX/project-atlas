import { describe, expect, it } from "vitest";
import {
  accountTypeDetails,
  allocateBalances,
  formatShare,
} from "./account-types";

describe("allocateBalances", () => {
  it("groups balances into fixed buckets measured against positive money", () => {
    const allocation = allocateBalances([
      { account_type: "cash", current_balance_centavos: 20_000 },
      { account_type: "e_wallet", current_balance_centavos: 30_000 },
      { account_type: "investment", current_balance_centavos: 25_000 },
      { account_type: "savings", current_balance_centavos: 25_000 },
      { account_type: "bank", current_balance_centavos: -5_000 },
      { account_type: "other", current_balance_centavos: 0 },
    ]);

    expect(allocation.positiveCentavos).toBe(100_000);
    expect(allocation.negativeCentavos).toBe(-5_000);
    expect(allocation.slices.map((slice) => slice.id)).toEqual([
      "everyday",
      "savings",
      "invested",
    ]);
    expect(allocation.slices[0]).toMatchObject({
      centavos: 50_000,
      share: 0.5,
      accountCount: 2,
    });
  });

  it("returns no slices when nothing is positive", () => {
    expect(
      allocateBalances([{ account_type: "bank", current_balance_centavos: -1 }])
        .slices,
    ).toEqual([]);
  });
});

describe("account type helpers", () => {
  it("falls back to Other for unknown types", () => {
    expect(accountTypeDetails("crypto").label).toBe("Other");
    expect(accountTypeDetails("e_wallet").label).toBe("E-wallet");
  });

  it("formats shares without hiding slivers", () => {
    expect(formatShare(0.264)).toBe("26%");
    expect(formatShare(0.001)).toBe("<1%");
    expect(formatShare(0)).toBe("0%");
  });
});
