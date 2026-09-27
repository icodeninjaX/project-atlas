import type { ToolEvidence } from "@/lib/analyst/tools/contracts";

/**
 * Verifies the figures and comparisons in model prose against cited ATLAS
 * evidence. The model may restate or derive figures (a difference or a percent
 * change between two cited values), but every number it writes must be
 * reproducible from the evidence it cites, and every stated direction must
 * agree with the cited values.
 */

export type ClaimComparison = {
  subjectId: string;
  referenceId: string;
  direction: "higher" | "lower" | "same";
};

const pesoFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The display string the model is asked to copy when citing a value. */
export function displayValue(item: Pick<ToolEvidence, "value" | "unit">) {
  if (typeof item.value !== "number" || !Number.isFinite(item.value))
    return String(item.value);
  if (item.unit === "centavos") {
    const sign = item.value < 0 ? "-" : "";
    return `${sign}₱${pesoFormat.format(Math.abs(item.value) / 100)}`;
  }
  if (item.unit === "percent") return `${item.value}%`;
  return String(item.value);
}

type Kind = "money" | "percent" | "plain";
type Figure = { value: number; decimals: number };
/** Signed values copied from evidence, and unsigned derived magnitudes. */
type Allowed = { values: number[]; magnitudes: number[] };

const isoDate = /\b\d{4}-\d{2}(?:-\d{2})?\b/g;
// A minus counts as a sign only at the start of a word, never inside a range.
const figure =
  /(?:(?<=^|[\s(])([-−]))?(₱\s?|\bPHP\s?)?([-−])?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s?%|\s?percent\b|\s?pesos\b)?([kKmMbB]\b)?/g;

function numeric(item: ToolEvidence) {
  return typeof item.value === "number" && Number.isFinite(item.value)
    ? item.value
    : null;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function matches({ values, magnitudes }: Allowed, { value, decimals }: Figure) {
  const same = (candidate: number) =>
    Math.abs(round(candidate, decimals) - value) < 1e-9;
  // A signed figure must copy a value with that sign; an unsigned figure may
  // copy a non-negative value or state a difference or percent change.
  return (
    values.some(same) ||
    (value >= 0 && magnitudes.some((magnitude) => same(Math.abs(magnitude))))
  );
}

function candidates(cited: ToolEvidence[]) {
  const allowed = (): Allowed => ({ values: [], magnitudes: [] });
  const money = allowed();
  const percent = allowed();
  const plain = allowed();
  const byUnit = new Map<string, number[]>();
  for (const item of cited) {
    const value = numeric(item);
    for (const token of item.metric.match(/\d+(?:\.\d+)?/g) ?? [])
      plain.values.push(Number(token));
    for (const date of [item.period.from, item.period.through])
      plain.values.push(Number(date.slice(0, 4)));
    if (value === null) continue;
    const scaled = item.unit === "centavos" ? value / 100 : value;
    (item.unit === "centavos"
      ? money
      : item.unit === "percent"
        ? percent
        : plain
    ).values.push(scaled);
    byUnit.set(item.unit, [...(byUnit.get(item.unit) ?? []), scaled]);
  }
  for (const [unit, values] of byUnit) {
    for (let i = 0; i < values.length; i += 1) {
      for (let j = 0; j < values.length; j += 1) {
        if (i === j) continue;
        const a = values[i]!;
        const b = values[j]!;
        if (j > i)
          (unit === "centavos"
            ? money
            : unit === "percent"
              ? percent
              : plain
          ).magnitudes.push(a - b);
        if (unit !== "percent" && unit !== "correlation" && b !== 0)
          percent.magnitudes.push(((a - b) / b) * 100);
      }
    }
  }
  return { money, percent, plain };
}

/** Returns false when prose contains a figure the cited evidence cannot reproduce. */
export function figuresAreGrounded(text: string, cited: ToolEvidence[]) {
  const dates = new Set(
    cited.flatMap((item) => [
      item.period.from,
      item.period.through,
      item.period.from.slice(0, 7),
      item.period.through.slice(0, 7),
    ]),
  );
  for (const date of text.match(isoDate) ?? [])
    if (!dates.has(date)) return false;
  const withoutDates = text.replace(isoDate, " ");
  const allowed = candidates(cited);
  for (const match of withoutDates.matchAll(figure)) {
    const [, leadingMinus, moneyPrefix, innerMinus, digits, suffix, magnitude] =
      match;
    if (magnitude) return false;
    const unitSuffix = suffix?.trim().toLowerCase();
    const kind: Kind =
      moneyPrefix || unitSuffix === "pesos"
        ? "money"
        : unitSuffix === "%" || unitSuffix === "percent"
          ? "percent"
          : "plain";
    // "₱-500" is signed; a bare "4-6" is a range, not 4 and -6.
    const sign = leadingMinus || (moneyPrefix && innerMinus) ? -1 : 1;
    const value = sign * Number(digits!.replaceAll(",", ""));
    const decimals = digits!.split(".")[1]?.length ?? 0;
    if (!matches(allowed[kind], { value, decimals })) return false;
  }
  return true;
}

const upward =
  /\b(?:higher|more than|greater|above|increas\w*|rose|risen|grew|grown|exceed\w*)\b/i;
const downward =
  /\b(?:lower|less than|fewer|below|decreas\w*|fell|fallen|dropped|declin\w*|shrank)\b/i;
const level = /\b(?:unchanged|the same as|flat|equal\w*)\b/i;

/** Directional prose requires a declared comparison that the values confirm. */
export function comparisonIsGrounded(
  text: string,
  comparison: ClaimComparison | null,
  citedIds: string[],
  byId: Map<string, ToolEvidence>,
) {
  const up = upward.test(text);
  const down = downward.test(text);
  const same = level.test(text);
  if (!comparison) return !up && !down && !same;
  if ([up, down, same].filter(Boolean).length > 1) return false;
  const { subjectId, referenceId, direction } = comparison;
  if (subjectId === referenceId) return false;
  if (!citedIds.includes(subjectId) || !citedIds.includes(referenceId))
    return false;
  const subject = byId.get(subjectId);
  const reference = byId.get(referenceId);
  if (!subject || !reference || subject.unit !== reference.unit) return false;
  const a = numeric(subject);
  const b = numeric(reference);
  if (a === null || b === null) return false;
  const actual = a > b ? "higher" : a < b ? "lower" : "same";
  if (actual !== direction) return false;
  if (up && direction !== "higher") return false;
  if (down && direction !== "lower") return false;
  if (same && direction !== "same") return false;
  return true;
}
