import { describe, expect, it } from "vitest";
import { calculateAccountBalance } from "./balances";

describe("account balance calculation", () => {
  it("applies income and expenses without counting transfers twice", () => {
    expect(
      calculateAccountBalance({
        openingBalanceCentavos: 250_000,
        transactions: [
          { type: "income", amountCentavos: 100_000 },
          { type: "expense", amountCentavos: 25_050 },
        ],
        transfers: [
          { direction: "in", amountCentavos: 10_000 },
          { direction: "out", amountCentavos: 20_000 },
        ],
      }),
    ).toBe(314_950);
  });
});
