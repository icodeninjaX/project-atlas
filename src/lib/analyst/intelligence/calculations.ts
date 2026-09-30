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

/**
 * The scope of the owner's whole money flow: recorded income and recorded
 * expenses read together. They are separate whole-domain scopes, but they
 * share one comparable group so that they can be netted.
 */
export const NET_FLOW_SCOPE = "whole_domain:money_flow";
export const NET_FLOW_MEMBERS: ReadonlySet<string> = new Set([
  "whole_domain:income",
  "whole_domain:expense",
  // The same totals read as a monthly series.
  "whole_domain:income_centavos",
  "whole_domain:expense_centavos",
]);

/**
 * Recorded income less recorded expenses over one period: whether income
 * covered spending, and by how much. Both totals must be whole-domain, in
 * the money-flow group, in integer centavos and over the same period.
 */
export function netFlow(id: string, income: EvidenceV2, expense: EvidenceV2) {
  const a = numeric(income);
  const b = numeric(expense);
  assertComparable([a, b]);
  if (
    a.semantics.metricKey !== "income_centavos" ||
    b.semantics.metricKey !== "expense_centavos"
  )
    throw new CalculationError("Net flow needs recorded income and expenses.");
  if (a.scope.type !== "whole_domain" || b.scope.type !== "whole_domain")
    throw new CalculationError("Net flow needs whole-domain totals.");
  if (!samePeriod(a.time.period, b.time.period))
    throw new CalculationError("Net flow needs one period.");
  return fact(
    {
      id,
      operands: [a.id, b.id],
      metricKey: "income_centavos-expense_centavos",
      comparableGroup: a.semantics.comparableGroup,
      scopeId: NET_FLOW_SCOPE,
      periods: [a.time.period],
    },
    "difference",
    {
      status: "defined",
      value: checkedSum([a.value, -b.value], true),
      unit: "centavos",
    },
    { complete: complete([a, b]) },
  );
}

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

const DAY_MS = 86_400_000;
const days = (period: Period) =>
  (Date.parse(period.through) - Date.parse(period.from)) / DAY_MS + 1;

/** Whether a period is exactly one whole calendar month. */
export function fullMonth(period: Period) {
  if (!period.from.endsWith("-01")) return false;
  if (period.from.slice(0, 7) !== period.through.slice(0, 7)) return false;
  const [year, month] = period.from.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Number(period.through.slice(8, 10)) === last;
}

/**
 * Whether two periods can be compared as like for like: the same number of
 * days (this month so far against the same days last month), or two whole
 * calendar months. A partial month is never set against a full one.
 */
export function comparablePeriods(a: Period, b: Period) {
  return days(a) === days(b) || (fullMonth(a) && fullMonth(b));
}

/**
 * Trend facts over one whole-domain measure read month by month. Only whole
 * calendar months count, so the month in progress never skews them. For two
 * or more months: a ranking of the months (highest first, ties kept) and
 * their average. For three or more: the latest month less the average of
 * the months before it, and the run of consecutive rises or falls that ends
 * with the latest month. Every fact spans the months it reads.
 */
export function monthlyTrend(prefix: string, series: EvidenceV2[]) {
  const values = series.map(numeric);
  assertComparable(values);
  const [first] = values;
  if (!first) return [];
  if (
    values.some(
      (item) =>
        item.scope.id !== first.scope.id ||
        item.semantics.metricKey !== first.semantics.metricKey ||
        item.scope.type !== "whole_domain",
    )
  )
    throw new CalculationError("A trend reads one whole-domain measure.");
  const months = values
    .filter((item) => fullMonth(item.time.period))
    .sort((a, b) => a.time.period.from.localeCompare(b.time.period.from));
  if (
    new Set(months.map((item) => item.time.period.from)).size !== months.length
  )
    throw new CalculationError("A trend reads each month once.");
  if (months.length < 2) return [];
  const span: Period = {
    from: months[0]!.time.period.from,
    through: months.at(-1)!.time.period.through,
  };
  const integers = first.unit === "centavos" || first.unit === "count";
  const base = (id: string, operands: NumericEvidence[]): Base => ({
    id: `${prefix}.${id}`,
    operands: operands.map((item) => item.id),
    metricKey: first.semantics.metricKey,
    comparableGroup: first.semantics.comparableGroup,
    scopeId: first.scope.id,
    periods: [span],
  });
  const done = complete(months);
  const mean = (items: NumericEvidence[]) => {
    const total = checkedSum(
      items.map((item) => item.value),
      first.unit === "centavos",
    );
    const raw = total / items.length;
    return integers ? Math.round(raw) : Math.round(raw * 10) / 10;
  };
  const ordered = [...months].sort((a, b) => b.value - a.value);
  let rankNumber = 0;
  const ranking = ordered.map((item, index) => {
    if (index === 0 || item.value !== ordered[index - 1]!.value)
      rankNumber = index + 1;
    return {
      member: `month:${item.time.period.from.slice(0, 7)}`,
      evidenceId: item.id,
      value: item.value,
      rank: rankNumber,
    };
  });
  const top = ranking.filter((entry) => entry.rank === 1);
  const facts: DerivedFact[] = [
    fact(
      base("rank", months),
      "rank",
      { status: "defined", value: ordered[0]!.value, unit: first.unit },
      {
        ranking,
        top: top.map((entry) => entry.member),
        tie: top.length > 1,
        complete: done,
      },
    ),
    fact(
      base("mean", months),
      "mean",
      { status: "defined", value: mean(months), unit: first.unit },
      { complete: done },
    ),
  ];
  if (months.length >= 3) {
    const latest = months.at(-1)!;
    const earlier = months.slice(0, -1);
    const baseline = mean(earlier);
    facts.push(
      fact(
        base("latest_vs_mean", months),
        "difference",
        {
          status: "defined",
          value: checkedSum([latest.value, -baseline], integers),
          unit: first.unit,
        },
        { complete: done },
      ),
    );
    let run = 0;
    for (let index = months.length - 1; index > 0; index -= 1) {
      const step = Math.sign(months[index]!.value - months[index - 1]!.value);
      if (step === 0 || (run !== 0 && step !== Math.sign(run))) break;
      run += step;
    }
    if (Math.abs(run) >= 2)
      facts.push(
        fact(
          base("streak", months.slice(-(Math.abs(run) + 1))),
          "streak",
          { status: "defined", value: run, unit: "count" },
          { complete: done },
        ),
      );
  }
  return facts;
}

/** When the owner's records begin, from the data inventory. */
export type RecordsStart = { day: string; evidenceId: string };

/**
 * The part of a period the records can cover: from the later of its start
 * and the first record. Null when the records start after the period ends.
 */
export function coveredPeriod(
  period: Period,
  start: RecordsStart | null,
): Period | null {
  const from = start && start.day > period.from ? start.day : period.from;
  return from <= period.through ? { from, through: period.through } : null;
}

/** Days in a period, both ends included. */
export const periodDays = days;

/**
 * Recorded money per day over the days the records cover: a whole-domain
 * total divided by its covered days, rounded to the centavo. A period that
 * starts before the first record counts only the days since it, so two
 * periods with different coverage compare by pace, not by total.
 */
export function perDay(
  id: string,
  total: EvidenceV2,
  start: RecordsStart | null,
) {
  const item = numeric(total);
  if (item.unit !== "centavos" || item.scope.type !== "whole_domain")
    throw new CalculationError("A pace needs a whole-domain money total.");
  const covered = coveredPeriod(item.time.period, start);
  if (!covered) throw new CalculationError("No recorded days in the period.");
  const clipped = covered.from !== item.time.period.from;
  const raw = item.value / days(covered);
  return fact(
    {
      id,
      operands: clipped ? [item.id, start!.evidenceId] : [item.id],
      metricKey: `${item.semantics.metricKey}_per_day`,
      comparableGroup: `${item.semantics.comparableGroup}_per_day`,
      scopeId: item.scope.id,
      periods: [covered],
    },
    "per_day",
    {
      status: "defined",
      value: Math.sign(raw) * Math.round(Math.abs(raw)),
      unit: "centavos",
    },
    { rounding: "half_away_from_zero_units", complete: complete([item]) },
  );
}

/**
 * How one pace differs from an earlier one: the difference per day and its
 * percent change. The operands are the evidence behind both paces.
 */
export function paceChange(
  prefix: string,
  now: DerivedFact,
  before: DerivedFact,
) {
  if (
    now.operation !== "per_day" ||
    before.operation !== "per_day" ||
    now.metricKey !== before.metricKey ||
    now.scopeId !== before.scopeId ||
    now.output.status !== "defined" ||
    before.output.status !== "defined"
  )
    throw new CalculationError("A pace change needs two paces of one measure.");
  const base: Base = {
    id: `${prefix}.difference`,
    operands: [...new Set([...now.operands, ...before.operands])],
    metricKey: now.metricKey,
    comparableGroup: now.comparableGroup,
    scopeId: now.scopeId,
    periods: [now.periods[0]!, before.periods[0]!],
  };
  const change = now.output.value - before.output.value;
  const done = now.complete && before.complete;
  return [
    fact(
      base,
      "difference",
      { status: "defined", value: change, unit: "centavos" },
      { complete: done },
    ),
    fact(
      { ...base, id: `${prefix}.percent` },
      "percent_change",
      before.output.value === 0
        ? { status: "undefined", reason: "zero_denominator" }
        : {
            status: "defined",
            value: percentTenths(change, before.output.value),
            unit: "percent",
          },
      {
        rounding: "half_away_from_zero_tenths",
        denominatorRule: "nonzero_required",
        complete: done,
      },
    ),
  ];
}

/** Fewest recorded days a month-end projection is made from. */
export const PROJECTION_MIN_DAYS = 7;

/**
 * The month's total if the pace so far continues: the recorded total plus
 * the pace for each remaining day. Only for a month in progress that the
 * records cover from its first day, after at least a week, so the estimate
 * rests on the whole month so far. It is an estimate under that assumption,
 * never a record.
 */
export function monthProjection(
  id: string,
  total: EvidenceV2,
  pace: DerivedFact,
) {
  const item = numeric(total);
  const period = item.time.period;
  if (
    pace.operation !== "per_day" ||
    pace.output.status !== "defined" ||
    !pace.operands.includes(item.id)
  )
    throw new CalculationError("A projection needs the total's own pace.");
  if (
    !period.from.endsWith("-01") ||
    pace.periods[0]!.from !== period.from ||
    period.from.slice(0, 7) !== period.through.slice(0, 7)
  )
    throw new CalculationError(
      "A projection needs a month covered from day 1.",
    );
  const [year, month] = period.from.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const elapsed = days(period);
  if (elapsed >= last) throw new CalculationError("The month is complete.");
  if (elapsed < PROJECTION_MIN_DAYS)
    throw new CalculationError("Too few days to project from.");
  const monthEnd = `${period.from.slice(0, 8)}${String(last).padStart(2, "0")}`;
  return fact(
    {
      id,
      operands: pace.operands,
      metricKey: `${item.semantics.metricKey}_projection`,
      comparableGroup: item.semantics.comparableGroup,
      scopeId: item.scope.id,
      periods: [{ from: period.from, through: monthEnd }],
    },
    "projection",
    {
      status: "defined",
      value: checkedSum(
        [item.value, pace.output.value * (last - elapsed)],
        true,
      ),
      unit: "centavos",
    },
    { complete: pace.complete },
  );
}
