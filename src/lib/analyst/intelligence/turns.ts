import { manilaToday } from "@/lib/analyst/evidence";
import type {
  AnalysisBrief,
  AnswerV2,
  ConsentDomain,
  EvidenceV2,
  Period,
} from "./contracts";
import { claimCanShip } from "./claims";
import {
  CONTEXT_LIMITS,
  type CitedValue,
  type ConversationContext,
} from "./context";

/**
 * Follow-up interpretation for Analyst V2 (AI-03). Deterministic rules decide
 * what a short or referential message means against the structured context:
 * a candidate choice, a confirmed assumption, "Why?", a period change, an
 * assumption change, a correction, a refresh, the same topic or a new topic.
 * A message that means none of these without context is a clarification,
 * never a guess. Nothing here writes a record: a correction changes a
 * conversational assumption only.
 */

export type TurnInterpretation =
  | { kind: "select_candidate"; handle: string; question: string }
  | {
      kind: "confirm_assumption";
      key: string;
      value: number | string;
      question: string;
    }
  | { kind: "decline_assumption"; question: string }
  | { kind: "why"; findingId: string | null }
  | { kind: "change_period"; period: Period & { label: string } }
  | { kind: "change_assumption"; key: string; value: number | string }
  | {
      kind: "correction";
      findingId: string | null;
      assumption: { key: string; value: number | string } | null;
    }
  | { kind: "refresh"; findingIds: string[] }
  | { kind: "same_topic" }
  | { kind: "new_topic"; domains: ConsentDomain[] }
  | { kind: "needs_clarification"; reason: "no_context" | "no_reference" };

const topicTerms: Array<[ConsentDomain, RegExp]> = [
  [
    "money",
    /\b(?:spend\w*|spent|expenses?|income|salary|budget|money|transactions?|categor\w*|gastos|kita|pera|sahod)\b/i,
  ],
  ["debts", /\b(?:debts?|loans?|card|utang)\b/i],
  ["tasks", /\b(?:tasks?|to-?dos?|gawain)\b/i],
  ["goals", /\b(?:goals?|milestones?|layunin)\b/i],
  ["career", /\b(?:job|applications?|career|interviews?|recruiter|trabaho)\b/i],
  ["reviews", /\b(?:weekly reviews?|reviews?|reflections?)\b/i],
  ["knowledge", /\b(?:knowledge|concepts?|study|studying)\b/i],
  ["decisions", /\b(?:decisions?|decided|desisyon)\b/i],
  ["runway", /\b(?:runway|scenario|what if)\b/i],
];

export function topicDomains(message: string): ConsentDomain[] {
  return topicTerms
    .filter(([, pattern]) => pattern.test(message))
    .map(([domain]) => domain);
}

const reference =
  /\b(?:it|that|those|these|this one|them|same|its|iyon|iyan|yan|yun|dun|doon|ito)\b/i;
const ordinals: Array<[RegExp, number]> = [
  [/^(?:the\s+)?(?:1|1st|first|one|#1|una|pang-?una|yung una|ang una)\b/i, 1],
  [
    /^(?:the\s+)?(?:2|2nd|second|two|#2|pangalawa|ikalawa|yung pangalawa)\b/i,
    2,
  ],
  [/^(?:the\s+)?(?:3|3rd|third|three|#3|pangatlo|ikatlo|yung pangatlo)\b/i, 3],
  [/^(?:the\s+)?(?:4|4th|fourth|four|#4|pang-?apat|ikaapat)\b/i, 4],
];
const lastOrdinal = /^(?:the\s+)?(?:last|last one|huli|yung huli)\b/i;
const yes =
  /^(?:yes|yeah|yep|correct|right|go ahead|sure|oo|opo|sige|tama|oo naman)\b/i;
const no = /^(?:no|nope|not that|hindi|huwag|wag|ayaw)\b/i;
const why =
  /^(?:why|bakit|how come|paano mo nasabi|why is that|why\?|bakit ganun)\b/i;
const correction =
  /\b(?:wrong|incorrect|not right|mistake|mali|opposite|contradict\w*|that'?s not (?:true|right)|you said)\b/i;
const refresh =
  /\b(?:still true|still correct|still right|up to date|latest|totoo pa|tama pa)\b/i;
const followUpLead =
  /^(?:and|what about|how about|and for|e|eh|paano kung|paano naman|kumusta naman)\b/i;
const percentOnly =
  /^(?:and|what about|how about|e|paano kung)?\s*(-?\d{1,3}(?:\.\d)?)\s?(?:%|percent|porsyento)\s*\??$/i;
const pesoAmount =
  /₱\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?|(\d{1,3}(?:,\d{3})+|\d+)\s?pesos?\b/i;

const months: Record<string, number> = {
  january: 1,
  enero: 1,
  february: 2,
  pebrero: 2,
  march: 3,
  marso: 3,
  april: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  june: 6,
  hunyo: 6,
  july: 7,
  hulyo: 7,
  august: 8,
  agosto: 8,
  september: 9,
  setyembre: 9,
  october: 10,
  oktubre: 10,
  november: 11,
  nobyembre: 11,
  december: 12,
  disyembre: 12,
};

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const lastDay = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
const shift = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Resolves a period phrase in Asia/Manila, or null when there is none. */
export function resolvePeriod(
  message: string,
  now: Date,
): (Period & { label: string }) | null {
  const today = manilaToday(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const text = message.toLowerCase();
  const previous =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  if (
    /\b(?:last|previous) month\b|\bnakaraang buwan\b|\bnoong isang buwan\b/.test(
      text,
    )
  )
    return {
      from: iso(previous.year, previous.month, 1),
      through: iso(
        previous.year,
        previous.month,
        lastDay(previous.year, previous.month),
      ),
      label: "last month",
    };
  if (/\bthis month\b|\bngayong buwan\b/.test(text))
    return {
      from: iso(year, month, 1),
      through: today,
      label: "this month so far",
    };
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = shift(today, -weekday);
  if (/\blast week\b|\bnakaraang linggo\b/.test(text))
    return {
      from: shift(monday, -7),
      through: shift(monday, -1),
      label: "last week",
    };
  if (/\bthis week\b|\bngayong linggo\b/.test(text))
    return { from: monday, through: today, label: "this week so far" };
  if (/\blast quarter\b/.test(text)) {
    const quarter = Math.floor((month - 1) / 3);
    const startMonth = quarter === 0 ? 10 : quarter * 3 - 2;
    const startYear = quarter === 0 ? year - 1 : year;
    return {
      from: iso(startYear, startMonth, 1),
      through: iso(
        startYear,
        startMonth + 2,
        lastDay(startYear, startMonth + 2),
      ),
      label: "last quarter",
    };
  }
  const named = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|enero|pebrero|marso|abril|mayo|hunyo|hulyo|agosto|setyembre|oktubre|nobyembre|disyembre)\b(?:\s+(\d{4}))?/,
  );
  // "may" is a month only after "in", "of", "for" or "noong", or with a year.
  if (
    named &&
    (named[1] !== "may" ||
      named[2] ||
      /\b(?:in|of|for|noong|about)\s+may\b/.test(text))
  ) {
    const target = months[named[1]!]!;
    const targetYear = named[2]
      ? Number(named[2])
      : target > month
        ? year - 1
        : year;
    const through =
      targetYear === year && target === month
        ? today
        : iso(targetYear, target, lastDay(targetYear, target));
    return { from: iso(targetYear, target, 1), through, label: named[0] };
  }
  return null;
}

function latestFinding(
  context: ConversationContext,
  predicate: (f: ConversationContext["findings"][number]) => boolean,
) {
  return [...context.findings].reverse().find(predicate)?.id ?? null;
}

function money(match: RegExpMatchArray) {
  const whole = (match[1] ?? match[3] ?? "").replaceAll(",", "");
  return Number(`${whole}.${match[2] ?? "0"}`);
}

/** Interprets one message against the current context. */
export function classifyTurn(
  message: string,
  context: ConversationContext | null,
  now: Date,
  labels: ReadonlyMap<string, string> = new Map(),
): TurnInterpretation {
  const text = message.trim();
  const short = text.length < 8;
  if (!context || context.turn === 0)
    return short
      ? { kind: "needs_clarification", reason: "no_context" }
      : { kind: "new_topic", domains: topicDomains(text) };
  const pending = context.pendingClarification;
  if (pending?.kind === "entity") {
    const index =
      ordinals.find(([pattern]) => pattern.test(text))?.[1] ??
      (lastOrdinal.test(text) ? pending.candidates.length : null);
    if (index && index <= pending.candidates.length)
      return {
        kind: "select_candidate",
        handle: pending.candidates[index - 1]!,
        question: pending.question,
      };
    const named = pending.candidates.filter((handle) => {
      const label = labels.get(handle)?.toLowerCase();
      return (
        label !== undefined &&
        (text.toLowerCase().includes(label) ||
          label.includes(text.toLowerCase()))
      );
    });
    if (named.length === 1)
      return {
        kind: "select_candidate",
        handle: named[0]!,
        question: pending.question,
      };
  }
  if (pending?.kind === "assumption") {
    if (yes.test(text))
      return {
        kind: "confirm_assumption",
        key: pending.key,
        value: pending.proposed,
        question: pending.question,
      };
    if (no.test(text))
      return { kind: "decline_assumption", question: pending.question };
  }
  if (why.test(text) && text.length <= 60)
    return {
      kind: "why",
      findingId:
        context.recommendations.at(-1)?.findingId ??
        latestFinding(context, (finding) => finding.turn === context.turn),
    };
  const amount = text.match(pesoAmount);
  if (correction.test(text)) {
    const moneyAssumption = [...context.assumptions]
      .reverse()
      .find(
        (item) =>
          typeof item.value === "number" && !item.key.endsWith("_percent"),
      );
    return {
      kind: "correction",
      findingId: latestFinding(context, (finding) => finding.cited.length > 0),
      assumption:
        amount && moneyAssumption
          ? { key: moneyAssumption.key, value: money(amount) }
          : null,
    };
  }
  if (refresh.test(text))
    return {
      kind: "refresh",
      findingIds: context.findings
        .filter((f) => f.turn === context.turn)
        .map((f) => f.id),
    };
  const percent = text.match(percentOnly);
  const percentAssumption = [...context.assumptions]
    .reverse()
    .find((item) => item.key.endsWith("_percent"));
  if (percent && percentAssumption)
    return {
      kind: "change_assumption",
      key: percentAssumption.key,
      value: Number(percent[1]),
    };
  if (amount && /\binstead\b|\buse\b|\bgamitin\b/i.test(text)) {
    const moneyAssumption = [...context.assumptions]
      .reverse()
      .find(
        (item) =>
          typeof item.value === "number" && !item.key.endsWith("_percent"),
      );
    if (moneyAssumption)
      return {
        kind: "change_assumption",
        key: moneyAssumption.key,
        value: money(amount),
      };
  }
  const domains = topicDomains(text);
  const period = resolvePeriod(text, now);
  const current = context.topic?.domains ?? [];
  const newDomains = domains.filter((domain) => !current.includes(domain));
  if (
    period &&
    newDomains.length === 0 &&
    (followUpLead.test(text) || text.length <= 40)
  )
    return { kind: "change_period", period };
  if (domains.length > 0 && newDomains.length === domains.length)
    return { kind: "new_topic", domains };
  if (reference.test(text) || followUpLead.test(text))
    return { kind: "same_topic" };
  if (short) return { kind: "needs_clarification", reason: "no_reference" };
  return domains.length > 0
    ? { kind: "same_topic" }
    : { kind: "new_topic", domains };
}

/** What the next analysis should use, after applying the interpretation. */
export type TurnPlan = {
  context: ConversationContext;
  interpretation: TurnInterpretation;
  /** The question to analyze: the original one for a choice or confirmation. */
  question: string | null;
  entities: string[];
  periods: ConversationContext["periods"];
  assumptions: ConversationContext["assumptions"];
  /** Findings whose evidence must be re-read before this turn answers. */
  refreshFindings: string[];
  /** The turn cap was reached, so the conversation starts again. */
  restarted: boolean;
};

function upsertAssumption(
  assumptions: ConversationContext["assumptions"],
  next: ConversationContext["assumptions"][number],
) {
  return [...assumptions.filter((item) => item.key !== next.key), next].slice(
    -CONTEXT_LIMITS.assumptions,
  );
}

export function applyTurn(
  context: ConversationContext,
  interpretation: TurnInterpretation,
  message: string,
  fresh: () => ConversationContext,
): TurnPlan {
  const restarted = context.turn >= CONTEXT_LIMITS.turns;
  const base = restarted ? fresh() : context;
  const turn = base.turn + 1;
  let next: ConversationContext = { ...base, turn, pendingClarification: null };
  let question: string | null = message
    .trim()
    .slice(0, CONTEXT_LIMITS.questionChars);
  let refreshFindings: string[] = [];
  switch (interpretation.kind) {
    case "new_topic":
      // A new subject clears the previous focus; earlier findings stay only
      // as references for "you said earlier".
      next = {
        ...next,
        topic: { domains: interpretation.domains, intent: "lookup" },
        entities: [],
        periods: [],
        assumptions: [],
        unresolved: [],
      };
      break;
    case "select_candidate":
      next = {
        ...next,
        entities: [
          {
            handle: interpretation.handle,
            resolution: "selected" as const,
            turn,
          },
          ...next.entities.filter(
            (item) => item.handle !== interpretation.handle,
          ),
        ].slice(0, CONTEXT_LIMITS.entities),
      };
      question = interpretation.question;
      break;
    case "confirm_assumption":
      next = {
        ...next,
        assumptions: upsertAssumption(next.assumptions, {
          key: interpretation.key,
          value: interpretation.value,
          origin: "user_confirmed",
          turn,
        }),
      };
      question = interpretation.question;
      break;
    case "decline_assumption":
      question = null;
      break;
    case "change_period":
      next = {
        ...next,
        periods: [
          {
            id: "requested",
            from: interpretation.period.from,
            through: interpretation.period.through,
            basis: "explicit",
          },
        ],
      };
      question = base.lastQuestion;
      break;
    case "change_assumption":
      next = {
        ...next,
        assumptions: upsertAssumption(next.assumptions, {
          key: interpretation.key,
          value: interpretation.value,
          origin: "user_stated",
          turn,
        }),
      };
      question = base.lastQuestion;
      break;
    case "correction":
      if (interpretation.assumption)
        next = {
          ...next,
          assumptions: upsertAssumption(next.assumptions, {
            ...interpretation.assumption,
            origin: "user_stated",
            turn,
          }),
        };
      refreshFindings = interpretation.findingId
        ? [interpretation.findingId]
        : [];
      question = interpretation.assumption ? base.lastQuestion : question;
      break;
    case "why":
      refreshFindings = interpretation.findingId
        ? [interpretation.findingId]
        : [];
      break;
    case "refresh":
      refreshFindings = interpretation.findingIds;
      question = base.lastQuestion;
      break;
    case "needs_clarification":
      question = null;
      break;
    case "same_topic":
      break;
  }
  if (question && interpretation.kind !== "why")
    next = { ...next, lastQuestion: question };
  return {
    context: next,
    interpretation,
    question,
    entities: next.entities.map((item) => item.handle),
    periods: next.periods,
    assumptions: next.assumptions,
    refreshFindings,
    restarted,
  };
}

function citedValues(evidence: EvidenceV2[], ids: string[]): CitedValue[] {
  return ids
    .flatMap((id) => {
      const item = evidence.find((entry) => entry.id === id);
      // Only aggregate values are kept; narrative never enters the context.
      if (!item || item.sharing.route !== "aggregate") return [];
      if (
        item.kind !== "metric" &&
        item.kind !== "scenario_output" &&
        item.kind !== "record_fact"
      )
        return [];
      return [
        {
          evidenceId: item.id,
          metricKey: item.semantics.metricKey,
          scopeId: item.scope.id,
          period: item.time.period,
          value: item.value,
        },
      ];
    })
    .slice(0, 8);
}

/** Records a validated answer's findings, suggestions and open questions. */
export function recordAnswer(
  context: ConversationContext,
  input: {
    brief: AnalysisBrief;
    answer: AnswerV2;
    evidence: EvidenceV2[];
    /** Owner-authorized candidates when the answer asks which record. */
    candidates?: string[];
  },
): ConversationContext {
  const shipped = input.answer.claims.filter(claimCanShip);
  const findings = shipped.map((claim) => ({
    id: `t${context.turn}.${claim.id}`,
    turn: context.turn,
    kind: claim.kind,
    requirementIds: claim.answersRequirementIds.slice(0, 6),
    text: claim.text.slice(0, CONTEXT_LIMITS.findingTextChars),
    cited: citedValues(input.evidence, claim.evidenceIds),
    assumptionKeys: claim.assumptionIds.slice(0, 6),
  }));
  const recommendations = findings
    .filter((finding) => finding.kind === "recommendation")
    .map((finding) => ({
      findingId: finding.id,
      turn: context.turn,
      origin: "analyst_suggestion" as const,
    }));
  const domains = [...new Set(input.evidence.map((item) => item.domain))];
  const questionOf = (id: string) =>
    input.brief.requirements.find((item) => item.id === id)?.question ?? id;
  const candidates = [...new Set(input.candidates ?? [])];
  return {
    ...context,
    topic: {
      domains: domains.length ? domains : (context.topic?.domains ?? []),
      intent: input.brief.intent,
    },
    entities: [
      ...context.entities,
      ...input.brief.resolvedEntities
        .filter(
          (item) =>
            !context.entities.some((entry) => entry.handle === item.handle),
        )
        .map((item) => ({
          handle: item.handle,
          resolution: item.resolution,
          turn: context.turn,
        })),
    ].slice(-CONTEXT_LIMITS.entities),
    periods: context.periods.length
      ? context.periods
      : input.brief.periods.slice(0, CONTEXT_LIMITS.periods).map((item) => ({
          id: item.id,
          from: item.from,
          through: item.through,
          basis: item.basis,
        })),
    findings: [...context.findings, ...findings].slice(
      -CONTEXT_LIMITS.findings,
    ),
    recommendations: [...context.recommendations, ...recommendations].slice(
      -CONTEXT_LIMITS.recommendations,
    ),
    unresolved: input.answer.unresolved
      .map((item) => ({
        requirementId: item.requirementId,
        question: questionOf(item.requirementId).slice(0, 400),
        reason: item.reason,
      }))
      .slice(0, CONTEXT_LIMITS.unresolved),
    pendingClarification:
      input.answer.status === "clarification_required" && candidates.length >= 2
        ? {
            kind: "entity",
            question: input.brief.question.slice(
              0,
              CONTEXT_LIMITS.questionChars,
            ),
            candidates: candidates.slice(0, CONTEXT_LIMITS.candidates),
          }
        : null,
  };
}

/** Asks the user to confirm one assumption, keeping the question it serves. */
export function askAssumption(
  context: ConversationContext,
  question: string,
  key: string,
  proposed: number | string,
): ConversationContext {
  return {
    ...context,
    pendingClarification: {
      kind: "assumption",
      question: question.slice(0, CONTEXT_LIMITS.questionChars),
      key,
      proposed,
    },
  };
}

export type ChangeOutcome =
  | "unchanged"
  | "data_changed"
  | "assumption_changed"
  | "scope_changed"
  | "source_unavailable"
  | "prior_error";

/**
 * Explains why a current answer may differ from an earlier finding: the
 * records changed, an assumption changed, the scope changed, a source is no
 * longer available, or the earlier claim was wrong on the same inputs.
 */
export function explainChange(
  context: ConversationContext,
  findingId: string,
  current: EvidenceV2[],
  options: { scopeId?: string; priorClaimStillHolds?: boolean } = {},
): {
  outcome: ChangeOutcome;
  changes: Array<{
    metricKey: string;
    period: Period;
    before: CitedValue["value"];
    after: CitedValue["value"] | null;
  }>;
} {
  const finding = context.findings.find((item) => item.id === findingId);
  if (!finding) return { outcome: "source_unavailable", changes: [] };
  if (
    finding.assumptionKeys.some((key) =>
      context.assumptions.some(
        (item) => item.key === key && item.turn > finding.turn,
      ),
    )
  )
    return { outcome: "assumption_changed", changes: [] };
  if (
    options.scopeId &&
    finding.cited.length > 0 &&
    finding.cited.every((item) => item.scopeId !== options.scopeId)
  )
    return { outcome: "scope_changed", changes: [] };
  const changes = finding.cited.map((item) => {
    const match = current.find(
      (entry) =>
        entry.semantics.metricKey === item.metricKey &&
        entry.scope.id === item.scopeId &&
        entry.time.period.from === item.period.from &&
        entry.time.period.through === item.period.through &&
        "value" in entry,
    );
    return {
      metricKey: item.metricKey,
      period: item.period,
      before: item.value,
      after: match && "value" in match ? match.value : null,
    };
  });
  if (changes.some((item) => item.after === null))
    return { outcome: "source_unavailable", changes };
  if (changes.some((item) => item.after !== item.before))
    return { outcome: "data_changed", changes };
  if (options.priorClaimStillHolds === false)
    return { outcome: "prior_error", changes };
  return { outcome: "unchanged", changes };
}
