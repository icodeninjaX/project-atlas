import { spendingPeriods } from "@/lib/analyst/evidence";
import type { AnalysisBrief, ConsentDomain } from "./contracts";
import { detectLanguage, detectStyle } from "./language";
import { debtScenario, referencePhrase } from "./references";
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

/** Capabilities that read one resolved record rather than a whole domain. */
const ENTITY_CAPABILITIES = new Set([
  "goal.resolve",
  "goal.linked_activity",
  "task.detail",
  "graph.paths",
  "decision.context",
  "decision.text",
  "knowledge.reviews",
  "career.stage_history",
  "reviews.excerpts",
]);

/**
 * "Why did I spend more?" also asks which categories account for the change
 * and how each has been moving: a money change between exactly two periods
 * gets a change-drivers requirement, unless it has one.
 */
export function withChangeDrivers(
  requirements: AnalysisBrief["requirements"],
  intent: AnalysisBrief["intent"],
  periods: number,
  question: string,
): AnalysisBrief["requirements"] {
  if (
    intent !== "explain_change" ||
    periods !== 2 ||
    requirements.some((item) =>
      item.evidenceNeeded.includes("money.change_drivers"),
    ) ||
    !requirements.some((item) =>
      item.evidenceNeeded.includes("money.category_breakdown"),
    )
  )
    return requirements;
  const kind = /\b(?:income|salary|earn\w*|kita|sahod)\b/i.test(question)
    ? "income"
    : "expense";
  return [
    ...requirements,
    {
      id: `r_money_drivers_${kind}`,
      question: `Which categories account for the change in recorded ${kind === "income" ? "income" : "spending"}, and how each has moved month by month`,
      essential: false,
      evidenceNeeded: ["money.change_drivers"],
    },
  ];
}

/**
 * A money question that asks where the most goes ("Where do I overspend the
 * most?", "What is my biggest expense category?"). A change question keeps
 * its own requirement.
 */
export function asksMoneyRanking(
  question: string,
  intent: AnalysisBrief["intent"],
) {
  if (intent === "explain_change" || intent === "scenario") return false;
  // A day, month or single purchase is not a category ranking.
  if (
    /\b(?:which|what)\s+(?:day|week|month|year|date|transaction|purchase|merchant|store)\b|\bsingle\b|\bmerchants?\b|\bstores?\b/i.test(
      question,
    )
  )
    return false;
  return /\b(?:where|which|what)\b[^?]*\b(?:most|biggest|largest|highest|top|overspend\w*)\b|\b(?:biggest|largest|highest|top)\s+(?:expense|spending|income)?\s*categor\w*|\bsaan\b[^?]*\bpinaka/i.test(
    question,
  );
}

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
  // A decision about studying is a decision question, not a knowledge one.
  if (
    /\b(?:decision|decided|desisyon|right (?:call|choice|move))\b/i.test(
      question,
    ) &&
    !/\b(?:concepts?|knowledge)\b/i.test(question)
  )
    domains = domains.filter((domain) => domain !== "knowledge");
  // An explicit payment scenario is answered by the runway engine.
  if (debtScenario(question) && domains.includes("debts"))
    domains = [
      ...new Set(
        domains.map((domain) => (domain === "debts" ? "runway" : domain)),
      ),
    ];
  // One named goal (or one carried in the conversation) gets its own
  // context; otherwise goals and tasks are read as a whole.
  const namedGoal =
    referencePhrase(question, "goal") !== null ||
    (input.plan?.entities ?? []).some((handle) => handle.startsWith("goal:"));
  const requirements: AnalysisBrief["requirements"] = [];
  for (const domain of domains) {
    const base = requirementFor[domain];
    if (!base) continue;
    let capabilities = [...base.capabilities];
    // No tool compares goals by name, so ranking unnamed goals is recorded
    // as unsupported; the overview and task focus are context, not an answer.
    if (domain === "goals" && !namedGoal && intent === "prioritize") {
      requirements.push(
        {
          id: "r_goals",
          question: "Which goal should get attention",
          essential: true,
          evidenceNeeded: ["goal.ranking"],
        },
        {
          id: "r_goals_context",
          question: "Current state across goals and tasks",
          essential: false,
          evidenceNeeded: ["goal.overview", "task.ranking"],
        },
      );
      continue;
    }
    if (domain === "goals" && !namedGoal) capabilities = ["goal.overview"];
    const scenario = domain === "runway" ? debtScenario(question) : null;
    if (
      scenario?.oneTimePayoff &&
      scenario.extraMonthlyPesos.length === 0 &&
      scenario.incomeChangePercent === null
    )
      capabilities = ["debt.one_time_payoff"];
    if (domain === "tasks" && !namedGoal && !domains.includes("goals"))
      capabilities = ["task.ranking"];
    // "Where do I spend the most?" asks for the ranking, not the total.
    if (domain === "money" && asksMoneyRanking(question, intent)) {
      const income = /\b(?:income|salary|earn\w*|kita|sahod)\b/i.test(question);
      // The same read returns the period total the ranking reconciles to.
      requirements.push({
        id: "r_money",
        question: income
          ? "Which income categories hold the most recorded income"
          : "Which expense categories hold the most recorded spending",
        essential: true,
        evidenceNeeded: ["money.category_ranking"],
      });
      continue;
    }
    if (
      domain === "money" &&
      (intent === "explain_change" ||
        /\bcategor|kategorya|which\b/i.test(question))
    )
      capabilities.push("money.category_breakdown");
    if (
      (domain === "goals" || domain === "tasks") &&
      namedGoal &&
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
    item.evidenceNeeded.some((id) => ENTITY_CAPABILITIES.has(id)),
  );
  // The phrases that name records, so resolution searches for a name
  // rather than the whole sentence.
  const phrases = [
    ...new Set(
      (
        [
          "goal",
          "decision",
          "debt",
          "job_application",
          "knowledge_concept",
        ] as const
      ).flatMap((type) => referencePhrase(question, type) ?? []),
    ),
  ];
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
    requirements: withChangeDrivers(
      requirements,
      intent,
      periods.length,
      question,
    ).slice(0, 12),
    assumptions: (input.plan?.assumptions ?? []).map((item) => ({
      id: `a_${item.key}`,
      text: `${item.key.replaceAll("_", " ")}: ${item.value}`,
      origin: item.origin,
    })),
    unresolvedReferences:
      needsEntity && entities.length === 0
        ? phrases.length > 0
          ? phrases.slice(0, 8)
          : [question.slice(0, 120)]
        : [],
  };
}
