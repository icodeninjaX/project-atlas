import type { analystCapabilities } from "./capabilities";
import type { AnalysisBrief, AnswerV2, ConsentDomain } from "./contracts";
import type { ConversationContext } from "./context";

/**
 * Follow-up suggestions for Analyst V2 (AI-06). They come from what the
 * answer left open, what it found, or a useful sensitivity check, never from
 * repeating the question. Each one needs an available, consented capability.
 * A suggestion that refers back ("What about last month?") is offered only
 * when conversation context will carry the subject to the next turn.
 */

export type FollowUp = {
  text: string;
  reason: "unresolved" | "finding" | "sensitivity" | "period";
  capability: string;
  referential: boolean;
};

type Capabilities = ReturnType<typeof analystCapabilities>;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

type TemplateKey =
  | "lastMonth"
  | "categories"
  | "goalTasks"
  | "decision"
  | "sensitivity"
  | "applications"
  | "spendThisMonth"
  | "why";

const templates: Record<"en" | "fil-en", Record<TemplateKey, string>> = {
  en: {
    lastMonth: "What about last month?",
    categories: "Which categories changed the most?",
    goalTasks: "Which tasks support this goal?",
    decision: "What changed after the related decision?",
    sensitivity: "And if it were 10 percentage points lower?",
    applications: "Which job applications need a follow-up?",
    spendThisMonth: "How much did I spend this month?",
    why: "Why?",
  },
  "fil-en": {
    lastMonth: "E noong nakaraang buwan?",
    categories: "Aling mga kategorya ang pinakamalaki ang pagbabago?",
    goalTasks: "Anong mga gawain ang sumusuporta sa layuning ito?",
    decision: "Ano ang nagbago pagkatapos ng kaugnay na desisyon?",
    sensitivity: "E kung mas mababa ng 10 porsyento?",
    applications: "Aling mga job application ang kailangang i-follow up?",
    spendThisMonth: "Magkano ang gastos ko ngayong buwan?",
    why: "Bakit?",
  },
};

export function suggestFollowUpsV2(input: {
  question: string;
  brief: AnalysisBrief;
  answer: AnswerV2;
  domains: ConsentDomain[];
  capabilities: Capabilities;
  context: ConversationContext | null;
  language: "en" | "fil-en";
}): FollowUp[] {
  const text = templates[input.language];
  const usable = (id: string) => {
    const status = input.capabilities.find((item) => item.id === id)?.status;
    return status === "available" || status === "partial";
  };
  const hasContext = input.context !== null;
  const candidates: FollowUp[] = [];
  const add = (item: FollowUp) => {
    if (!usable(item.capability)) return;
    if (item.referential && !hasContext) return;
    candidates.push(item);
  };
  const recommended = input.answer.claims.some(
    (claim) => claim.kind === "recommendation",
  );
  if (recommended)
    add({
      text: text.why,
      reason: "finding",
      capability: "goal.resolve",
      referential: true,
    });
  if (input.domains.includes("money")) {
    add({
      text: text.categories,
      reason: "finding",
      capability: "money.category_breakdown",
      referential: false,
    });
    add({
      text: text.lastMonth,
      reason: "period",
      capability: "money.totals",
      referential: true,
    });
  }
  if (input.domains.includes("goals")) {
    add({
      text: text.goalTasks,
      reason: "finding",
      capability: "goal.linked_activity",
      referential: true,
    });
    add({
      text: text.decision,
      reason: "finding",
      capability: "decision.context",
      referential: true,
    });
  }
  if (input.brief.assumptions.some((item) => /percent|%/i.test(item.text)))
    add({
      text: text.sensitivity,
      reason: "sensitivity",
      capability: "debt.scenario",
      referential: true,
    });
  // Something left unanswered only for lack of a period or subject can be retried.
  if (
    input.answer.unresolved.some(
      (item) => item.reason === "insufficient_evidence",
    ) &&
    input.domains.includes("money")
  )
    add({
      text: text.lastMonth,
      reason: "unresolved",
      capability: "money.totals",
      referential: true,
    });
  if (!input.domains.includes("career"))
    add({
      text: text.applications,
      reason: "finding",
      capability: "career.applications",
      referential: false,
    });
  if (!input.domains.includes("money"))
    add({
      text: text.spendThisMonth,
      reason: "finding",
      capability: "money.totals",
      referential: false,
    });
  const asked = normalize(input.question);
  const seen = new Set<string>();
  return candidates
    .filter((item) => {
      const key = normalize(item.text);
      if (key === asked || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
