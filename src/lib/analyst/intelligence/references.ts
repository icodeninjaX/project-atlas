import type { V2EntityType } from "./tools/contracts";

/**
 * Deterministic reading of what a question names (Analyst V2 capability
 * routing). It finds the phrase that names one record, so owner-scoped
 * resolution searches for "study part-time" rather than the whole sentence,
 * and it reads the explicit amounts of a debt-payment scenario. It never
 * guesses: when nothing specific is named it returns null, and the caller
 * uses an aggregate tool or asks.
 */

// Words that point at a record without naming it.
const GENERIC =
  /^(?:the|a|an|my|our|this|that|these|those|main|top|primary|biggest|most important|current|new|old|all|every|each|any|some|overall|other|next|first|last|job|jobs)(?:\s+(?:the|a|an|my|main|top|primary|biggest|most important|current|new|old|job|jobs))*$/i;

// Question grammar after a name ("… the right call", "… successful").
const TRAILING =
  /\s+(?:(?:was|is|be)\s+)?(?:(?:the\s+)?right\s+(?:call|choice|move)|(?:a\s+)?(?:good|bad|wise)\s+(?:idea|call|choice|decision|move)|successful|worth it|working|going|a success|a mistake|work(?:ed)?\s+out)\s*$/i;

function clean(phrase: string | undefined) {
  const text = (phrase ?? "")
    .replace(/[?.!,;:]+$/g, "")
    .replace(TRAILING, "")
    .replace(/^(?:the|a|an|my|our)\s+/i, "")
    .trim();
  if (text.length < 2 || text.length > 120 || GENERIC.test(text)) return null;
  return text;
}

const patterns: Partial<Record<V2EntityType, RegExp[]>> = {
  goal: [
    /\bmy\s+([^?.,;]+?)\s+goal\b/i,
    /\bgoal\s+(?:called|named|to)\s+["“]?([^?.,;"”]+)/i,
  ],
  decision: [
    /\b(?:decision|decided|chose|choice)\s+(?:to|about|on)\s+([^?.,;]+)/i,
    /\bmy\s+([^?.,;]+?)\s+decision\b/i,
    /\b(?:was|is)\s+([^?.,;]+?)\s+(?:the\s+)?right\s+(?:call|choice|move)\b/i,
  ],
  debt: [
    /\b(?:on|to|toward|towards|for)\s+my\s+([^?.,;]+?)\s+(?:debt|card|loan)\b/i,
    /\bmy\s+([^?.,;]+?)\s+(?:debt|loan)\b/i,
    /\bmy\s+((?:credit\s+)?card)\b/i,
  ],
  job_application: [
    /\b(?:my|the)\s+([^?.,;]+?)\s+(?:job\s+)?application\b/i,
    /\bapplication\s+(?:to|at|for)\s+([^?.,;]+)/i,
  ],
  knowledge_concept: [/\bconcept\s+(?:of|called|named)?\s*["“]?([^?.,;"”]+)/i],
};

/** The phrase naming one record of `type`, or null when none is named. */
export function referencePhrase(
  question: string,
  type: V2EntityType,
): string | null {
  for (const pattern of patterns[type] ?? []) {
    const phrase = clean(question.match(pattern)?.[1]);
    if (phrase) return phrase;
  }
  return null;
}

export type DebtScenario = {
  /** Extra monthly debt payments, one per alternative, as peso strings. */
  extraMonthlyPesos: string[];
  /** A stated monthly income change, in percent. */
  incomeChangePercent: number | null;
  /** A one-time payoff was asked for; the runway engine does not model it. */
  oneTimePayoff: boolean;
};

const peso = /₱\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;
const monthly =
  /\b(?:monthly|a month|per month|each month|every month|kada buwan|buwan-buwan)\b/i;
const extraPayment = /\b(?:extra|additional|dagdag)\b/i;

/**
 * Reads an explicit debt-payment scenario: extra monthly payments (at most
 * two alternatives), an income change in percent, or a one-time payoff.
 * Returns null when the question states no such change.
 */
export function debtScenario(question: string): DebtScenario | null {
  const debtContext = /\b(?:debt|card|loan|utang|pay\w*|bayad)\b/i.test(
    question,
  );
  const extra: string[] = [];
  let oneTime = false;
  for (const match of question.matchAll(peso)) {
    const after = question.slice(match.index + match[0].length);
    const before = question.slice(0, match.index);
    const amount = `${match[1]!.replace(/,/g, "")}${match[2] ? `.${match[2]}` : ""}`;
    if (
      /\bone[- ]time\b[^₱]*$/i.test(before) ||
      /^\s*one[- ]time\b/i.test(after)
    )
      oneTime = true;
    // An income amount is not a payment ("monthly income is ₱50,000").
    else if (/\bincome\b[^₱]{0,24}$/i.test(before)) continue;
    // A monthly cadence anywhere in an extra-payment question applies to
    // its amounts ("₱2,000 toward my card each month").
    else if (
      debtContext &&
      monthly.test(question) &&
      extraPayment.test(question)
    )
      extra.push(amount);
  }
  const income = question.match(
    /\bincome\s+(?:falls?|drops?|decreases?|goes down|is cut|rises?|increases?|goes up|grows?)\s+(?:by\s+)?(\d{1,3})\s?%/i,
  );
  const incomeChangePercent = income
    ? Number(income[1]) *
      (/\b(?:rises?|increases?|goes up|grows?)\b/i.test(income[0]) ? 1 : -1)
    : null;
  if (!oneTime && extra.length === 0 && incomeChangePercent === null)
    return null;
  return {
    extraMonthlyPesos: [...new Set(extra)].slice(0, 2),
    incomeChangePercent,
    oneTimePayoff: oneTime,
  };
}
