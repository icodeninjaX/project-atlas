import type { ConsentDomain } from "./contracts";
import {
  eligibility,
  type AnalystConsent,
  type FieldProfile,
  type ProviderRoute,
} from "./policy";

/**
 * The owner-independent capability manifest (AI-02A, AI-02C). It says what
 * ATLAS can retrieve or calculate for Analyst, which history it supports,
 * and which inferences it cannot make. It reveals no records, schema or
 * credentials. `analystCapabilities` adjusts each entry for the request's
 * consent and provider route; an excluded domain becomes `not_authorized`.
 */

export type CapabilityStatus =
  | "available"
  | "partial"
  | "unsupported"
  | "not_authorized"
  | "temporarily_unavailable";

export type CapabilityDescriptor = {
  id: string;
  domain: ConsentDomain;
  /** The most sensitive field profile the capability sends to a provider. */
  profile: FieldProfile;
  status: Exclude<
    CapabilityStatus,
    "not_authorized" | "temporarily_unavailable"
  >;
  description: string;
  /** Approved tools: legacy names or Analyst V2 tool names. */
  tools: string[];
  supportedHistory: string;
  unsupported: string[];
};

const entry = (descriptor: CapabilityDescriptor) => descriptor;

export const CAPABILITY_MANIFEST: readonly CapabilityDescriptor[] = [
  entry({
    id: "money.totals",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description:
      "Recorded income or expense totals for an explicit Manila date period.",
    tools: ["getMoneySummary", "getMoneyBreakdown"],
    supportedHistory: "Any period of up to 366 days over surviving records.",
    unsupported: ["Unrecorded spending", "Deleted records"],
  }),
  entry({
    id: "money.aligned_comparison",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description: "This month so far against the same elapsed days last month.",
    tools: ["getSpendingChange"],
    supportedHistory: "Current and previous calendar month.",
    unsupported: ["Behavioral causes of a change"],
  }),
  entry({
    id: "money.category_breakdown",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description:
      "Complete per-category totals from the database aggregate, reconcilable with the period total; category names are owner-only labels.",
    tools: ["getMoneyBreakdown"],
    supportedHistory: "Any period of up to 366 days.",
    unsupported: ["Merchant-level breakdown", "Why a category changed"],
  }),
  entry({
    id: "money.category_ranking",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description:
      "Which categories hold the most recorded money for a period, ranked by ATLAS from the complete per-category aggregate.",
    tools: ["getMoneyBreakdown"],
    supportedHistory: "Any period of up to 366 days.",
    unsupported: [
      "Whether spending is too high; ATLAS has no budget or target to judge it against",
    ],
  }),
  entry({
    id: "money.query",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description:
      "A question about recorded income or expenses that the fixed reads cannot answer: limited to named categories or an amount range, measured as a total, a count or an average per transaction, and grouped by category, weekday, weekend against weekdays, or month. ATLAS computes every figure from every matching record.",
    tools: ["resolveAnalystEntities", "queryTransactions"],
    supportedHistory: "Any period of up to 366 days.",
    unsupported: [
      "Merchants, notes or descriptions",
      "Times of day",
      "Why spending happened",
    ],
  }),
  entry({
    id: "money.full_aggregate",
    domain: "money",
    profile: "aggregate",
    status: "available",
    description:
      "Totals and rankings over every matching record through a database aggregate; withheld when the aggregate exceeds its bound.",
    tools: ["getMoneyBreakdown"],
    supportedHistory: "Any period of up to 366 days.",
    unsupported: ["Rankings from a search page"],
  }),
  entry({
    id: "money.income_semantics",
    domain: "money",
    profile: "aggregate",
    status: "partial",
    description:
      "Income transactions exclude transfers; ATLAS has no refund or borrowing transaction type.",
    tools: ["getMoneySummary", "getMoneyBreakdown"],
    supportedHistory: "Any period of up to 366 days.",
    unsupported: ["Separating refunds or loan proceeds recorded as income"],
  }),
  entry({
    id: "money.budget",
    domain: "money",
    profile: "aggregate",
    status: "unsupported",
    description: "Budget-versus-spending comparison.",
    tools: [],
    supportedHistory: "None.",
    unsupported: ["Budget variance"],
  }),
  entry({
    id: "debt.payments",
    domain: "debts",
    profile: "aggregate",
    status: "available",
    description: "Recorded debt payments and current balances.",
    tools: ["getDebtPayments", "getDebtProgress"],
    supportedHistory: "Payments by date; current balance only.",
    unsupported: ["Historical balances", "Payoff dates"],
  }),
  entry({
    id: "debt.scenario",
    domain: "runway",
    profile: "aggregate",
    status: "partial",
    description: "Runway scenarios with extra monthly debt payments.",
    tools: ["runFinancialScenario", "compareFinancialScenarios"],
    supportedHistory: "Current baseline only.",
    unsupported: ["One-time debt payoff", "Guaranteed outcomes"],
  }),
  entry({
    id: "goal.resolve",
    domain: "goals",
    profile: "aggregate",
    status: "available",
    description:
      "Owner-only name resolution with explicit ambiguity; names stay owner-only labels.",
    tools: ["resolveAnalystEntities", "searchAnalystRecords"],
    supportedHistory: "Current records.",
    unsupported: ["Choosing a main goal for the user"],
  }),
  entry({
    id: "goal.linked_activity",
    domain: "goals",
    profile: "aggregate",
    status: "available",
    description:
      "A goal's current state, milestones and currently linked task activity in a period.",
    tools: ["getGoalAnalysisContext", "getGoalLinkedActivity"],
    supportedHistory: "Dated completions of currently linked records.",
    unsupported: [
      "Whether links existed in the past",
      "Effort or impact of tasks",
    ],
  }),
  entry({
    id: "goal.overview",
    domain: "goals",
    profile: "aggregate",
    status: "available",
    description:
      "Counts across all active goals: how many, how many are past their target date, completed milestones and average displayed progress.",
    tools: ["getGoalProgress"],
    supportedHistory: "Current state only.",
    unsupported: ["Which goal matters most to the user", "Progress history"],
  }),
  entry({
    id: "goal.ranking",
    domain: "goals",
    profile: "aggregate",
    status: "unsupported",
    description:
      "Ranking goals against each other for attention. No tool compares goals by name; counts across all goals cannot say which one matters most.",
    tools: [],
    supportedHistory: "None.",
    unsupported: ["Which goal to prioritize"],
  }),
  entry({
    id: "debt.one_time_payoff",
    domain: "runway",
    profile: "aggregate",
    status: "unsupported",
    description:
      "A one-time lump-sum debt payoff. The runway engine models extra monthly payments only.",
    tools: [],
    supportedHistory: "None.",
    unsupported: ["One-time payoff", "Payoff dates"],
  }),
  entry({
    id: "goal.history",
    domain: "goals",
    profile: "aggregate",
    status: "unsupported",
    description: "Past goal progress.",
    tools: [],
    supportedHistory: "None: only current progress is stored.",
    unsupported: ["Reconstructed past progress", "Goal stalls"],
  }),
  entry({
    id: "task.detail",
    domain: "tasks",
    profile: "aggregate",
    status: "available",
    description:
      "Task status, priority, due and completion dates and goal link.",
    tools: ["getAnalystRecordDetails"],
    supportedHistory: "Current records; completion dates.",
    unsupported: ["Effort estimates", "Reopened-task history"],
  }),
  entry({
    id: "task.ranking",
    domain: "tasks",
    profile: "aggregate",
    status: "partial",
    description: "The existing deterministic focus ranking.",
    tools: ["getTaskFocus"],
    supportedHistory: "Current open tasks.",
    unsupported: ["A new priority scheme", "Time estimates"],
  }),
  entry({
    id: "graph.paths",
    domain: "graph",
    profile: "aggregate",
    status: "available",
    description:
      "Native and manual relationships up to two hops, with provenance, cycle cuts and truncation.",
    tools: ["getRelationshipPaths", "getRelatedEntities"],
    supportedHistory: "Current links only.",
    unsupported: [
      "Historical links",
      "Derived relationships presented as links",
    ],
  }),
  entry({
    id: "career.applications",
    domain: "career",
    profile: "aggregate",
    status: "available",
    description:
      "Application stage and next-action date for a resolved application.",
    tools: ["getAnalystRecordDetails", "getCareerPipeline"],
    supportedHistory: "Current stage; dated application events.",
    unsupported: ["Contact details", "Salary expectations"],
  }),
  entry({
    id: "career.stage_history",
    domain: "career",
    profile: "aggregate",
    status: "partial",
    description: "Dated application events where they were recorded.",
    tools: ["getAnalystRecordDetails"],
    supportedHistory: "Recorded events only.",
    unsupported: ["Conversion rates without a dated cohort"],
  }),
  entry({
    id: "reviews.scores",
    domain: "reviews",
    profile: "aggregate",
    status: "available",
    description: "Weekly review scores.",
    tools: ["getWeeklyReviewMetrics", "getAnalystRecordDetails"],
    supportedHistory: "Completed reviews by week.",
    unsupported: ["Objective diagnosis from self-report"],
  }),
  entry({
    id: "reviews.excerpts",
    domain: "reviews",
    profile: "sensitive_narrative",
    status: "available",
    description: "Attributed excerpts of the user's own reflections.",
    tools: ["getAnalystRecordDetails"],
    supportedHistory: "Completed reviews.",
    unsupported: ["Treating a stated cause as established"],
  }),
  entry({
    id: "knowledge.reviews",
    domain: "knowledge",
    profile: "aggregate",
    status: "partial",
    description: "Recorded review counts per concept and overall.",
    tools: ["getAnalystRecordDetails", "getHistoricalMetricSeries"],
    supportedHistory: "Review counts; last review date.",
    unsupported: ["Retention or mastery"],
  }),
  entry({
    id: "decision.context",
    domain: "decisions",
    profile: "aggregate",
    status: "available",
    description:
      "Decision dates, review window, revision count and the existing deterministic before/after comparison.",
    tools: ["getDecisionAnalysisContext"],
    supportedHistory: "The existing 14-day windows around the decision date.",
    unsupported: [
      "Causal impact of a decision",
      "A success verdict without a criterion",
    ],
  }),
  entry({
    id: "decision.text",
    domain: "decisions",
    profile: "sensitive_narrative",
    status: "available",
    description:
      "Original and revised plan text and self-reported observations, attributed to the user.",
    tools: ["getDecisionAnalysisContext"],
    supportedHistory: "Every recorded revision.",
    unsupported: ["Treating an observation as proof"],
  }),
  entry({
    id: "signals.current",
    domain: "signals",
    profile: "aggregate",
    status: "partial",
    description: "Current deterministic Signals without titles or notes.",
    tools: ["getSignals"],
    supportedHistory: "Current Signals.",
    unsupported: ["Counting a Signal as independent of its source"],
  }),
  entry({
    id: "history.association",
    domain: "history",
    profile: "aggregate",
    status: "available",
    description:
      "The approved association test between two whole-domain metrics.",
    tools: ["getPatternAssociation", "getCrossDomainHistory"],
    supportedHistory: "Eleven completed months.",
    unsupported: ["Causation", "Goal-specific attribution"],
  }),
  entry({
    id: "history.trend",
    domain: "history",
    profile: "aggregate",
    status: "available",
    description:
      "One whole-domain measure month by month (recorded income, expenses, debt payments, task completions, knowledge reviews or weekly review score) over six or twelve months; ATLAS ranks the whole months, averages them, sets the latest against the months before it and counts consecutive rises or falls.",
    tools: ["getHistoricalMetricSeries"],
    supportedHistory: "Up to twelve calendar months, within the last year.",
    unsupported: [
      "Category or record-level trends",
      "Why a measure changed",
      "Forecasts",
    ],
  }),
  entry({
    id: "context.follow_up",
    domain: "history",
    profile: "aggregate",
    status: "unsupported",
    description: "Structured conversation context (AI-03).",
    tools: [],
    supportedHistory: "None yet.",
    unsupported: ["Carrying entities and assumptions between turns"],
  }),
  entry({
    id: "capture.provenance",
    domain: "timeline",
    profile: "aggregate",
    status: "unsupported",
    description:
      "Provenance of confirmed Capture records. Unconfirmed previews are never evidence.",
    tools: [],
    supportedHistory: "None.",
    unsupported: ["Unconfirmed previews", "Rejected drafts"],
  }),
  entry({
    id: "settings.preferences",
    domain: "history",
    profile: "aggregate",
    status: "unsupported",
    description: "Capacity or analysis preferences.",
    tools: [],
    supportedHistory: "None.",
    unsupported: ["Security settings", "Recovery data"],
  }),
];

/**
 * Evaluation vocabulary with no single data domain: these describe request
 * handling rather than retrieval and are governed by their own phases.
 */
export const PROCESS_CAPABILITIES: Record<string, CapabilityStatus> = {
  "policy.consent": "available",
  "policy.ownership": "available",
  "ops.budget": "partial",
  "format.style": "unsupported",
  "language.taglish": "partial",
};

export function analystCapabilities(options: {
  consent: AnalystConsent | null;
  route: ProviderRoute;
  domains?: ConsentDomain[];
  unavailableTools?: ReadonlySet<string>;
}) {
  return CAPABILITY_MANIFEST.filter(
    (item) => !options.domains || options.domains.includes(item.domain),
  ).map((item) => {
    const excluded =
      item.status !== "unsupported" &&
      eligibility(item.domain, item.profile, options.consent, options.route);
    const down =
      item.tools.length > 0 &&
      item.tools.every((tool) => options.unavailableTools?.has(tool));
    const status: CapabilityStatus = excluded
      ? "not_authorized"
      : item.status !== "unsupported" && down
        ? "temporarily_unavailable"
        : item.status;
    return {
      id: item.id,
      domain: item.domain,
      status,
      description: item.description,
      supportedHistory: item.supportedHistory,
      unsupported: item.unsupported,
      ...(excluded && { reason: excluded }),
    };
  });
}
