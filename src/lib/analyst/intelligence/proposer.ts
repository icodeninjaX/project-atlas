import { manilaToday } from "@/lib/analyst/evidence";
import type { AnalysisBrief, EvidenceV2 } from "./contracts";
import { requirementMoneyKind, requirementTrend } from "./planner";
import {
  assumedIncomeChange,
  debtScenario,
  referencePhrase,
} from "./references";
import type {
  InvestigationView,
  Proposal,
  Proposer,
  ToolRequest,
  ToolOutcome,
} from "./orchestrator";
import {
  V2_TOOL_LIMITS,
  parseHandle,
  type V2EntityType,
} from "./tools/contracts";

/**
 * A deterministic proposer that maps the brief's required capabilities onto
 * the V2 read tools (AI-04). It needs no model, so it is the fallback when a
 * planner call is unaffordable and the reference that a model-backed proposer
 * is evaluated against. Dependent reads follow the evidence: resolve an
 * entity, then read its context and paths, then the records those paths
 * reach. An ambiguous name stops for a clarification instead of guessing.
 */

const entityFor: Record<string, V2EntityType> = {
  "goal.resolve": "goal",
  "goal.linked_activity": "goal",
  "task.detail": "goal",
  "graph.paths": "goal",
  "decision.context": "decision",
  "decision.text": "decision",
  "career.applications": "job_application",
  "career.stage_history": "job_application",
  "knowledge.reviews": "knowledge_concept",
  "reviews.scores": "weekly_review",
  "reviews.excerpts": "weekly_review",
};
const moneyCapabilities = new Set([
  "money.totals",
  "money.category_breakdown",
  "money.category_ranking",
  "money.full_aggregate",
  "money.income_semantics",
  "money.aligned_comparison",
]);

const basisOrder = { exact: 0, mentioned: 1, contains: 2, words: 3 } as const;

function resolved(view: InvestigationView, type: V2EntityType) {
  const fromBrief = view.brief.resolvedEntities.find(
    (item) => parseHandle(item.handle)?.type === type,
  );
  if (fromBrief) return { handle: fromBrief.handle, ambiguous: null };
  const resolution = [...view.outcomes]
    .reverse()
    .find(
      (item) =>
        item.request.tool === "resolveAnalystEntities" &&
        (item.request.input as { types: string[] }).types.includes(type),
    );
  if (!resolution) return { handle: null, ambiguous: null };
  const candidates = resolution.result.candidates.filter(
    (item) => item.type === type,
  );
  if (resolution.result.ambiguous && candidates.length >= 2)
    return { handle: null, ambiguous: candidates };
  return { handle: candidates[0]?.handle ?? null, ambiguous: null };
}

function pathNodes(outcomes: ToolOutcome[], type: string) {
  return [
    ...new Set(
      outcomes.flatMap((outcome) =>
        outcome.result.evidence.flatMap((item) =>
          item.kind === "graph_path"
            ? item.path
                .filter((step) => step.type === type)
                .map((step) => step.handle)
            : [],
        ),
      ),
    ),
  ].filter((handle) => parseHandle(handle));
}

/** The search phrase for a record of `type`: its name, never the sentence. */
function searchPhrase(brief: AnalysisBrief, type: V2EntityType) {
  return (
    referencePhrase(brief.question, type) ??
    brief.unresolvedReferences[0] ??
    brief.question.slice(0, 120)
  );
}

/**
 * Whether the brief names one application: a phrase in the question, or a
 * reference that is neither the whole question nor another record's name.
 */
function namedApplication(brief: AnalysisBrief) {
  if (referencePhrase(brief.question, "job_application")) return true;
  const others = (["goal", "decision", "debt", "knowledge_concept"] as const)
    .map((type) => referencePhrase(brief.question, type))
    .filter(Boolean);
  return brief.unresolvedReferences.some(
    (item) => item !== brief.question.slice(0, 120) && !others.includes(item),
  );
}

function period(brief: AnalysisBrief, now: Date) {
  const first = brief.periods[0];
  if (first) return { from: first.from, through: first.through };
  const today = manilaToday(now);
  return { from: `${today.slice(0, 8)}01`, through: today };
}

/** The first day of the month `months - 1` months before `day`'s month. */
function monthStart(day: string, months: number) {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7)) - (months - 1);
  return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
}

/** Months a series reads when the question names no window. */
const SERIES_MONTHS = 6;

/**
 * The window a month-by-month query reads: from the earliest period through
 * the latest. Without a window the person named, it reaches back over the
 * last six months, so there are whole months to set the latest against.
 */
function monthSpan(
  periods: ReadonlyArray<{
    from: string;
    through: string;
    basis?: AnalysisBrief["periods"][number]["basis"];
  }>,
) {
  const through = periods
    .map((item) => item.through)
    .reduce((a, b) => (a > b ? a : b));
  const earliest = periods
    .map((item) => item.from)
    .reduce((a, b) => (a < b ? a : b));
  const stated = periods.some((item) => item.basis !== "disclosed_default");
  const series = monthStart(through, SERIES_MONTHS);
  return {
    from: stated || earliest < series ? earliest : series,
    through,
  };
}

type Period = { from: string; through: string };

/** Leading categories whose months a change-drivers read follows. */
export const DRIVER_CATEGORIES = 2;

/**
 * The categories that moved most in the direction of the total's change
 * between two complete breakdowns, largest first. Records without a
 * category cannot be read on their own, so they are never a driver.
 */
export function changeDrivers(
  kind: "expense" | "income",
  now: EvidenceV2[],
  before: EvidenceV2[],
) {
  const totals = (items: EvidenceV2[]) => {
    const members = new Map<string, number>();
    let total: number | null = null;
    for (const item of items) {
      if (
        item.kind !== "metric" ||
        item.semantics.metricKey !== `${kind}_centavos`
      )
        continue;
      if (item.scope.id === `whole_domain:${kind}`) total = item.value;
      const member = item.scope.cohort?.member;
      if (
        item.scope.cohort?.setId === `${kind}_by_category` &&
        member?.startsWith("category:")
      )
        members.set(member, item.value);
    }
    return { total, members };
  };
  const current = totals(now);
  const previous = totals(before);
  if (current.total === null || previous.total === null) return [];
  const direction = Math.sign(current.total - previous.total);
  if (direction === 0) return [];
  return [...new Set([...current.members.keys(), ...previous.members.keys()])]
    .map((member) => ({
      member,
      change:
        ((current.members.get(member) ?? 0) -
          (previous.members.get(member) ?? 0)) *
        direction,
    }))
    .filter((item) => item.change > 0)
    .sort((a, b) => b.change - a.change || a.member.localeCompare(b.member))
    .slice(0, DRIVER_CATEGORIES)
    .map((item) => item.member);
}

export function capabilityProposer(now: Date): Proposer {
  return {
    provider: null,
    propose(view): Proposal {
      const requests = new Map<string, ToolRequest>();
      const add = (tool: string, input: unknown, requirementId: string) => {
        const key = JSON.stringify([tool, input]);
        const existing = requests.get(key);
        if (existing)
          existing.requirementIds = [
            ...new Set([...existing.requirementIds, requirementId]),
          ];
        else
          requests.set(key, { tool, input, requirementIds: [requirementId] });
      };
      const asked = (tool: string) =>
        view.outcomes.some((item) => item.request.tool === tool);
      const open = view.progress.filter(
        (item) => item.state === "missing" || item.state === "partial",
      );
      for (const progress of open) {
        const requirement = view.brief.requirements.find(
          (item) => item.id === progress.requirementId,
        )!;
        for (const capability of requirement.evidenceNeeded) {
          // Whole-domain questions are answered by the existing aggregate
          // tools, which need no resolved record.
          const aggregate: Record<string, string> = {
            "task.ranking": "getTaskFocus",
            "goal.overview": "getGoalProgress",
            "reviews.scores": "getWeeklyReviewMetrics",
            "signals.current": "getSignals",
          };
          if (aggregate[capability]) {
            add(aggregate[capability]!, {}, requirement.id);
            continue;
          }
          // A trend reads its measure month by month through today, starting
          // on the first day of the earliest month.
          if (capability === "history.trend") {
            const trend = requirementTrend(requirement);
            if (!trend) continue;
            const today = manilaToday(now);
            add(
              "getHistoricalMetricSeries",
              {
                from: monthStart(today, trend.months),
                through: today,
                metric: trend.metric,
                grain: "month",
              },
              requirement.id,
            );
            continue;
          }
          if (capability === "debt.payments") {
            const window = period(view.brief, now);
            add("getDebtProgress", {}, requirement.id);
            add("getDebtPayments", window, requirement.id);
            continue;
          }
          if (
            capability === "career.applications" &&
            !namedApplication(view.brief) &&
            !resolved(view, "job_application").handle
          ) {
            add("getCareerPipeline", {}, requirement.id);
            continue;
          }
          if (capability === "debt.scenario") {
            // A stated change, or one the user confirmed in this conversation.
            const confirmed = assumedIncomeChange(view.brief.assumptions);
            const scenario =
              debtScenario(view.brief.question) ??
              (confirmed === null
                ? null
                : {
                    extraMonthlyPesos: [],
                    incomeChangePercent: confirmed,
                    oneTimePayoff: false,
                  });
            if (!scenario) {
              add("getRunway", {}, requirement.id);
              continue;
            }
            // A one-time payoff is outside the runway engine; nothing is
            // read and the requirement stays unanswered with its reason.
            if (
              scenario.extraMonthlyPesos.length === 0 &&
              scenario.incomeChangePercent === null
            )
              continue;
            const income =
              scenario.incomeChangePercent === null
                ? {}
                : { monthlyIncomeChangePercent: scenario.incomeChangePercent };
            const unchanged = {
              monthlyIncomePesos: null,
              ...income,
              monthlyExpenseChangePesos: null,
              oneTimePurchasePesos: null,
            };
            if (scenario.extraMonthlyPesos.length === 0) {
              add(
                "compareFinancialScenarios",
                { alternatives: [{ ...unchanged, extraDebtPayment: null }] },
                requirement.id,
              );
              continue;
            }
            // Extra payments apply to one resolved debt, never a guess.
            const debt = resolved(view, "debt");
            if (debt.ambiguous)
              return {
                requests: [],
                clarification: { candidates: debt.ambiguous },
              };
            if (!debt.handle) {
              const triedDebt = view.outcomes.some(
                (item) =>
                  item.request.tool === "resolveAnalystEntities" &&
                  (item.request.input as { types: string[] }).types.includes(
                    "debt",
                  ),
              );
              if (!triedDebt)
                add(
                  "resolveAnalystEntities",
                  {
                    text:
                      referencePhrase(view.brief.question, "debt") ?? "debt",
                    types: ["debt"],
                  },
                  requirement.id,
                );
              continue;
            }
            const debtId = parseHandle(debt.handle)!.id;
            add(
              "compareFinancialScenarios",
              {
                alternatives: scenario.extraMonthlyPesos.map((amountPesos) => ({
                  ...unchanged,
                  extraDebtPayment: { debtId, amountPesos },
                })),
              },
              requirement.id,
            );
            continue;
          }
          // A named goal's pace, once it resolves; otherwise the active
          // goals with the soonest target dates.
          if (capability === "goal.pace") {
            const named =
              referencePhrase(view.brief.question, "goal") ??
              (view.brief.resolvedEntities.some(
                (item) => parseHandle(item.handle)?.type === "goal",
              )
                ? "named"
                : null);
            if (!named) {
              add("getGoalPace", {}, requirement.id);
              continue;
            }
            const { handle, ambiguous } = resolved(view, "goal");
            if (ambiguous)
              return { requests: [], clarification: { candidates: ambiguous } };
            if (handle) {
              add("getGoalPace", { goal: handle }, requirement.id);
              continue;
            }
            const tried = view.outcomes.some(
              (item) =>
                item.request.tool === "resolveAnalystEntities" &&
                (item.request.input as { types: string[] }).types.includes(
                  "goal",
                ),
            );
            add(
              tried ? "getGoalPace" : "resolveAnalystEntities",
              tried ? {} : { text: named, types: ["goal"] },
              requirement.id,
            );
            continue;
          }
          if (capability === "money.change_drivers") {
            const kind = requirementMoneyKind(requirement);
            const [current, previous] = view.brief.periods
              .map(({ from, through }): Period => ({ from, through }))
              .sort((a, b) => b.from.localeCompare(a.from));
            const read = (item: Period) =>
              view.outcomes.find((outcome) => {
                const input = outcome.request.input as Partial<
                  Period & { kind: string }
                >;
                return (
                  outcome.request.tool === "getMoneyBreakdown" &&
                  outcome.result.status !== "error" &&
                  input.from === item.from &&
                  input.through === item.through &&
                  input.kind === kind
                );
              });
            if (view.brief.periods.length !== 2 || !current || !previous)
              continue;
            const latest = read(current);
            const earlier = read(previous);
            if (!latest || !earlier) {
              for (const item of [current, previous])
                if (!read(item))
                  add(
                    "getMoneyBreakdown",
                    { from: item.from, through: item.through, kind },
                    requirement.id,
                  );
              continue;
            }
            // Each leading category's months, over the last six through the
            // current period's end.
            for (const category of changeDrivers(
              kind,
              latest.result.evidence,
              earlier.result.evidence,
            ))
              add(
                "queryTransactions",
                {
                  from: monthStart(current.through, SERIES_MONTHS),
                  through: current.through,
                  kind,
                  groupBy: "month",
                  measures: ["total"],
                  categories: [category],
                  minAmountPesos: null,
                  maxAmountPesos: null,
                },
                requirement.id,
              );
            continue;
          }
          if (capability === "money.query") {
            const spec = requirement.transactionQuery;
            if (!spec) continue;
            let categories: string[] = [];
            if (spec.category) {
              // The category phrase is resolved among the owner's categories
              // first; the query then reads only those.
              const phrase = spec.category;
              const resolution = view.outcomes.find(
                (item) =>
                  item.request.tool === "resolveAnalystEntities" &&
                  (item.request.input as { text: string }).text === phrase,
              );
              if (!resolution) {
                add(
                  "resolveAnalystEntities",
                  { text: phrase, types: ["category"] },
                  requirement.id,
                );
                continue;
              }
              const found = resolution.result.candidates.filter(
                (item) => item.type === "category",
              );
              // Several equally good matches ("food" and "food delivery")
              // are all read; the answer names each one.
              const best = Math.min(
                ...found.map((item) => basisOrder[item.basis]),
              );
              categories = found
                .filter((item) => basisOrder[item.basis] === best)
                .slice(0, V2_TOOL_LIMITS.queryCategories)
                .map((item) => item.handle);
              // No such category: nothing is read, and the answer says so.
              if (categories.length === 0) continue;
            }
            const periods = view.brief.periods.length
              ? view.brief.periods
              : [
                  {
                    ...period(view.brief, now),
                    basis: "disclosed_default" as const,
                  },
                ];
            // Grouped by month, one read spans every period: the months are
            // the comparison.
            for (const item of spec.groupBy === "month"
              ? [monthSpan(periods)]
              : periods)
              add(
                "queryTransactions",
                {
                  from: item.from,
                  through: item.through,
                  kind: spec.kind,
                  groupBy: spec.groupBy,
                  measures: spec.measures,
                  categories,
                  minAmountPesos: spec.minAmountPesos,
                  maxAmountPesos: spec.maxAmountPesos,
                },
                requirement.id,
              );
            continue;
          }
          if (moneyCapabilities.has(capability)) {
            const kind = requirementMoneyKind(requirement);
            const periods = view.brief.periods.length
              ? view.brief.periods
              : [{ ...period(view.brief, now) }];
            for (const item of periods)
              add(
                "getMoneyBreakdown",
                { from: item.from, through: item.through, kind },
                requirement.id,
              );
            continue;
          }
          // A decision related to a goal is found through the goal's paths.
          if (capability.startsWith("decision.")) {
            const direct = view.brief.resolvedEntities.find(
              (item) => parseHandle(item.handle)?.type === "decision",
            );
            const goal = resolved(view, "goal").handle;
            const goalInvolved = view.brief.requirements.some((item) =>
              item.evidenceNeeded.some((id) => entityFor[id] === "goal"),
            );
            // Wait for the goal to resolve rather than guessing a decision by name.
            if (!direct && !goal && goalInvolved) continue;
            if (!direct && goal) {
              const decisions = pathNodes(view.outcomes, "decision");
              if (decisions.length === 0 && !asked("getRelationshipPaths"))
                add(
                  "getRelationshipPaths",
                  { start: goal, depth: 2 },
                  requirement.id,
                );
              for (const decision of decisions.slice(0, 2))
                add(
                  "getDecisionAnalysisContext",
                  { decision, includeText: capability === "decision.text" },
                  requirement.id,
                );
              continue;
            }
          }
          const type = entityFor[capability];
          if (!type) continue;
          const { handle, ambiguous } = resolved(view, type);
          if (ambiguous)
            return { requests: [], clarification: { candidates: ambiguous } };
          if (!handle) {
            add(
              "resolveAnalystEntities",
              { text: searchPhrase(view.brief, type), types: [type] },
              requirement.id,
            );
            continue;
          }
          const window = period(view.brief, now);
          switch (capability) {
            case "goal.linked_activity":
              add(
                "getGoalAnalysisContext",
                { goal: handle, ...window },
                requirement.id,
              );
              break;
            case "graph.paths":
              add(
                "getRelationshipPaths",
                { start: handle, depth: 2 },
                requirement.id,
              );
              break;
            case "task.detail": {
              const tasks = pathNodes(view.outcomes, "task");
              if (tasks.length === 0 && !asked("getRelationshipPaths"))
                add(
                  "getRelationshipPaths",
                  { start: handle, depth: 1 },
                  requirement.id,
                );
              else if (tasks.length > 0)
                add(
                  "getAnalystRecordDetails",
                  { handles: tasks.slice(0, V2_TOOL_LIMITS.detailHandles) },
                  requirement.id,
                );
              break;
            }
            case "decision.context":
            case "decision.text":
              add(
                "getDecisionAnalysisContext",
                {
                  decision: handle,
                  includeText: capability === "decision.text",
                },
                requirement.id,
              );
              break;
            case "goal.resolve":
              break;
            default:
              add(
                "getAnalystRecordDetails",
                { handles: [handle] },
                requirement.id,
              );
          }
        }
      }
      return { requests: [...requests.values()] };
    },
  };
}
