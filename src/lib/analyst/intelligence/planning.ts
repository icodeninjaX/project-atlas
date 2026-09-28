import { spendingPeriods } from "@/lib/analyst/evidence";
import type { AnalysisBrief, ConsentDomain } from "./contracts";
import { detectLanguage, detectStyle } from "./language";
import { resolvePeriod, topicDomains, type TurnPlan } from "./turns";

/**
 * A deterministic AnalysisBrief builder for Analyst V2 (AI-06). It reads the
 * intent, domains, periods and entities from the question and the
 * structured conversation context, and maps each domain onto the capability
 * manifest. No model is involved, so a brief never invents an entity: names
 * are passed on as unresolved references for owner-scoped resolution.
 * `checkBrief` validates the result like any other brief.
 */

function intentOf(
  question: string,
  plan: TurnPlan | null,
): AnalysisBrief["intent"] {
  const text = question.toLowerCase();
  if (
    plan &&
    [
      "why",
      "change_period",
      "change_assumption",
      "correction",
      "refresh",
      "select_candidate",
      "confirm_assumption",
    ].includes(plan.interpretation.kind)
  )
    return "follow_up";
  if (/\bwhat if\b|\bpaano kung\b|\bscenario\b/.test(text)) return "scenario";
  if (/\bdecision|desisyon\b/.test(text)) return "review_decision";
  if (
    /\b(?:why|bakit|explain|increase|decrease|rose|fell|changed?|tumaas|bumaba)\b/.test(
      text,
    )
  )
    return "explain_change";
  if (/\b(?:should|prioriti[sz]e|focus|attention|uunahin)\b/.test(text))
    return "prioritize";
  if (
    /\b(?:versus|vs\.?|compare|compared|more than|less than|kaysa)\b/.test(text)
  )
    return "compare";
  if (/\b(?:connect\w*|linked|related|support\w*|behind)\b/.test(text))
    return "relationship";
  return "lookup";
}

const requirementFor: Record<
  ConsentDomain,
  { question: string; capabilities: string[] } | null
> = {
  money: {
    question: "Recorded money totals for the period",
    capabilities: ["money.totals"],
  },
  debts: {
    question: "Recorded debt payments and balances",
    capabilities: ["debt.payments"],
  },
  tasks: {
    question: "The relevant tasks and their state",
    capabilities: ["goal.linked_activity"],
  },
  goals: {
    question: "The goal's state and linked activity",
    capabilities: ["goal.linked_activity"],
  },
  career: {
    question: "The relevant job applications",
    capabilities: ["career.applications"],
  },
  reviews: {
    question: "Weekly review scores",
    capabilities: ["reviews.scores"],
  },
  knowledge: {
    question: "Recorded knowledge reviews",
    capabilities: ["knowledge.reviews"],
  },
  decisions: {
    question: "The decision's context and review window",
    capabilities: ["decision.context"],
  },
  signals: { question: "Current Signals", capabilities: ["signals.current"] },
  graph: null,
  runway: {
    question: "The scenario under the stated assumptions",
    capabilities: ["debt.scenario"],
  },
  history: null,
  timeline: null,
};

export function deterministicBrief(input: {
  question: string;
  plan: TurnPlan | null;
  now: Date;
}): AnalysisBrief {
  const question = input.question.trim().slice(0, 4000);
  const intent = intentOf(question, input.plan);
  const language = detectLanguage(question);
  const style = detectStyle(question, intent);
  const context = input.plan?.context ?? null;
  let domains = topicDomains(question);
  if (domains.length === 0 && context?.topic) domains = context.topic.domains;
  if (domains.length === 0) domains = ["money"];
  const requirements: AnalysisBrief["requirements"] = [];
  for (const domain of domains) {
    const base = requirementFor[domain];
    if (!base) continue;
    const capabilities = [...base.capabilities];
    if (
      domain === "money" &&
      (intent === "explain_change" ||
        /\bcategor|kategorya|which\b/i.test(question))
    )
      capabilities.push("money.category_breakdown");
    if (
      (domain === "goals" || domain === "tasks") &&
      (intent === "prioritize" ||
        /\bon track|open|overdue|remaining\b/i.test(question))
    )
      capabilities.push("task.detail");
    if (domain === "goals" && /\bdecision|desisyon\b/i.test(question))
      capabilities.push("decision.context");
    requirements.push({
      id: `r_${domain}`,
      question: base.question,
      essential: true,
      evidenceNeeded: capabilities,
    });
  }
  if (requirements.length === 0)
    requirements.push({
      id: "r_money",
      question: "Recorded money totals for the period",
      essential: true,
      evidenceNeeded: ["money.totals"],
    });

  const periods: AnalysisBrief["periods"] = [];
  const planned = input.plan?.periods ?? [];
  const named = resolvePeriod(question, input.now);
  if (planned.length)
    planned.forEach((item) =>
      periods.push({
        id: item.id,
        from: item.from,
        through: item.through,
        timeZone: "Asia/Manila",
        basis: item.basis,
      }),
    );
  else if (named)
    periods.push({
      id: "requested",
      from: named.from,
      through: named.through,
      timeZone: "Asia/Manila",
      basis: "explicit",
    });
  else {
    // A disclosed default: this month so far, and for a change or comparison
    // the same elapsed days of last month (the existing aligned rule).
    const aligned = spendingPeriods(input.now);
    periods.push({
      id: "current",
      ...aligned.current,
      timeZone: "Asia/Manila",
      basis: "disclosed_default",
    });
    if (intent === "explain_change" || intent === "compare")
      periods.push({
        id: "previous",
        ...aligned.previous,
        timeZone: "Asia/Manila",
        basis: "disclosed_default",
      });
  }
  const entities = (context?.entities ?? []).filter((item) =>
    (input.plan?.entities ?? []).includes(item.handle),
  );
  const needsEntity = requirements.some((item) =>
    item.evidenceNeeded.some((id) =>
      /^(goal|task|career|decision|knowledge|reviews)\./.test(id),
    ),
  );
  return {
    version: "1",
    intent,
    language,
    responseStyle: style.style,
    question,
    resolvedEntities: entities.map((item) => ({
      handle: item.handle,
      type: item.handle.split(":")[0]!,
      resolution: item.resolution,
    })),
    periods: periods.slice(0, 8),
    requirements: requirements.slice(0, 12),
    assumptions: (input.plan?.assumptions ?? []).map((item) => ({
      id: `a_${item.key}`,
      text: `${item.key.replaceAll("_", " ")}: ${item.value}`,
      origin: item.origin,
    })),
    unresolvedReferences:
      needsEntity && entities.length === 0 ? [question.slice(0, 120)] : [],
  };
}
