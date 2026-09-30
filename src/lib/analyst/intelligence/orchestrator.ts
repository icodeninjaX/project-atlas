import { CAPABILITY_MANIFEST } from "./capabilities";
import {
  RunLedger,
  RUN_BUDGETS,
  type BudgetRefusal,
  type RunBudget,
  type RunPath,
} from "./budgets";
import type { BriefCheck, RequirementReadiness } from "./brief";
import type { AnalysisBrief, EvidenceV2, UnresolvedReason } from "./contracts";
import { selectEvidence, type Selection } from "./evidence";
import { DRIVER_CATEGORIES } from "./proposer";
import {
  parseHandle,
  v2ToolInputs,
  type EntityCandidate,
  type OwnerLabel,
  type V2ToolName,
  type V2ToolResult,
} from "./tools/contracts";

/**
 * The bounded investigative controller (AI-04). A proposer suggests the next
 * tool calls; the server decides whether each one is valid, material and
 * affordable. Calls in one round run concurrently; a call that needs an
 * earlier result can only be proposed in a later round, after that result
 * is validated. The loop stops when every supported essential requirement
 * has evidence, when nothing new is proposed or learned, when a clarification
 * is needed, or when the budget or deadline would eat into the capacity
 * reserved for writing and checking the answer. It never invents evidence:
 * exhaustion returns a typed partial result.
 */

export type ToolRequest = {
  tool: string;
  input: unknown;
  /** The requirements this call is meant to serve. */
  requirementIds: string[];
};

export type Proposal = {
  requests: ToolRequest[];
  /** The proposer found the essential entity ambiguous. */
  clarification?: { candidates: EntityCandidate[] } | null;
  /** Provider usage for a model-backed proposer; null when unknown. */
  providerUsage?: {
    tokens: number | null;
    costUsdMicros: number | null;
  } | null;
};

export type ToolOutcome = {
  round: number;
  request: ToolRequest & { tool: V2ToolName };
  result: V2ToolResult;
};

export type RequirementProgress = {
  requirementId: string;
  essential: boolean;
  state: "evidenced" | "partial" | "missing" | "blocked";
  reason: UnresolvedReason | null;
};

export type InvestigationView = {
  brief: AnalysisBrief;
  round: number;
  outcomes: ToolOutcome[];
  progress: RequirementProgress[];
  knownHandles: ReadonlySet<string>;
};

export type Proposer = {
  /** Whether each proposal costs a provider call, and its reserved size. */
  provider: { tokens: number; costUsdMicros: number } | null;
  propose(view: InvestigationView): Proposal | Promise<Proposal>;
};

export type RejectedRequest = {
  round: number;
  tool: string;
  reason:
    | "not_allowlisted"
    | "invalid_input"
    | "unknown_handle"
    | "unknown_requirement"
    | "not_material"
    | "blocked_requirement"
    | "duplicate"
    | "over_call_budget";
};

export type StopReason =
  | "sufficient"
  | "clarification_required"
  | "no_proposals"
  | "no_progress"
  | BudgetRefusal;

export type InvestigationResult = {
  status:
    | "ready"
    | "partial"
    | "insufficient"
    | "clarification_required"
    | "cancelled";
  stopReason: StopReason;
  path: RunBudget["path"];
  brief: AnalysisBrief;
  progress: RequirementProgress[];
  unresolved: Array<{ requirementId: string; reason: UnresolvedReason }>;
  selection: Selection;
  labels: OwnerLabel[];
  candidates: EntityCandidate[];
  outcomes: ToolOutcome[];
  rejected: RejectedRequest[];
  usage: RunLedger["usage"];
  remainingForAnswer: ReturnType<RunLedger["remainingForAnswer"]>;
  /** Reads are not atomic; each source keeps its own retrieval time. */
  asOf: {
    startedAt: string;
    sources: Array<{
      tool: string;
      round: number;
      retrievedAt: string | null;
      status: string;
    }>;
  };
  limitations: string[];
};

const toolsFor = new Map(
  CAPABILITY_MANIFEST.map((item) => [item.id, new Set(item.tools)]),
);
/**
 * Capabilities whose approved tools include a step that does not answer
 * them: a transaction query may resolve a category first, but only the
 * query itself reads the figures.
 */
const answeredBy = new Map<string, ReadonlySet<string>>([
  ["money.query", new Set(["queryTransactions"])],
  // The breakdowns only find the leading categories; their months answer.
  ["money.change_drivers", new Set(["queryTransactions"])],
]);
/**
 * Capabilities answered only when every read made for them succeeded: each
 * change-drivers read is one leading category's months, so one failed read
 * leaves the answer without that category.
 */
const EVERY_READ = new Set(["money.change_drivers"]);

/**
 * Change drivers add one month series per leading category (six months and
 * the query total each). They get their own room, so the breakdowns they
 * explain keep the room they had and stay complete.
 */
export const DRIVER_ROOM = {
  items: DRIVER_CATEGORIES * 7,
  bytes: DRIVER_CATEGORIES * 7 * 2_500,
};

/** How much evidence a run keeps for the writer. */
export function selectionLimits(brief: AnalysisBrief, path: RunPath) {
  const base =
    path === "deep"
      ? { items: 40, bytes: 60_000 }
      : { items: 20, bytes: 30_000 };
  const drivers = brief.requirements.some((item) =>
    item.evidenceNeeded.includes("money.change_drivers"),
  );
  return drivers
    ? {
        items: base.items + DRIVER_ROOM.items,
        bytes: base.bytes + DRIVER_ROOM.bytes,
      }
    : base;
}

const answers = (capability: string, tool: string) =>
  (answeredBy.get(capability) ?? toolsFor.get(capability)!).has(tool);

function handlesIn(input: unknown): string[] {
  if (!input || typeof input !== "object") return [];
  const record = input as Record<string, unknown>;
  return [
    ...["goal", "decision", "start"].flatMap((key) =>
      typeof record[key] === "string" ? [record[key] as string] : [],
    ),
    ...["handles", "categories"].flatMap((key) =>
      Array.isArray(record[key])
        ? (record[key] as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    ),
  ];
}

/** Handles this run may use: the brief's authorized entities and what tools returned. */
function knownHandles(brief: AnalysisBrief, outcomes: ToolOutcome[]) {
  const known = new Set(brief.resolvedEntities.map((item) => item.handle));
  for (const { result } of outcomes) {
    for (const item of result.candidates) known.add(item.handle);
    for (const item of result.labels) known.add(item.handle);
    for (const item of result.evidence) {
      for (const ref of item.provenance.sourceRefs)
        if (parseHandle(ref.handle)) known.add(ref.handle);
      if (item.kind === "graph_path")
        for (const step of item.path)
          if (parseHandle(step.handle)) known.add(step.handle);
      if (
        item.kind === "record_fact" &&
        typeof item.value === "string" &&
        parseHandle(item.value)
      )
        known.add(item.value);
    }
  }
  return known;
}

function assess(
  brief: AnalysisBrief,
  readiness: RequirementReadiness[],
  outcomes: ToolOutcome[],
): RequirementProgress[] {
  return brief.requirements.map((requirement) => {
    const ready = readiness.find(
      (item) => item.requirementId === requirement.id,
    );
    if (ready && ready.state !== "supported")
      return {
        requirementId: requirement.id,
        essential: requirement.essential,
        state: "blocked",
        reason: ready.reason,
      };
    const mine = outcomes.filter((item) =>
      item.request.requirementIds.includes(requirement.id),
    );
    const useful = (outcome: ToolOutcome) =>
      outcome.result.status !== "error" &&
      (outcome.result.evidence.length > 0 ||
        (outcome.request.tool === "resolveAnalystEntities" &&
          outcome.result.candidates.length > 0 &&
          !outcome.result.ambiguous));
    const capabilities = requirement.evidenceNeeded.filter((id) =>
      toolsFor.has(id),
    );
    const satisfied = (capability: string) =>
      mine.some(
        (outcome) =>
          useful(outcome) && answers(capability, outcome.request.tool),
      );
    // Each capability needs one complete read; a bounded read that was cut
    // short still counts once a complete read covers the same capability.
    const readyFor = (capability: string) => {
      const reads = mine.filter((outcome) =>
        answers(capability, outcome.request.tool),
      );
      const ready = (outcome: ToolOutcome) =>
        useful(outcome) && outcome.result.status === "ready";
      return EVERY_READ.has(capability)
        ? reads.length > 0 && reads.every(ready)
        : reads.some(ready);
    };
    const complete =
      capabilities.length > 0
        ? capabilities.every(readyFor)
        : mine
            .filter(useful)
            .some((outcome) => outcome.result.status === "ready");
    const covered =
      capabilities.length > 0
        ? capabilities.every(satisfied)
        : mine.some(useful);
    const some =
      capabilities.length > 0 ? capabilities.some(satisfied) : covered;
    // A read that errored leaves the answer unknown, so it is never
    // reported as missing records (roadmap §9.5). `unavailable_source` also
    // covers a database outage, since the shared transport cannot tell the
    // two apart; the wording discloses nothing about whether a record exists.
    const failed = mine.some(
      (outcome) =>
        outcome.result.status === "error" &&
        outcome.result.error?.code !== "partial",
    );
    const state =
      covered && complete
        ? "evidenced"
        : some || covered
          ? "partial"
          : "missing";
    return {
      requirementId: requirement.id,
      essential: requirement.essential,
      state,
      reason:
        state === "evidenced"
          ? null
          : failed
            ? "operational_failure"
            : "insufficient_evidence",
    };
  });
}

export async function runInvestigation(input: {
  check: Extract<BriefCheck, { ok: true }>;
  proposer: Proposer;
  invoke: (tool: V2ToolName, input: unknown) => Promise<V2ToolResult>;
  clock?: () => number;
  signal?: AbortSignal;
  budget?: RunBudget;
  selection?: { items: number; bytes: number };
  /** One ledger for the whole request, shared with the answer stages. */
  ledger?: RunLedger;
  /** Reports each round as it starts: tool names only, never inputs. */
  onRound?: (round: number, tools: V2ToolName[]) => void;
}): Promise<InvestigationResult> {
  const { brief, readiness } = input.check;
  const budget = input.budget ?? RUN_BUDGETS[input.check.path];
  const ledger =
    input.ledger ?? new RunLedger(budget, input.clock, input.signal);
  const startedAt = new Date(input.clock?.() ?? Date.now()).toISOString();
  const outcomes: ToolOutcome[] = [];
  const rejected: RejectedRequest[] = [];
  const signatures = new Set<string>();
  let progress = assess(brief, readiness, outcomes);
  let stopReason: StopReason | null = null;
  let clarification: EntityCandidate[] | null = null;
  const requirementIds = new Set(brief.requirements.map((item) => item.id));

  for (let round = 1; stopReason === null; round += 1) {
    const open = progress.filter(
      (item) => item.state !== "evidenced" && item.state !== "blocked",
    );
    // Once the essentials are answered, an optional requirement keeps
    // reading only while its last step succeeded (a breakdown read before the
    // categories it names), so a dependent read is not cut off after one step.
    const advancing = open.some((item) =>
      outcomes.some(
        (outcome) =>
          outcome.round === round - 1 &&
          outcome.result.status !== "error" &&
          outcome.request.requirementIds.includes(item.requirementId),
      ),
    );
    const essentialOpen = open.some((item) => item.essential);
    if (!essentialOpen && (open.length === 0 || (round > 1 && !advancing))) {
      stopReason = "sufficient";
      break;
    }
    // A model-backed proposer spends a provider call; it must fit outside the reserve.
    if (input.proposer.provider) {
      const refusal = ledger.canCallProvider(
        input.proposer.provider.tokens,
        input.proposer.provider.costUsdMicros,
      );
      if (refusal) {
        stopReason = refusal;
        break;
      }
    }
    const known = knownHandles(brief, outcomes);
    const proposal = await input.proposer.propose({
      brief,
      round,
      outcomes: [...outcomes],
      progress,
      knownHandles: known,
    });
    if (input.proposer.provider)
      ledger.recordProvider(
        proposal.providerUsage ?? { tokens: null, costUsdMicros: null },
        input.proposer.provider,
      );
    if (
      proposal.clarification &&
      proposal.clarification.candidates.length >= 2
    ) {
      clarification = proposal.clarification.candidates;
      stopReason = "clarification_required";
      break;
    }
    const openIds = new Set(open.map((item) => item.requirementId));
    const blocked = new Set(
      progress
        .filter((item) => item.state === "blocked")
        .map((item) => item.requirementId),
    );
    const accepted: Array<ToolRequest & { tool: V2ToolName }> = [];
    for (const request of proposal.requests) {
      const reject = (reason: RejectedRequest["reason"]) =>
        rejected.push({ round, tool: request.tool, reason });
      if (!Object.hasOwn(v2ToolInputs, request.tool)) {
        reject("not_allowlisted");
        continue;
      }
      const tool = request.tool as V2ToolName;
      if (!v2ToolInputs[tool].safeParse(request.input).success) {
        reject("invalid_input");
        continue;
      }
      if (
        request.requirementIds.length === 0 ||
        request.requirementIds.some((id) => !requirementIds.has(id))
      ) {
        reject("unknown_requirement");
        continue;
      }
      if (request.requirementIds.every((id) => blocked.has(id))) {
        reject("blocked_requirement");
        continue;
      }
      // Retrieval is only for a requirement that still lacks evidence.
      if (!request.requirementIds.some((id) => openIds.has(id))) {
        reject("not_material");
        continue;
      }
      if (handlesIn(request.input).some((handle) => !known.has(handle))) {
        reject("unknown_handle");
        continue;
      }
      const signature = JSON.stringify([
        tool,
        v2ToolInputs[tool].parse(request.input),
      ]);
      if (signatures.has(signature)) {
        reject("duplicate");
        continue;
      }
      signatures.add(signature);
      accepted.push({ ...request, tool });
    }
    if (accepted.length === 0) {
      // Nothing more for optional requirements after the essentials are
      // answered is the normal end of the investigation.
      stopReason =
        !essentialOpen && round > 1
          ? "sufficient"
          : proposal.requests.length === 0
            ? "no_proposals"
            : "no_progress";
      break;
    }
    const room = budget.toolCalls - ledger.usage.toolCalls;
    if (accepted.length > room) {
      for (const request of accepted.slice(Math.max(room, 0)))
        rejected.push({
          round,
          tool: request.tool,
          reason: "over_call_budget",
        });
      accepted.splice(Math.max(room, 0));
    }
    const refusal =
      accepted.length === 0
        ? "tool_calls"
        : ledger.canStartRound(accepted.length);
    if (refusal) {
      stopReason = refusal;
      break;
    }
    ledger.recordRound(accepted.length);
    input.onRound?.(
      round,
      accepted.map((request) => request.tool),
    );
    const before = outcomes.reduce(
      (sum, item) =>
        sum + item.result.evidence.length + item.result.candidates.length,
      0,
    );
    const results = await Promise.all(
      accepted.map((request) => input.invoke(request.tool, request.input)),
    );
    results.forEach((result, index) => {
      ledger.recordTool(
        result.metadata.queries,
        Buffer.byteLength(JSON.stringify(result.evidence)),
      );
      outcomes.push({ round, request: accepted[index]!, result });
    });
    const previous = progress;
    progress = assess(brief, readiness, outcomes);
    const after = outcomes.reduce(
      (sum, item) =>
        sum + item.result.evidence.length + item.result.candidates.length,
      0,
    );
    if (
      after === before &&
      JSON.stringify(previous) === JSON.stringify(progress)
    )
      stopReason = "no_progress";
    if (input.signal?.aborted) stopReason = "cancelled";
  }

  const retrieved = outcomes.flatMap((outcome) =>
    outcome.result.evidence.map((evidence) => ({
      evidence,
      requirementIds: outcome.request.requirementIds,
    })),
  );
  const limits = input.selection ?? selectionLimits(brief, budget.path);
  const selection = selectEvidence(brief, retrieved, limits);
  const essential = progress.filter((item) => item.essential);
  const unresolved = progress.flatMap((item) =>
    item.state === "evidenced"
      ? []
      : [
          {
            requirementId: item.requirementId,
            reason: item.reason ?? "insufficient_evidence",
          },
        ],
  );
  const status: InvestigationResult["status"] =
    stopReason === "cancelled"
      ? "cancelled"
      : stopReason === "clarification_required"
        ? "clarification_required"
        : essential.every((item) => item.state === "evidenced")
          ? "ready"
          : progress.some(
                (item) =>
                  item.state === "evidenced" || item.state === "partial",
              )
            ? "partial"
            : "insufficient";
  const labels = new Map<string, OwnerLabel>();
  for (const { result } of outcomes)
    for (const label of result.labels) labels.set(label.handle, label);
  const limitations = [
    ...new Set([
      ...selection.limitations,
      ...outcomes.flatMap((item) => item.result.limitations),
    ]),
  ];
  if (outcomes.length > 1)
    limitations.push(
      "Sources were read one after another, not as one snapshot; each keeps its own retrieval time.",
    );
  return {
    status,
    stopReason: stopReason ?? "sufficient",
    path: budget.path,
    brief,
    progress,
    unresolved,
    selection,
    labels: [...labels.values()],
    candidates: clarification ?? [],
    outcomes,
    rejected,
    usage: ledger.usage,
    remainingForAnswer: ledger.remainingForAnswer(),
    asOf: {
      startedAt,
      sources: outcomes.map((item) => ({
        tool: item.request.tool,
        round: item.round,
        retrievedAt: item.result.evidence[0]?.time.retrievedAt ?? null,
        status: item.result.status,
      })),
    },
    limitations,
  };
}

export type { EvidenceV2 };
