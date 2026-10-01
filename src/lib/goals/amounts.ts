import { pesoInputToCentavos } from "@/lib/money/money";

/** The largest goal amount accepted, in centavos (₱1 trillion). */
const MAX_GOAL_CENTAVOS = 100_000_000_000_000;

/**
 * A goal's optional money amounts from the form. A field the form did not
 * send (an older client's queued update) leaves the amount unchanged; an
 * empty field clears it.
 */
export function goalAmounts(
  formData: FormData,
):
  | { ok: true; amounts: Record<string, number | null> }
  | { ok: false; message: string } {
  const amounts: Record<string, number | null> = {};
  const fields = [
    ["targetAmount", "target_amount_centavos", "target amount", 1],
    ["savedAmount", "saved_amount_centavos", "amount saved", 0],
  ] as const;
  for (const [field, column, label, minimum] of fields) {
    const raw = formData.get(field);
    if (raw === null) continue;
    const text = String(raw).trim();
    if (text === "") {
      amounts[column] = null;
      continue;
    }
    let centavos: number;
    try {
      centavos = pesoInputToCentavos(text);
    } catch {
      return { ok: false, message: `Enter the ${label} in pesos.` };
    }
    if (centavos < minimum || centavos > MAX_GOAL_CENTAVOS)
      return { ok: false, message: `Enter a valid ${label}.` };
    amounts[column] = centavos;
  }
  return { ok: true, amounts };
}
