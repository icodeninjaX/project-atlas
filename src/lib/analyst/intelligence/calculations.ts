import type {
  DerivedFact,
  EvidenceV2,
  NumericEvidence,
  Period,
} from "./contracts";

/**
 * Approved deterministic derivations over EvidenceV2. The model never writes
 * arithmetic: it may cite a derived fact ATLAS computed here. Every operation
 * checks that its operands mean the same thing (metric, comparable group,
 * unit, scope and period) before combining them, keeps integer centavos
 * exact, reports a zero denominator as undefined, and treats ties as results.
 */

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationError";
  }
}

const samePeriod = (a: Period, b: Period) =>
  a.from === b.from && a.through === b.through;

function numeric(item: EvidenceV2): NumericEvidence {
  if (item.kind !== "metric" && item.kind !== "scenario_output")
    throw new CalculationError(`Evidence ${item.id} is not numeric.`);
  return item;
}

function checkedSum(values: number[], integers: boolean) {
  return values.reduce((total, value) => {
    const next = total + value;
    if (
      integers &&
      (!Number.isSafeInteger(value) || !Number.isSafeInteger(next))
    )
      throw new CalculationError(
        "Centavo arithmetic left the safe integer range.",
      );
    return next;
  }, 0);
}

function assertComparable(items: NumericEvidence[]) {
  const [first] = items;
  if (!first) throw new CalculationError("No operands.");
  for (const item of items) {
    if (item.unit !== first.unit)
      throw new CalculationError("Operands use different units.");
    if (item.semantics.comparableGroup !== first.semantics.comparableGroup)
      throw new CalculationError("Operands measure different populations.");
  }
}

/** Tenths of a percent, rounded half away from zero. */
function percentTenths(numerator: number, denominator: number) {
  const raw = (numerator / denominator) * 1000;
  return (Math.sign(raw) * Math.round(Math.abs(raw))) / 10;
}

type Base = Pick<
  DerivedFact,
  "id" | "operands" | "metricKey" | "comparableGroup" | "scopeId" | "periods"
>;

function fact(
  base: Base,
  operation: DerivedFact["operation"],
  output: DerivedFact["output"],
  extra: Partial<DerivedFact> = {},
): DerivedFact {
  return {
    version: "1",
    operationVersion: "1",
    operation,
    rounding: "none",
    denominatorRule: "not_applicable",
    ranking: null,
    top: null,
    tie: null,
    reconciled: null,
    complete: true,
    ...base,
    ...extra,
    output,
  };
}

/**
 * The same measure over two periods (same scope), or two measures of one
 * comparable group over the same period and scope (income less expenses).
 */
function pairBase(id: string, a: NumericEvidence, b: NumericEvidence): Base {
  assertComparable([a, b]);
  const sameMetric = a.semantics.metricKey === b.semantics.metricKey;
  if (a.scope.id !== b.scope.id)
    throw new CalculationError("Operands have different scopes.");
  if (!sameMetric && !samePeriod(a.time.period, b.time.period))
    throw new CalculationError("Different measures need the same period.");
  if (
    sameMetric &&
    a.scope.cohort?.member !== b.scope.cohort?.member &&
    !samePeriod(a.time.period, b.time.period)
  )
    throw new CalculationError("Different set members need the same period.");
  return {
    id,
    operands: [a.id, b.id],
    metricKey: sameMetric
      ? a.semantics.metricKey
      : `${a.semantics.metricKey}-${b.semantics.metricKey}`,
    comparableGroup: a.semantics.comparableGroup,
    scopeId: a.scope.id,
    periods: samePeriod(a.time.period, b.time.period)
      ? [a.time.period]
      : [a.time.period, b.time.period],
  };
}

const complete = (items: NumericEvidence[]) =>
  items.every((item) => item.coverage.query === "complete");

export function difference(
  id: string,
  subject: EvidenceV2,
  reference: EvidenceV2,
) {
  const a = numeric(subject);
  const b = numeric(reference);
  const base = pairBase(id, a, b);
  const value = checkedSum([a.value, -b.value], a.unit === "centavos");
  return fact(
    base,
    "difference",
    { status: "defined", value, unit: a.unit },
    { complete: complete([a, b]) },
  );
}

export function percentChange(
  id: string,
  current: EvidenceV2,
  previous: EvidenceV2,
) {
  const a = numeric(current);
  const b = numeric(previous);
  if (a.semantics.metricKey !== b.semantics.metricKey)
    throw new CalculationError(
      "Percent change needs one measure over two periods.",
    );
  const base = pairBase(id, a, b);
  const extra = {
    rounding: "half_away_from_zero_tenths" as const,
    denominatorRule: "nonzero_required" as const,
    complete: complete([a, b]),
  };
  if (b.value === 0)
    return fact(
      base,
      "percent_change",
      { status: "undefined", reason: "zero_denominator" },
      extra,
    );
  return fact(
    base,
    "percent_change",
    {
      status: "defined",
      value: percentTenths(a.value - b.value, Math.abs(b.value)),
      unit: "percent",
    },
    extra,
  );
}

export function ratio(
  id: string,
  numerator: EvidenceV2,
  denominator: EvidenceV2,
) {
  const a = numeric(numerator);
  const b = numeric(denominator);
  const base = pairBase(id, a, b);
  const extra = {
    rounding: "half_away_from_zero_tenths" as const,
    denominatorRule: "nonzero_required" as const,
    complete: complete([a, b]),
  };
  if (b.value === 0)
    return fact(
      base,
      "ratio",
      { status: "undefined", reason: "zero_denominator" },
      extra,
    );
  return fact(
    base,
    "ratio",
    {
      status: "defined",
      value: percentTenths(a.value, b.value),
      unit: "percent",
    },
    extra,
  );
}

/**
 * One set member's share of its whole-domain total, in percent: the same
 * measure and period, a member of a complete set, and a total over the same
 * records. It speaks for the member's set scope.
 */
export function share(id: string, member: EvidenceV2, total: EvidenceV2) {
  const part = numeric(member);
  const whole = numeric(total);
  assertComparable([part, whole]);
  const cohort = part.scope.cohort;
  if (!cohort?.setComplete || whole.scope.type !== "whole_domain")
    throw new CalculationError("A share needs a complete set and its total.");
  if (
    part.semantics.metricKey !== whole.semantics.metricKey ||
    !samePeriod(part.time.period, whole.time.period)
  )
    throw new CalculationError("A share needs the total's measure and period.");
  const base: Base = {
    id,
    operands: [part.id, whole.id],
    metricKey: part.semantics.metricKey,
    comparableGroup: part.semantics.comparableGroup,
    scopeId: part.scope.id,
    periods: [part.time.period],
  };
  const extra = {
    rounding: "half_away_from_zero_tenths" as const,
    denominatorRule: "nonzero_required" as const,
    complete: complete([part, whole]),
  };
  if (whole.value === 0)
    return fact(
      base,
      "ratio",
      { status: "undefined", reason: "zero_denominator" },
      extra,
    );
  return fact(
    base,
    "ratio",
    {
      status: "defined",
      value: percentTenths(part.value, whole.value),
      unit: "percent",
    },
    extra,
  );
}

/** Every member of one defined set, for one measure and period. */
function setMembers(items: EvidenceV2[]) {
  const values = items.map(numeric);
  assertComparable(values);
  const [first] = values;
  const cohort = first!.scope.cohort;
  if (!cohort) throw new CalculationError("Set operations need set members.");
  const members = new Set<string>();
  for (const item of values) {
    const own = item.scope.cohort;
    if (!own || own.setId !== cohort.setId || item.scope.id !== first!.scope.id)
      throw new CalculationError("Operands belong to different sets.");
    if (item.semantics.metricKey !== first!.semantics.metricKey)
      throw new CalculationError("Operands measure different things.");
    if (!samePeriod(item.time.period, first!.time.period))
      throw new CalculationError("Set members need one period.");
    if (members.has(own.member))
      throw new CalculationError("Duplicate set member.");
    members.add(own.member);
  }
  // A total or ranking needs every member of a set known to be complete, and
  // every member's own query complete.
  const whole =
    values.every((item) => item.scope.cohort!.setComplete) &&
    members.size === cohort.setSize &&
    complete(values);
  return { values, whole, cohort, first: first! };
}

export function sum(id: string, items: EvidenceV2[]) {
  const { values, whole, first } = setMembers(items);
  const base: Base = {
    id,
    operands: values.map((item) => item.id),
    metricKey: first.semantics.metricKey,
    comparableGroup: first.semantics.comparableGroup,
    scopeId: first.scope.id,
    periods: [first.time.period],
  };
  if (!whole)
    return fact(
      base,
      "sum",
      { status: "undefined", reason: "incomplete_set" },
      { complete: false },
    );
  const value = checkedSum(
    values.map((item) => item.value),
    first.unit === "centavos",
  );
  return fact(base, "sum", { status: "defined", value, unit: first.unit });
}

/**
 * A complete ranking, highest first. Equal values share a rank and every
 * member with rank one is in `top`. An incomplete set has no ranking.
 */
export function rank(id: string, items: EvidenceV2[]) {
  const { values, whole, first } = setMembers(items);
  const base: Base = {
    id,
    operands: values.map((item) => item.id),
    metricKey: first.semantics.metricKey,
    comparableGroup: first.semantics.comparableGroup,
    scopeId: first.scope.id,
    periods: [first.time.period],
  };
  if (!whole)
    return fact(
      base,
      "rank",
      { status: "undefined", reason: "incomplete_set" },
      { complete: false },
    );
  const sorted = [...values].sort(
    (a, b) =>
      b.value - a.value ||
      a.scope.cohort!.member.localeCompare(b.scope.cohort!.member),
  );
  let position = 0;
  let previous: number | null = null;
  const ranking = sorted.map((item, index) => {
    if (item.value !== previous) position = index + 1;
    previous = item.value;
    return {
      member: item.scope.cohort!.member,
      evidenceId: item.id,
      value: item.value,
      rank: position,
    };
  });
  const top = ranking
    .filter((item) => item.rank === 1)
    .map((item) => item.member);
  return fact(
    base,
    "rank",
    { status: "defined", value: sorted[0]!.value, unit: first.unit },
    { ranking, top, tie: top.length > 1 },
  );
}

/**
 * Category contributions to a change in a total: each member's change between
 * two periods, reconciled exactly with the change in the total. This is
 * accounting decomposition, not a behavioral cause.
 */
export function contribution(
  id: string,
  input: {
    totalCurrent: EvidenceV2;
    totalPrevious: EvidenceV2;
    current: EvidenceV2[];
    previous: EvidenceV2[];
  },
) {
  const now = setMembers(input.current);
  const before = setMembers(input.previous);
  const totalNow = numeric(input.totalCurrent);
  const totalBefore = numeric(input.totalPrevious);
  assertComparable([totalNow, totalBefore, ...now.values, ...before.values]);
  if (
    totalNow.semantics.metricKey !== now.first.semantics.metricKey ||
    totalBefore.semantics.metricKey !== now.first.semantics.metricKey ||
    before.first.semantics.metricKey !== now.first.semantics.metricKey
  )
    throw new CalculationError("Contributions need the total's measure.");
  if (
    !samePeriod(totalNow.time.period, now.first.time.period) ||
    !samePeriod(totalBefore.time.period, before.first.time.period) ||
    now.cohort.setId !== before.cohort.setId
  )
    throw new CalculationError(
      "Totals and members need matching periods and sets.",
    );
  const integers = totalNow.unit === "centavos";
  const valueOf = (items: NumericEvidence[], member: string) =>
    items.find((item) => item.scope.cohort!.member === member)?.value ?? 0;
  const members = [
    ...new Set(
      [...now.values, ...before.values].map(
        (item) => item.scope.cohort!.member,
      ),
    ),
  ].sort();
  const changes = members.map((member) => ({
    member,
    evidenceId:
      now.values.find((item) => item.scope.cohort!.member === member)?.id ??
      before.values.find((item) => item.scope.cohort!.member === member)!.id,
    value: checkedSum(
      [valueOf(now.values, member), -valueOf(before.values, member)],
      integers,
    ),
  }));
  const totalChange = checkedSum(
    [totalNow.value, -totalBefore.value],
    integers,
  );
  const whole = now.whole && before.whole && complete([totalNow, totalBefore]);
  const reconciled =
    checkedSum(
      changes.map((item) => item.value),
      integers,
    ) === totalChange;
  const base: Base = {
    id,
    operands: [
      totalNow.id,
      totalBefore.id,
      ...now.values.map((i) => i.id),
      ...before.values.map((i) => i.id),
    ],
    metricKey: `${now.first.semantics.metricKey}_contribution`,
    comparableGroup: now.first.semantics.comparableGroup,
    scopeId: now.first.scope.id,
    periods: [totalNow.time.period, totalBefore.time.period],
  };
  if (!whole || !reconciled)
    return fact(
      base,
      "contribution",
      { status: "undefined", reason: "incomplete_set" },
      { complete: false, reconciled },
    );
  const sorted = [...changes].sort(
    (a, b) => b.value - a.value || a.member.localeCompare(b.member),
  );
  let position = 0;
  let previous: number | null = null;
  const ranking = sorted.map((item, index) => {
    if (item.value !== previous) position = index + 1;
    previous = item.value;
    return { ...item, rank: position };
  });
  const top = ranking
    .filter((item) => item.rank === 1 && item.value > 0)
    .map((item) => item.member);
  return fact(
    base,
    "contribution",
    { status: "defined", value: totalChange, unit: totalNow.unit },
    { ranking, top, tie: top.length > 1, reconciled },
  );
}
