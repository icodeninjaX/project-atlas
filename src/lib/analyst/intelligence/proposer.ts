import { manilaToday } from "@/lib/analyst/evidence";
import type { AnalysisBrief } from "./contracts";
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
  "money.full_aggregate",
  "money.income_semantics",
  "money.aligned_comparison",
]);

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

function period(brief: AnalysisBrief, now: Date) {
  const first = brief.periods[0];
  if (first) return { from: first.from, through: first.through };
  const today = manilaToday(now);
  return { from: `${today.slice(0, 8)}01`, through: today };
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
          if (moneyCapabilities.has(capability)) {
            const kind = /\b(?:income|salary|earn\w*|kita|sahod)\b/i.test(
              requirement.question,
            )
              ? "income"
              : "expense";
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
              {
                text:
                  view.brief.unresolvedReferences[0] ??
                  view.brief.question.slice(0, 120),
                types: [type],
              },
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
