import type { ToolName } from "@/lib/analyst/tools/contracts";

/**
 * Follow-up questions offered under an answer. They come from a fixed list
 * keyed by the tools that ran, so they never contain record text or recorded
 * figures, and each one is phrased so the planner can plan it without a
 * literal record ID. No model call is made.
 */
export const FOLLOW_UP_LIMITS = Object.freeze({ count: 3, chars: 80 });

const spending = [
  "How does this compare to last month?",
  "How has my spending changed over the last six months?",
  "How did my spending compare to my income last month?",
];
const income = [
  "How has my income changed over the last six months?",
  "How did my spending compare to my income last month?",
  "What if my monthly income falls by 20%?",
];
const debts = [
  "How much have I paid toward my debts this year?",
  "Am I making progress toward becoming debt-free?",
  "What does my current runway look like?",
];
const tasks = [
  "How many tasks did I complete each week this month?",
  "How are my goals progressing?",
  "What needs my attention across money and goals?",
];
const goals = [
  "What should I focus on this week?",
  "What needs my attention across money and goals?",
  "How many tasks did I complete each week this month?",
];
const runway = [
  "What if my monthly income falls by 20%?",
  "What if my monthly income rises by 10%?",
  "What does my current runway look like?",
];
const reviews = [
  "How have my weekly review scores changed?",
  "What should I focus on this week?",
];
const career = [
  "How is my job search pipeline looking?",
  "What should I focus on this week?",
];
const history = [
  "Did my spending and task completions move together?",
  "How has my spending changed over the last six months?",
];
const general = [
  "What needs my attention across money and goals?",
  "What should I focus on this week?",
  "How are my goals progressing?",
];

const byTool: Record<ToolName, string[]> = {
  getSpendingChange: spending,
  getMoneySummary: spending,
  getDebtProgress: debts,
  getDebtPayments: debts,
  getTaskFocus: tasks,
  getGoalProgress: goals,
  getGoalLinkedActivity: goals,
  getCareerPipeline: career,
  getWeeklyReviewMetrics: reviews,
  getSignals: general,
  getHistoricalMetricSeries: history,
  getCrossDomainHistory: history,
  getPatternAssociation: [
    "How has my spending changed over the last six months?",
    "How have my weekly review scores changed?",
  ],
  getRelatedEntities: goals,
  getTimelineEvents: general,
  getRunway: runway,
  runFinancialScenario: runway,
  compareFinancialScenarios: [
    "What if my monthly income rises by 10%?",
    "What does my current runway look like?",
    "What if my monthly income falls by 20%?",
  ],
};

const byMetric: Record<string, string[]> = {
  income_centavos: income,
  expense_centavos: spending,
  debt_payments_centavos: debts,
  task_completions: tasks,
  knowledge_reviews: [
    "How many knowledge reviews did I complete each month?",
    "What should I focus on this week?",
  ],
  review_overall_score: reviews,
};

/** Case, spacing and punctuation-insensitive key for "was this asked?". */
export function questionKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/**
 * Two or three follow-ups for an answered or fallback turn. Skips the question
 * just asked and earlier ones in this conversation.
 */
export function suggestFollowUps(input: {
  question: string;
  history?: ReadonlyArray<{ question: string }>;
  calls: ReadonlyArray<{ tool: ToolName; input: unknown }>;
}): string[] {
  const asked = new Set(
    [input.question, ...(input.history ?? []).map((turn) => turn.question)].map(
      questionKey,
    ),
  );
  // One list per domain read: a two-metric history or pattern call offers
  // follow-ups for each of its metrics, not a fixed history list.
  const lists = input.calls.flatMap((call) => {
    const args = (call.input ?? {}) as {
      kind?: unknown;
      metric?: unknown;
      metrics?: unknown;
    };
    if (call.tool === "getMoneySummary" && args.kind === "income")
      return [income];
    const metrics = [
      ...(typeof args.metric === "string" ? [args.metric] : []),
      ...(Array.isArray(args.metrics) ? args.metrics : []),
    ]
      .map((metric) => byMetric[String(metric)])
      .filter((list): list is string[] => Boolean(list));
    return metrics.length > 0 ? metrics : [byTool[call.tool] ?? []];
  });
  // Round-robin, so a broad answer offers one idea per domain it read.
  const candidates: string[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest; index += 1)
    for (const list of lists) if (list[index]) candidates.push(list[index]!);
  const picked: string[] = [];
  for (const text of [...candidates, ...general]) {
    if (picked.length >= FOLLOW_UP_LIMITS.count) break;
    if (picked.includes(text) || asked.has(questionKey(text))) continue;
    picked.push(text);
  }
  return picked;
}

/** Every question this module can offer, for tests and review. */
export const ALL_FOLLOW_UPS = [
  ...new Set([
    ...Object.values(byTool).flat(),
    ...Object.values(byMetric).flat(),
    ...general,
  ]),
];
