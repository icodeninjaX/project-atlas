import { describe, expect, it } from "vitest";
import { goalAmounts } from "./amounts";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("goal money amounts", () => {
  it("reads pesos into centavos", () => {
    expect(
      goalAmounts(form({ targetAmount: "60,000", savedAmount: "12500.50" })),
    ).toEqual({
      ok: true,
      amounts: {
        target_amount_centavos: 6_000_000,
        saved_amount_centavos: 1_250_050,
      },
    });
  });

  it("clears an emptied field, and leaves an unsent one unchanged", () => {
    // An older client's queued update sends neither field.
    expect(goalAmounts(form({}))).toEqual({ ok: true, amounts: {} });
    expect(goalAmounts(form({ targetAmount: "", savedAmount: "0" }))).toEqual({
      ok: true,
      amounts: { target_amount_centavos: null, saved_amount_centavos: 0 },
    });
  });

  it("refuses amounts that are not pesos or out of range", () => {
    expect(goalAmounts(form({ targetAmount: "abc" }))).toMatchObject({
      ok: false,
    });
    expect(goalAmounts(form({ targetAmount: "0" }))).toMatchObject({
      ok: false,
    });
    expect(goalAmounts(form({ savedAmount: "-5" }))).toMatchObject({
      ok: false,
    });
    expect(goalAmounts(form({ targetAmount: "2000000000000" }))).toMatchObject({
      ok: false,
    });
  });
});
