import { claimCanShip } from "./claims";
import type {
  AnalyticalClaim,
  AnswerV2,
  ResultStatus,
  UnresolvedReason,
} from "./contracts";
import { readableText, UI_TEXT, type StyleRequest } from "./language";

/**
 * The display model for a validated AnswerV2 (AI-06), built on the server so
 * the browser receives only checked text. The direct answer comes first,
 * then findings, options and interpretation, then the limits that affect
 * the conclusion, then what remains unanswered and the sources. A requested
 * sentence cap shortens the answer, but a critical caveat keeps its place;
 * nothing is rewritten, only chosen.
 */

export type PresentedClaim = {
  id: string;
  kind: AnalyticalClaim["kind"];
  text: string;
  recommendation: {
    tradeoff: string;
    constraints: string[];
    nextAction: { label: string; href: string | null };
    conditional: boolean;
  } | null;
};

export type Presentation = {
  language: "en" | "fil-en";
  status: ResultStatus;
  statusLabel: string;
  direct: PresentedClaim[];
  findings: PresentedClaim[];
  options: PresentedClaim[];
  limitations: string[];
  unresolved: Array<{
    requirementId: string;
    reason: UnresolvedReason;
    text: string;
  }>;
  verification: {
    figures: string;
    review: string;
    freshness: string | null;
  };
  sources: Array<{ href: string }>;
  shortened: { hidden: number; note: string } | null;
};

const sentences = (text: string) =>
  Math.max(1, (text.match(/[.!?](?:\s|$)/g) ?? []).length);

const reasonText: Record<"en" | "fil-en", Record<UnresolvedReason, string>> = {
  en: {
    no_supported_claim: "No checked statement answered this.",
    claim_rejected: "The statement for this failed ATLAS checks.",
    insufficient_evidence: "ATLAS does not have enough records for this.",
    unsupported_capability: "ATLAS cannot calculate this yet.",
    excluded_by_consent: "This uses data you chose not to share.",
    operational_failure: "ATLAS could not finish this part. Try again.",
  },
  "fil-en": {
    no_supported_claim: "Walang nasuring pahayag na sumagot dito.",
    claim_rejected: "Hindi pumasa sa pagsusuri ng ATLAS ang pahayag para dito.",
    insufficient_evidence: "Kulang ang records ng ATLAS para dito.",
    unsupported_capability: "Hindi pa ito kayang kalkulahin ng ATLAS.",
    excluded_by_consent: "Gumagamit ito ng datos na pinili mong hindi ibahagi.",
    operational_failure:
      "Hindi natapos ng ATLAS ang bahaging ito. Subukan ulit.",
  },
};

const statusKey: Record<ResultStatus, keyof (typeof UI_TEXT)["en"]> = {
  answered: "answered",
  partial_answer: "partial",
  clarification_required: "clarify",
  insufficient_evidence: "insufficient",
  unsupported_capability: "unsupported",
  fallback_facts: "facts",
  error: "error",
};

export function presentAnswer(
  answer: AnswerV2,
  options: {
    language: "en" | "fil-en";
    style: StyleRequest;
    requirementText: (id: string) => string;
    asOf: string | null;
  },
): Presentation {
  const { language } = options;
  const shipped = answer.claims.filter(claimCanShip);
  const present = (claim: AnalyticalClaim): PresentedClaim => ({
    id: claim.id,
    kind: claim.kind,
    text: readableText(claim.text, language),
    recommendation: claim.recommendation
      ? {
          tradeoff: readableText(claim.recommendation.tradeoff, language),
          constraints: claim.recommendation.constraints,
          nextAction: claim.recommendation.nextAction,
          conditional: claim.recommendation.conditional,
        }
      : null,
  });
  // In the answer's own order of direct claims.
  let direct = answer.directAnswerClaimIds.flatMap((id) =>
    shipped.filter((claim) => claim.id === id),
  );
  if (direct.length === 0)
    direct = shipped.filter((claim) => claim.kind !== "limitation").slice(0, 1);
  const rest = shipped.filter((claim) => !direct.includes(claim));
  let findings = rest.filter(
    (claim) =>
      claim.kind === "fact" ||
      claim.kind === "calculation" ||
      claim.kind === "association",
  );
  let choices = rest.filter(
    (claim) =>
      claim.kind === "recommendation" ||
      claim.kind === "interpretation" ||
      claim.kind === "hypothesis",
  );
  let caveats = rest.filter((claim) => claim.kind === "limitation");
  let shortened: Presentation["shortened"] = null;
  const cap = options.style.maxSentences;
  if (cap) {
    // The direct answer first; one sentence stays reserved for a critical caveat.
    const critical = caveats[0] ?? null;
    const budget = cap - (critical ? sentences(critical.text) : 0);
    const kept: AnalyticalClaim[] = [];
    let used = 0;
    for (const claim of [...direct, ...findings, ...choices]) {
      const size = sentences(claim.text);
      if (used + size > Math.max(budget, 1)) continue;
      kept.push(claim);
      used += size;
    }
    const hidden =
      direct.length +
      findings.length +
      choices.length +
      caveats.length -
      kept.length -
      (critical ? 1 : 0);
    direct = direct.filter((claim) => kept.includes(claim));
    findings = findings.filter((claim) => kept.includes(claim));
    choices = choices.filter((claim) => kept.includes(claim));
    caveats = critical ? [critical] : [];
    if (hidden > 0) shortened = { hidden, note: UI_TEXT[language].shortened };
  } else if (
    options.style.style === "concise" &&
    answer.status === "answered"
  ) {
    // A lookup stays short: the direct answer and any caveat.
    const hidden = findings.length + choices.length;
    findings = [];
    choices = [];
    if (hidden > 0) shortened = { hidden, note: UI_TEXT[language].shortened };
  }
  const review =
    answer.verification.semanticReview === "completed"
      ? language === "fil-en"
        ? "Sinuri rin ang kahulugan ng mga interpretasyon."
        : "Interpretations were also reviewed for meaning."
      : answer.verification.semanticReview === "unavailable"
        ? language === "fil-en"
          ? "Hindi available ang pangalawang pagsusuri, kaya hindi isinama ang mga interpretasyon."
          : "The meaning review was unavailable, so interpretations were left out."
        : language === "fil-en"
          ? "Mga datos lang ito, kaya hindi na kailangan ng pangalawang pagsusuri."
          : "This answer states facts only, so no meaning review was needed.";
  return {
    language,
    status: answer.status,
    statusLabel: UI_TEXT[language][statusKey[answer.status]],
    direct: direct.map(present),
    findings: findings.map(present),
    options: choices.map(present),
    // Limits stay visible next to the conclusion they affect.
    limitations: [
      ...caveats.map((claim) => readableText(claim.text, language)),
      ...answer.limitations.map((item) => readableText(item, language)),
    ],
    unresolved: answer.unresolved.map((item) => ({
      requirementId: item.requirementId,
      reason: item.reason,
      text: `${options.requirementText(item.requirementId)} — ${reasonText[language][item.reason]}`,
    })),
    verification: {
      figures:
        language === "fil-en"
          ? `${answer.verification.claimsPassed} sa ${answer.verification.claimsProposed} pahayag ang pumasa sa pagsusuri ng numero, petsa at saklaw.`
          : `${answer.verification.claimsPassed} of ${answer.verification.claimsProposed} statements passed figure, date and scope checks.`,
      review,
      freshness: options.asOf
        ? language === "fil-en"
          ? `Binasa ang records noong ${options.asOf}.`
          : `Records were read at ${options.asOf}.`
        : null,
    },
    sources: [...new Set(answer.sources.map((source) => source.href))].map(
      (href) => ({ href }),
    ),
    shortened,
  };
}
