import type {
  AnalysisBrief,
  AnalyticalClaim,
  ClaimVerification,
  DerivedFact,
  DraftClaim,
  EvidenceV2,
  Period,
} from "./contracts";
import { fixedLabelDomain } from "./legacy-evidence";
import {
  DOMAIN_TERMS,
  semanticsFor,
  textDomains,
  type MetricDomain,
} from "./semantics";

/**
 * Deterministic claim checks for Analyst V2 (AI-01). A claim ships only when
 * every figure, date, month, measure, comparison and superlative in its text
 * is bound to the specific evidence or ATLAS-derived fact it cites, in the
 * claim's own scope. Unlike the legacy verifier, a number is never accepted
 * because some pair of cited values happens to produce it: differences and
 * percentages must come from `calculations.ts`.
 *
 * Causal, certainty, significance and number-word bans are kept. Superlatives
 * are allowed only with a complete ranking, and a tie must be disclosed.
 * English and Filipino direction words are both checked; the structured
 * comparison, not the wording, is the authority.
 */

export type ClaimCheckContext = {
  brief: AnalysisBrief;
  evidence: Map<string, EvidenceV2>;
  derived: Map<string, DerivedFact>;
  /** Resolves "this month" and "last month" in Asia/Manila. */
  now: Date;
};

export type ClaimRejectionV2 =
  | "duplicate_reference"
  | "unknown_evidence"
  | "unknown_derived_fact"
  | "unknown_requirement"
  | "unknown_assumption"
  | "missing_support"
  | "scope_mismatch"
  | "causal_wording"
  | "certainty_wording"
  | "unverifiable_wording"
  | "unsupported_superlative"
  | "tie_not_disclosed"
  | "figure"
  | "date"
  | "month"
  | "metric_mismatch"
  | "comparison"
  | "incompatible_comparison"
  | "incomplete_evidence"
  | "undefined_result"
  | "unhedged_interpretation"
  | "association_without_test"
  | "recommendation_without_objective"
  | "recommendation_incomplete"
  | "unstated_assumption"
  | "generic_recommendation";

const causal =
  /\b(?:because|caus\w*|due to|driven by|results? in|resulted|triggered|leads? to|led to|responsible for|explains?|explained|thanks to|as a result|dahil sa|dahil|sanhi|sanhi ng|kaya naman)\b/i;
const certainty =
  /\b(?:will|won't|definitely|certainly|always|never|proves?|guarantee\w*|must|tiyak|sigurado\w*|palagi|kailanman)\b/i;
const unverifiable =
  /\b(?:significant\w*|statistically|strong(?:ly)?|hundred|thousand|million|billion|dozen|double[ds]?|twice|triple[ds]?|half|halved|centavos|libo|milyon|doble|kalahati)\b/i;
const superlative =
  /\b(?:largest|highest|biggest|greatest|most|smallest|lowest|least|pinaka\w*)\b/i;
const conditional = /\b(?:if|assuming|provided that|kung|basta)\b/i;
// Advice that fits anyone says nothing about this user's records.
const generic =
  /\b(?:stay (?:focused|motivated|consistent|positive)|work harder|keep (?:it )?up|do your best|try your best|be more disciplined|manage your time better|believe in yourself|keep going|stay on track)\b/i;
const tieMarker = /\b(?:tie|tied|tying|ties|magkatabla|pantay)\b/i;
const hedge =
  /\b(?:may|might|could|suggests?|possibly|maaaring|baka|posibleng|marahil)\b/i;
const undefinedMarker =
  /\b(?:undefined|not defined|cannot be calculated|can't be calculated|no percent(?:age)?|hindi makalkula|walang porsyento)\b/i;

const upward =
  /\b(?:higher|more than|greater|above|increas\w*|rose|risen|grew|grown|exceed\w*|up by|mas malaki|mas mataas|mas marami|tumaas|lumaki|dumami)\b/i;
const downward =
  /\b(?:lower|less than|fewer|below|decreas\w*|fell|fallen|dropped|declin\w*|shrank|down by|mas maliit|mas mababa|mas kaunti|bumaba|lumiit|kumaunti)\b/i;
const level =
  /\b(?:unchanged|the same as|flat|equal\w*|hindi nagbago|walang pagbabago)\b/i;

const monthNames: Array<[RegExp, number]> = [
  [/\b(?:jan(?:uary)?|enero)\b/gi, 1],
  [/\b(?:feb(?:ruary)?|pebrero)\b/gi, 2],
  [/\b(?:mar(?:ch)?|marso)\b/gi, 3],
  [/\b(?:apr(?:il)?|abril)\b/gi, 4],
  // "may" is also a hedge; it is a month only beside a day, a year or "in".
  [/\bmayo\b|\bMay(?=\s+\d)|(?<=\b(?:in|of|during|noong)\s)May\b/g, 5],
  [/\b(?:june?|hunyo)\b/gi, 6],
  [/\b(?:july?|hulyo)\b/gi, 7],
  [/\b(?:aug(?:ust)?|agosto)\b/gi, 8],
  [/\b(?:sep(?:t(?:ember)?)?|setyembre)\b/gi, 9],
  [/\b(?:oct(?:ober)?|oktubre)\b/gi, 10],
  [/\b(?:nov(?:ember)?|nobyembre)\b/gi, 11],
  [/\b(?:dec(?:ember)?|disyembre)\b/gi, 12],
];
const thisMonth = /\b(?:this month|ngayong buwan|sa buwang ito)\b/i;
const lastMonth =
  /\b(?:last month|previous month|nakaraang buwan|noong isang buwan)\b/i;

const isoDate = /\b\d{4}-\d{2}(?:-\d{2})?\b/g;
const monthDay =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|enero|pebrero|marso|abril|mayo|hunyo|hulyo|agosto|setyembre|oktubre|nobyembre|disyembre)\.?\s+(\d{1,2})(?:\s*(?:-|–|to|hanggang)\s*(\d{1,2})\b)?\b/gi;
const figurePattern =
  /([-−]\s?)?(₱\s?|\bPHP\s?)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s?%|\s?percent\b|\s?porsyento\b|\s?pesos?\b|\s?piso\b)?([kKmMbB]\b)?/g;

const monthPrefixes: Record<string, number> = {
  jan: 1,
  ene: 1,
  feb: 2,
  peb: 2,
  mar: 3,
  apr: 4,
  abr: 4,
  may: 5,
  jun: 6,
  hun: 6,
  jul: 7,
  hul: 7,
  aug: 8,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  nob: 11,
  dec: 12,
  dis: 12,
};

function monthOf(name: string) {
  return monthPrefixes[name.slice(0, 3).toLowerCase()] ?? 0;
}

function manilaMonth(now: Date, offset: number) {
  const [year, month] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  const index = year! * 12 + (month! - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

function overlapsMonth(periods: Period[], month: number, year?: number) {
  return periods.some((period) => {
    let [y, m] = period.from.slice(0, 7).split("-").map(Number) as [
      number,
      number,
    ];
    const last = period.through.slice(0, 7);
    for (let guard = 0; guard < 400; guard += 1) {
      if (m === month && (year === undefined || y === year)) return true;
      if (monthKey(y, m) >= last) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return false;
  });
}

type Numeric = { value: number; unit: string };

function metricDomains(metricKey: string, unit: string): MetricDomain[] {
  // A bridged tool's fixed-label measure speaks for that tool's domain.
  const fixed = fixedLabelDomain(metricKey);
  if (fixed) return [fixed];
  const keys = metricKey.replace(/_contribution$/, "").split("-");
  return keys.flatMap((key) => textDomains(semanticsFor(key, unit as never)));
}

type Cited = {
  evidence: EvidenceV2[];
  derived: DerivedFact[];
  periods: Period[];
  numbers: Numeric[];
  domains: Set<MetricDomain>;
};

function cite(claim: DraftClaim, ctx: ClaimCheckContext): Cited {
  const evidence = claim.evidenceIds.map((id) => ctx.evidence.get(id)!);
  const derived = claim.derivedFactIds.map((id) => ctx.derived.get(id)!);
  const periods = [
    ...evidence.map((item) => item.time.period),
    ...derived.flatMap((item) => item.periods),
  ];
  const numbers: Numeric[] = [];
  const domains = new Set<MetricDomain>();
  for (const item of evidence) {
    if (item.kind === "metric" || item.kind === "scenario_output")
      numbers.push({ value: item.value, unit: item.unit });
    else if (item.kind === "record_fact" && typeof item.value === "number")
      numbers.push({ value: item.value, unit: item.unit });
    const unit = "unit" in item ? item.unit : "text";
    for (const domain of metricDomains(item.semantics.metricKey, unit))
      domains.add(domain);
  }
  for (const item of derived) {
    if (item.output.status === "defined")
      numbers.push({ value: item.output.value, unit: item.output.unit });
    for (const entry of item.ranking ?? [])
      numbers.push({
        value: entry.value,
        unit: item.output.status === "defined" ? item.output.unit : "count",
      });
    if (item.ranking)
      numbers.push({ value: item.ranking.length, unit: "count" });
    const unit = item.output.status === "defined" ? item.output.unit : "count";
    for (const domain of metricDomains(item.metricKey, unit))
      domains.add(domain);
  }
  return { evidence, derived, periods, numbers, domains };
}

function checkDates(
  text: string,
  cited: Cited,
  now: Date,
): ClaimRejectionV2 | null {
  const endpoints = new Set(
    cited.periods.flatMap((p) => [
      p.from,
      p.through,
      p.from.slice(0, 7),
      p.through.slice(0, 7),
    ]),
  );
  for (const date of text.match(isoDate) ?? [])
    if (!endpoints.has(date)) return "date";
  const days = new Set(
    cited.periods.flatMap((p) => [p.from.slice(5), p.through.slice(5)]),
  );
  let badDay = false;
  text.replace(monthDay, (_match, name: string, from: string, to?: string) => {
    const month = monthOf(name);
    for (const day of [from, to].filter(Boolean) as string[])
      if (
        !days.has(`${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`)
      )
        badDay = true;
    return " ";
  });
  if (badDay) return "date";
  for (const [pattern, month] of monthNames) {
    for (const match of text.matchAll(
      new RegExp(
        pattern.source,
        pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
      ),
    )) {
      const after = text.slice((match.index ?? 0) + match[0].length);
      const year = /^\s+(\d{4})\b/.exec(after)?.[1];
      if (!overlapsMonth(cited.periods, month, year ? Number(year) : undefined))
        return "month";
    }
  }
  const current = manilaMonth(now, 0);
  const previous = manilaMonth(now, -1);
  if (
    thisMonth.test(text) &&
    !overlapsMonth(cited.periods, current.month, current.year)
  )
    return "month";
  if (
    lastMonth.test(text) &&
    !overlapsMonth(cited.periods, previous.month, previous.year)
  )
    return "month";
  return null;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function checkFigures(text: string, cited: Cited): boolean {
  const stripped = text.replace(isoDate, " ").replace(monthDay, " ");
  const years = new Set(
    cited.periods.flatMap((p) => [
      Number(p.from.slice(0, 4)),
      Number(p.through.slice(0, 4)),
    ]),
  );
  for (const match of stripped.matchAll(figurePattern)) {
    const [, minus, moneyPrefix, digits, suffix, magnitude] = match;
    if (magnitude) return false;
    const unitWord = suffix?.trim().toLowerCase();
    const kind =
      moneyPrefix || unitWord?.startsWith("peso") || unitWord === "piso"
        ? "money"
        : unitWord === "%" || unitWord === "percent" || unitWord === "porsyento"
          ? "percent"
          : "plain";
    const decimals = digits!.split(".")[1]?.length ?? 0;
    const value = (minus ? -1 : 1) * Number(digits!.replaceAll(",", ""));
    const candidates = cited.numbers
      .filter((item) =>
        kind === "money"
          ? item.unit === "centavos"
          : kind === "percent"
            ? item.unit === "percent"
            : item.unit !== "centavos" && item.unit !== "percent",
      )
      .map((item) =>
        item.unit === "centavos" ? item.value / 100 : item.value,
      );
    if (kind === "plain" && decimals === 0 && years.has(value)) continue;
    // Money copies the value to the centavo or whole pesos; percentages to
    // their tenth or a whole number. An unsigned figure may state a magnitude.
    const matches = candidates.some((candidate) => {
      const exact = round(candidate, decimals) === value;
      const magnitude =
        !minus && round(Math.abs(candidate), decimals) === value;
      const allowedRounding =
        kind === "plain" ? decimals === 0 || decimals === 1 : decimals <= 2;
      return allowedRounding && (exact || magnitude);
    });
    if (!matches) return false;
  }
  return true;
}

function numericRef(id: string, ctx: ClaimCheckContext) {
  const evidence = ctx.evidence.get(id);
  if (
    evidence &&
    (evidence.kind === "metric" || evidence.kind === "scenario_output")
  )
    return {
      value: evidence.value,
      unit: evidence.unit,
      metricKey: evidence.semantics.metricKey,
      group: evidence.semantics.comparableGroup,
      scopeId: evidence.scope.id,
      member: evidence.scope.cohort?.member ?? null,
      period: evidence.time.period,
    };
  const derived = ctx.derived.get(id);
  if (
    derived &&
    derived.output.status === "defined" &&
    derived.periods.length === 1
  )
    return {
      value: derived.output.value,
      unit: derived.output.unit,
      metricKey: derived.metricKey,
      group: derived.comparableGroup,
      scopeId: derived.scopeId,
      member: null,
      period: derived.periods[0]!,
    };
  return null;
}

function checkComparison(
  claim: DraftClaim,
  cited: Cited,
  ctx: ClaimCheckContext,
): ClaimRejectionV2 | null {
  const up = upward.test(claim.text);
  const down = downward.test(claim.text);
  const same = level.test(claim.text);
  const families = [up, down, same].filter(Boolean).length;
  if (families > 1) return "comparison";
  const stated = up ? "higher" : down ? "lower" : same ? "same" : null;
  const { comparison } = claim;
  if (comparison) {
    const refs = [...claim.evidenceIds, ...claim.derivedFactIds];
    if (
      !refs.includes(comparison.subjectId) ||
      !refs.includes(comparison.referenceId) ||
      comparison.subjectId === comparison.referenceId
    )
      return "comparison";
    const a = numericRef(comparison.subjectId, ctx);
    const b = numericRef(comparison.referenceId, ctx);
    if (!a || !b) return "comparison";
    const samePeriod =
      a.period.from === b.period.from && a.period.through === b.period.through;
    const compatible =
      a.unit === b.unit &&
      a.group === b.group &&
      a.scopeId === b.scopeId &&
      (a.metricKey === b.metricKey
        ? a.member === b.member || samePeriod
        : samePeriod);
    if (!compatible) return "incompatible_comparison";
    const actual =
      a.value > b.value ? "higher" : a.value < b.value ? "lower" : "same";
    if (actual !== comparison.direction) return "comparison";
    if (stated && stated !== comparison.direction) return "comparison";
    return null;
  }
  if (!stated) return null;
  // Without a declared pair, a direction must match a cited ATLAS change.
  const changes = [
    ...cited.derived.flatMap((item) =>
      (item.operation === "difference" ||
        item.operation === "percent_change" ||
        item.operation === "contribution") &&
      item.output.status === "defined"
        ? [item.output.value]
        : [],
    ),
    // A change the approved tool computed itself (its own measure of a
    // difference) carries its sign the same way.
    ...cited.evidence.flatMap((item) =>
      item.kind === "metric" && item.semantics.aggregation === "difference"
        ? [item.value]
        : [],
    ),
  ];
  const agrees = changes.some((value) => {
    return stated === "higher"
      ? value > 0
      : stated === "lower"
        ? value < 0
        : value === 0;
  });
  return agrees ? null : "comparison";
}

const needsSupport = new Set<DraftClaim["kind"]>([
  "fact",
  "calculation",
  "association",
  "interpretation",
  "hypothesis",
  "recommendation",
]);

/** Checks one draft claim; the writer never supplies its own verdict. */
export function checkClaim(
  claim: DraftClaim,
  ctx: ClaimCheckContext,
): AnalyticalClaim {
  const reasons: ClaimRejectionV2[] = [];
  const refs = [...claim.evidenceIds, ...claim.derivedFactIds];
  if (new Set(refs).size !== refs.length) reasons.push("duplicate_reference");
  if (claim.evidenceIds.some((id) => !ctx.evidence.has(id)))
    reasons.push("unknown_evidence");
  if (claim.derivedFactIds.some((id) => !ctx.derived.has(id)))
    reasons.push("unknown_derived_fact");
  const requirementIds = new Set(ctx.brief.requirements.map((item) => item.id));
  if (claim.answersRequirementIds.some((id) => !requirementIds.has(id)))
    reasons.push("unknown_requirement");
  const assumptionIds = new Set(ctx.brief.assumptions.map((item) => item.id));
  if (claim.assumptionIds.some((id) => !assumptionIds.has(id)))
    reasons.push("unknown_assumption");
  if (needsSupport.has(claim.kind) && refs.length === 0)
    reasons.push("missing_support");
  const structural = reasons.length === 0;
  if (!structural) return finish(claim, reasons, "failed", "pending");

  const cited = cite(claim, ctx);
  // A claim speaks for one scope; separate scopes need separate claims.
  if (
    claim.kind !== "limitation" &&
    [
      ...cited.evidence.map((item) => item.scope.id),
      ...cited.derived.map((item) => item.scopeId),
    ].some((scope) => scope !== claim.scopeId)
  )
    reasons.push("scope_mismatch");
  // Everything shown with the claim is checked with it, including a
  // recommendation's trade-off, constraints and next step.
  const text = [
    claim.text,
    claim.recommendation?.tradeoff,
    ...(claim.recommendation?.constraints ?? []),
    claim.recommendation?.nextAction.label,
  ]
    .filter(Boolean)
    .join(" ");
  if (causal.test(text)) reasons.push("causal_wording");
  if (certainty.test(text)) reasons.push("certainty_wording");
  if (unverifiable.test(text)) reasons.push("unverifiable_wording");

  if (superlative.test(text)) {
    const ranking = cited.derived.find(
      (item) =>
        (item.operation === "rank" || item.operation === "contribution") &&
        item.output.status === "defined" &&
        item.complete,
    );
    if (!ranking) reasons.push("unsupported_superlative");
    else if (ranking.tie && !tieMarker.test(text))
      reasons.push("tie_not_disclosed");
  }

  const dateReason = checkDates(text, cited, ctx.now);
  if (dateReason) reasons.push(dateReason);
  if (!checkFigures(text, cited)) reasons.push("figure");
  // A limitation that states no figure cannot relabel a value.
  const figureFreeLimitation = claim.kind === "limitation" && !/\d/.test(text);
  for (const [domain, pattern] of Object.entries(DOMAIN_TERMS))
    if (
      !figureFreeLimitation &&
      pattern!.test(text) &&
      !cited.domains.has(domain as MetricDomain)
    ) {
      reasons.push("metric_mismatch");
      break;
    }
  const comparisonReason = checkComparison(claim, cited, ctx);
  if (comparisonReason) reasons.push(comparisonReason);

  if (claim.kind !== "limitation") {
    if (cited.evidence.some((item) => item.coverage.query !== "complete"))
      reasons.push("incomplete_evidence");
    for (const item of cited.derived) {
      if (item.output.status === "undefined") {
        if (
          item.output.reason === "incomplete_set" ||
          !undefinedMarker.test(text)
        )
          reasons.push("undefined_result");
      } else if (!item.complete) reasons.push("incomplete_evidence");
    }
  }
  if (
    (claim.kind === "interpretation" || claim.kind === "hypothesis") &&
    !hedge.test(text)
  )
    reasons.push("unhedged_interpretation");
  if (
    claim.kind === "association" &&
    !cited.evidence.some((item) => item.semantics.metricKey === "correlation")
  )
    reasons.push("association_without_test");
  if (claim.kind === "recommendation") {
    const recommendation = claim.recommendation;
    if (!recommendation) reasons.push("recommendation_incomplete");
    else {
      if (!requirementIds.has(recommendation.objectiveRequirementId))
        reasons.push("recommendation_without_objective");
      // A conditional option names the assumption it depends on.
      if (
        (recommendation.conditional || conditional.test(claim.text)) &&
        claim.assumptionIds.length === 0
      )
        reasons.push("unstated_assumption");
    }
    if (generic.test(text)) reasons.push("generic_recommendation");
  }

  return finish(
    claim,
    [...new Set(reasons)],
    "passed",
    reasons.length ? "failed" : "passed",
  );
}

function finish(
  claim: DraftClaim,
  reasons: ClaimRejectionV2[],
  structural: ClaimVerification["structural"],
  deterministic: ClaimVerification["deterministic"],
): AnalyticalClaim {
  // Interpretive claims await the AI-05 semantic review; facts do not need it.
  const interpretive =
    claim.kind === "interpretation" ||
    claim.kind === "hypothesis" ||
    claim.kind === "association" ||
    claim.kind === "recommendation";
  return {
    ...claim,
    verification: {
      structural,
      deterministic,
      semantic: interpretive ? "pending" : "not_required",
      reasons,
    },
  };
}

/** Whether the server lets a checked claim reach the user. */
export function claimCanShip(claim: AnalyticalClaim) {
  return (
    claim.verification.structural === "passed" &&
    (claim.verification.deterministic === "passed" ||
      claim.verification.deterministic === "not_applicable") &&
    claim.verification.semantic !== "unsupported"
  );
}
