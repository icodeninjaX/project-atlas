import { manilaToday } from "@/lib/analyst/evidence";
import {
  AI_MODELS,
  ANALYST_MODEL_OPTIONS,
  type AnalystModelId,
} from "@/lib/ai/models";
import { freePoolFor } from "@/lib/ai/pools";
import { checkBrief } from "./brief";
import type { RunDiagnostics } from "./diagnostics";
import {
  memorySuggestion,
  promptPriorities,
  relatedMemoryIds,
  type Memory,
} from "./memory";
import {
  FOLLOW_UP_BUDGET,
  FOLLOW_UP_MIN_REMAINING_MS,
  PLANNER_BUDGET,
  RUN_BUDGETS,
  RunLedger,
} from "./budgets";
import { analystCapabilities } from "./capabilities";
import {
  historyTurns,
  newConversation,
  openContext,
  reauthorizeContext,
  sealContext,
  type ConversationContext,
} from "./context";
import type {
  AnswerV2,
  ConsentDomain,
  EvidenceV2,
  ResultStatus,
} from "./contracts";
import { autoDerive } from "./derive";
import { suggestFollowUpsV2, type FollowUp } from "./follow-ups";
import { detectStyle, explicitStyle } from "./language";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import type { AnalystConsent, ProviderRoute } from "./policy";
import {
  planAnalysis,
  plannerCatalog,
  requestedRequirements,
  type AnalysisPlan,
} from "./planner";
import { presentAnswer, type Presentation } from "./presentation";
import { safeProgress, type V2ProgressEvent } from "./progress";
import { capabilityProposer } from "./proposer";
import type { StageCaller } from "./stages";
import { REVIEW_LIMITS } from "./review";
import { synthesizeAnswer, type FollowUpResult } from "./synthesis";
import { WRITER_LIMITS, writerTimeoutMs } from "./writer";
import { LEGACY_TOOL_DOMAINS } from "./legacy-evidence";
import {
  BRIDGED_TOOLS,
  ENTITY_DOMAINS,
  parseHandle,
  type BridgedTool,
  type V2ToolName,
  type V2ToolResult,
} from "./tools/contracts";
import {
  INCOME_CHANGE_KEY,
  PROPOSED_INCOME_CHANGE_PERCENT,
  assumedIncomeChange,
  vagueIncomeDrop,
} from "./references";
import {
  applyTurn,
  askAssumption,
  classifyTurn,
  recordAnswer,
  topicDomains,
} from "./turns";

/**
 * One Analyst V2 request, end to end (AI-06): open and re-authorize the
 * conversation context, interpret the turn, build the brief and let the
 * analysis planner (when configured) extend it, check it, investigate within
 * one run budget, synthesize and check the answer, present it, suggest
 * follow-ups and seal the next context. Every external effect is injected,
 * so the whole path runs against fixtures in tests.
 */

export type V2RunDeps = {
  invoke: (tool: V2ToolName, input: unknown) => Promise<V2ToolResult>;
  authorize: (handles: string[]) => Promise<ReadonlySet<string>>;
  stageCaller: (ledger: RunLedger) => StageCaller;
  contextKey: Buffer | null;
  now: () => Date;
  clock: () => number;
  emit?: (event: V2ProgressEvent) => void;
  signal?: AbortSignal;
  /** Receives the run ledger, so usage can be settled even if the run throws. */
  onLedger?: (ledger: RunLedger) => void;
  /**
   * The model that plans the analysis before retrieval. Without one the
   * brief stays deterministic, exactly as before the planner existed.
   */
  planModel?: string | null;
};

export type V2RunInput = {
  ownerId: string;
  question: string;
  contextToken: string | null;
  model: AnalystModelId;
  consent: AnalystConsent;
  route: ProviderRoute;
  /** Priorities the person saved, current ones only. */
  memories?: Memory[];
};

type ModelRecord = { requested: string; resolved: string | null };

export type V2Response = {
  version: "2";
  status: ResultStatus;
  presentation: Presentation;
  candidates: Array<{ handle: string; label: string }>;
  suggestions: FollowUp[];
  models: {
    planner: ModelRecord;
    writer: ModelRecord | null;
    reviewer: ModelRecord | null;
    fallback: boolean;
  };
  context: string | null;
  contextNotice: string | null;
  /** For the request's quota record; never shown. */
  outcome:
    | "success"
    | "insufficient"
    | "provider_error"
    | "pool_exhausted"
    | "timeout";
  usage: RunLedger["usage"];
  /** A priority this question stated, offered to the person for saving. */
  memorySuggestion?: string | null;
  /** Saved priorities this question bore on; kept on the server. */
  relatedMemoryIds?: string[];
  /** How the run went, in codes only; kept on the server. */
  diagnostics?: Omit<RunDiagnostics, "durationMs">;
};

const toolDomains: Record<V2ToolName, ConsentDomain[]> = {
  resolveAnalystEntities: [],
  searchAnalystRecords: [],
  // Each inventory item carries its own area, filtered by consent.
  getDataInventory: [],
  getAnalystRecordDetails: [],
  getMoneyBreakdown: ["money"],
  queryTransactions: ["money"],
  getGoalAnalysisContext: ["goals"],
  getDecisionAnalysisContext: ["decisions"],
  getRelationshipPaths: ["graph"],
  ...(Object.fromEntries(
    BRIDGED_TOOLS.map((tool) => [tool, [LEGACY_TOOL_DOMAINS[tool]]]),
  ) as Record<BridgedTool, ConsentDomain[]>),
};

const label = (id: string) =>
  ANALYST_MODEL_OPTIONS.find((option) => option.id === id)?.label ?? id;

const noticeFor: Record<string, string> = {
  expired: "The earlier conversation expired, so this question starts fresh.",
  tampered:
    "The earlier conversation could not be verified, so this question starts fresh.",
  malformed:
    "The earlier conversation could not be read, so this question starts fresh.",
  consent_changed:
    "Your data-sharing choices changed, so this question starts fresh.",
};

function emptyAnswer(status: ResultStatus, limitation: string): AnswerV2 {
  return {
    version: "2",
    status,
    directAnswerClaimIds: [],
    claims: [],
    sections: [],
    table: null,
    sources: [],
    coverage: [],
    unresolved: [],
    limitations: [limitation],
    assumptions: [],
    model: null,
    verification: {
      claimsProposed: 0,
      claimsPassed: 0,
      rejectionReasons: [],
      semanticReview: "not_required",
      repairEligible: false,
    },
    nextTurnContext: null,
  };
}

export async function runAnalystV2(
  input: V2RunInput,
  deps: V2RunDeps,
): Promise<V2Response> {
  const now = deps.now();
  const emit = (event: V2ProgressEvent) => deps.emit?.(safeProgress(event));
  const fresh = () => newConversation(input.ownerId, input.consent, now);
  let context: ConversationContext | null = null;
  let contextNotice: string | null = null;
  if (deps.contextKey && input.contextToken) {
    const opened = openContext(input.contextToken, {
      ownerId: input.ownerId,
      consent: input.consent,
      key: deps.contextKey,
      now,
    });
    if (opened.ok) context = opened.context;
    else contextNotice = noticeFor[opened.reason] ?? null;
  }
  if (context) {
    try {
      context = (await reauthorizeContext(context, deps.authorize)).context;
    } catch {
      context = null;
      contextNotice =
        "Your earlier records could not be re-checked, so this question starts fresh.";
    }
  }
  emit({ type: "stage", stage: "understanding" });
  const interpretation = classifyTurn(input.question, context, now);
  const plan = applyTurn(
    context ?? fresh(),
    interpretation,
    input.question,
    fresh,
  );
  const style = detectStyle(input.question, "lookup");
  let planner: ModelRecord = {
    requested: "deterministic",
    resolved: "deterministic",
  };
  const seal = (next: ConversationContext) =>
    deps.contextKey ? sealContext(next, deps.contextKey, now) : null;

  if (!plan.question) {
    const presentation = presentAnswer(
      emptyAnswer(
        "clarification_required",
        "Ask a complete question, or continue from an earlier answer.",
      ),
      { language: "en", style, requirementText: (id) => id, asOf: null },
    );
    return {
      version: "2",
      status: "clarification_required",
      presentation,
      candidates: [],
      suggestions: [],
      models: { planner, writer: null, reviewer: null, fallback: false },
      context: seal(plan.context),
      contextNotice,
      outcome: "insufficient",
      usage: new RunLedger(RUN_BUDGETS.simple, deps.clock).usage,
    };
  }

  const rulesBrief = deterministicBrief({ question: plan.question, plan, now });
  let brief = rulesBrief;
  const language = brief.language === "fil-en" ? "fil-en" : "en";
  // A scenario needs a number: an unstated income drop is proposed to the
  // user and runs only once confirmed, never assumed silently.
  if (
    brief.requirements.some((item) =>
      item.evidenceNeeded.includes("debt.scenario"),
    ) &&
    vagueIncomeDrop(plan.question) &&
    assumedIncomeChange(brief.assumptions) === null
  ) {
    const percent = Math.abs(PROPOSED_INCOME_CHANGE_PERCENT);
    const ask =
      language === "fil-en"
        ? `Ipagpapalagay ko bang bababa nang ${percent}% ang buwanang kita mo? Sumagot ng oo para patakbuhin ang scenario, o magbigay ng ibang porsyento.`
        : `Should I assume your monthly income falls by ${percent}%? Reply yes to run the scenario, or give a different percentage.`;
    return {
      version: "2",
      status: "clarification_required",
      presentation: presentAnswer(emptyAnswer("clarification_required", ask), {
        language,
        style,
        requirementText: (id) => id,
        asOf: null,
      }),
      candidates: [],
      suggestions: [],
      models: { planner, writer: null, reviewer: null, fallback: false },
      context: seal(
        askAssumption(
          plan.context,
          plan.question,
          INCOME_CHANGE_KEY,
          PROPOSED_INCOME_CHANGE_PERCENT,
        ),
      ),
      contextNotice,
      outcome: "insufficient",
      usage: new RunLedger(RUN_BUDGETS.simple, deps.clock).usage,
    };
  }
  const capabilities = analystCapabilities({
    consent: input.consent,
    route: input.route,
  });
  // The planner reads the question like an analyst and may widen the brief;
  // it runs on its own allowance, which the run ledger then carries.
  const startedAt = deps.clock();
  const history = historyTurns(plan.context);
  let analysisPlan: AnalysisPlan | null = null;
  let plannerLedger: RunLedger | null = null;
  // What the owner records and since when; the writer may cite it to say
  // why a baseline is missing.
  let inventoryEvidence: EvidenceV2[] = [];
  // Saved priorities shape the plan and the answer; a stated one may be
  // offered for saving, and the ones a question bears on are kept longer.
  const memories = input.memories ?? [];
  const priorities = promptPriorities(memories);
  let relatedIds: string[] = [];
  let suggestion: string | null = null;
  const allowed = new Set(
    capabilities
      .filter(
        (item) => item.status === "available" || item.status === "partial",
      )
      .map((item) => item.id),
  );
  if (deps.planModel && brief.intent !== "scenario") {
    plannerLedger = new RunLedger(PLANNER_BUDGET, deps.clock, deps.signal);
    deps.onLedger?.(plannerLedger);
    try {
      // What the owner records, so the plan reads areas that have records.
      const inventory = await deps
        .invoke("getDataInventory", {})
        .catch(() => null);
      if (inventory && inventory.status !== "error")
        inventoryEvidence = inventory.evidence;
      if (inventory && inventory.status !== "error")
        plannerLedger.recordTool(
          inventory.metadata.queries,
          Buffer.byteLength(JSON.stringify(inventory.evidence)),
        );
      const refined = await planAnalysis({
        brief,
        history,
        inventory:
          inventory && inventory.status !== "error" ? inventory.evidence : [],
        model: deps.planModel,
        now,
        allowed,
        defaultedTopic:
          topicDomains(plan.question).length === 0 &&
          !plan.context.topic?.domains.length,
        call: deps.stageCaller(plannerLedger),
        priorities,
      });
      relatedIds = relatedMemoryIds(memories, refined.relatedPriorities);
      suggestion = memorySuggestion(refined.statedPriority, memories);
      planner = {
        requested: deps.planModel,
        resolved: refined.resolvedModel,
      };
      brief = refined.brief;
      analysisPlan = refined.plan;
      if (refined.clarification)
        return {
          version: "2",
          status: "clarification_required",
          presentation: presentAnswer(
            emptyAnswer("clarification_required", refined.clarification),
            { language, style, requirementText: (id) => id, asOf: null },
          ),
          candidates: [],
          suggestions: [],
          models: { planner, writer: null, reviewer: null, fallback: false },
          context: seal(plan.context),
          contextNotice,
          outcome: "insufficient",
          usage: plannerLedger.usage,
        };
    } catch {
      // A planner fault never costs the answer: the rules' brief stands.
      brief = rulesBrief;
      analysisPlan = null;
    }
  }
  const checkOptions = {
    consent: input.consent,
    route: input.route,
    authorizedHandles: new Set(plan.entities),
  };
  let check = checkBrief(brief, checkOptions);
  if (!check.ok && brief !== rulesBrief) {
    brief = rulesBrief;
    analysisPlan = null;
    check = checkBrief(brief, checkOptions);
  }
  if (!check.ok)
    throw new Error(`The analysis brief was rejected: ${check.reason}.`);
  const ledger = new RunLedger(
    RUN_BUDGETS[check.path],
    deps.clock,
    deps.signal,
    startedAt,
  );
  if (plannerLedger) ledger.absorb(plannerLedger.usage);
  deps.onLedger?.(ledger);
  const investigation = await runInvestigation({
    check,
    proposer: capabilityProposer(now),
    invoke: deps.invoke,
    clock: deps.clock,
    signal: deps.signal,
    ledger,
    onRound: (round, tools) =>
      emit({
        type: "stage",
        stage: "reading",
        round,
        domains: [...new Set(tools.flatMap((tool) => toolDomains[tool]))],
      }),
  });
  const requirementText = (id: string) =>
    brief.requirements.find((item) => item.id === id)?.question ?? id;
  const asOf = investigation.asOf.sources.at(-1)?.retrievedAt ?? null;

  if (
    investigation.status === "clarification_required" ||
    investigation.status === "cancelled"
  ) {
    const labels = new Map(
      investigation.labels.map((item) => [item.handle, item.text]),
    );
    const candidates = investigation.candidates.map((item) => ({
      handle: item.handle,
      label: labels.get(item.handle) ?? item.type,
    }));
    const status: ResultStatus =
      investigation.status === "cancelled" ? "error" : "clarification_required";
    const answer = emptyAnswer(
      status,
      status === "error"
        ? "The request was cancelled."
        : language === "fil-en"
          ? "Alin sa mga ito ang tinutukoy mo?"
          : "Which of these do you mean?",
    );
    const next = recordAnswer(plan.context, {
      brief,
      answer,
      evidence: [],
      candidates: candidates.map((item) => item.handle),
    });
    return {
      version: "2",
      status,
      presentation: presentAnswer(answer, {
        language,
        style,
        requirementText,
        asOf,
      }),
      candidates,
      suggestions: [],
      models: { planner, writer: null, reviewer: null, fallback: false },
      context: seal(next),
      contextNotice,
      outcome: "insufficient",
      usage: ledger.usage,
    };
  }

  // The inventory tells the derivations when the records begin.
  const derived = autoDerive(
    [...investigation.selection.selected, ...inventoryEvidence],
    { today: manilaToday(now) },
  );
  let evidence = investigation.selection.selected;
  let ownerLabels = investigation.labels;
  // With a plan, the first draft may ask for records it lacked. ATLAS reads
  // them once, through the same checked brief and owner-scoped tools, only
  // while the run still has time for the read and a repair.
  const followUp = async (
    requests: unknown[],
  ): Promise<FollowUpResult | null> => {
    if (ledger.remainingForAnswer().timeMs < FOLLOW_UP_MIN_REMAINING_MS)
      return null;
    const added = requestedRequirements(brief, requests, {
      now,
      allowed,
      limit: WRITER_LIMITS.evidenceRequests,
    });
    if (added.length === 0) return null;
    // The read investigates only what was asked for.
    const subCheck = checkBrief(
      {
        ...brief,
        requirements: added.map((item) => ({ ...item, essential: true })),
      },
      checkOptions,
    );
    if (!subCheck.ok) return null;
    const readLedger = new RunLedger(FOLLOW_UP_BUDGET, deps.clock, deps.signal);
    const more = await runInvestigation({
      check: subCheck,
      proposer: capabilityProposer(now),
      invoke: deps.invoke,
      clock: deps.clock,
      signal: deps.signal,
      budget: FOLLOW_UP_BUDGET,
      ledger: readLedger,
      onRound: (round, tools) =>
        emit({
          type: "stage",
          stage: "reading",
          round: investigation.usage.rounds + round,
          domains: [...new Set(tools.flatMap((tool) => toolDomains[tool]))],
        }),
    });
    ledger.absorb(readLedger.usage);
    if (more.status === "cancelled" || more.status === "clarification_required")
      return null;
    const known = new Set(evidence.map((item) => item.id));
    const fresh = more.selection.selected.filter((item) => !known.has(item.id));
    if (fresh.length === 0) return null;
    evidence = [...evidence, ...fresh];
    const byHandle = new Map(ownerLabels.map((item) => [item.handle, item]));
    for (const item of more.labels) byHandle.set(item.handle, item);
    ownerLabels = [...byHandle.values()];
    brief = { ...brief, requirements: [...brief.requirements, ...added] };
    return {
      brief,
      evidence: [...evidence, ...inventoryEvidence],
      derived: autoDerive([...evidence, ...inventoryEvidence], {
        today: manilaToday(now),
      }),
      labels: ownerLabels.map(({ handle, domain, text }) => ({
        handle,
        domain,
        text,
      })),
      byRequirement: more.selection.byRequirement,
      added: added.map((item) => item.id),
    };
  };
  const caller = deps.stageCaller(ledger);
  const call: StageCaller = (request) => {
    emit({
      type: "stage",
      stage:
        request.stage === "writer"
          ? "writing"
          : request.stage === "critic"
            ? "reviewing"
            : "repairing",
    });
    return caller(request).then((result) => {
      if (request.stage !== "critic")
        emit({ type: "stage", stage: "checking" });
      return result;
    });
  };
  const synthesis = await synthesizeAnswer({
    brief,
    // The inventory explains gaps in what was read; with nothing read, the
    // no-evidence path reports the gap without a writer.
    evidence:
      investigation.selection.selected.length > 0
        ? [...investigation.selection.selected, ...inventoryEvidence]
        : [],
    derived,
    labels: investigation.labels.map(({ handle, domain, text }) => ({
      handle,
      domain,
      text,
    })),
    history,
    priorities: priorities.map((item) => item.text),
    plan: analysisPlan,
    ...(analysisPlan && {
      catalog: plannerCatalog(allowed),
      followUp,
    }),
    writerTimeoutMs: writerTimeoutMs(
      ledger.remainingForAnswer().timeMs,
      REVIEW_LIMITS.timeoutMs,
    ),
    path: check.path,
    knownReasons: new Map(
      investigation.unresolved.map((item) => [item.requirementId, item.reason]),
    ),
    byRequirement: investigation.selection.byRequirement,
    limitations: investigation.limitations,
    now,
    models: {
      writer: input.model,
      reviewer: AI_MODELS.planner,
      writerFallback:
        freePoolFor(input.model) === "large" ? AI_MODELS.analyst : null,
      label,
    },
    call,
  });
  const answer = synthesis.answer;
  const presentation = presentAnswer(answer, {
    language,
    // With a plan, the planned style decides how much is shown; a short
    // lookup no longer hides every finding behind its one-line answer.
    style:
      explicitStyle(plan.question) ??
      // A planned style shapes the writing but never hides findings; only
      // a request in words (or the unplanned lookup default) shortens.
      (analysisPlan
        ? {
            style:
              brief.responseStyle === "concise"
                ? "standard"
                : brief.responseStyle,
            maxSentences: null,
          }
        : detectStyle(plan.question, brief.intent)),
    requirementText,
    asOf,
    labels: new Map(ownerLabels.map((label) => [label.handle, label.text])),
  });
  const next = recordAnswer(plan.context, {
    brief,
    answer,
    // Claims may cite the inventory; keep it so later turns see those facts.
    evidence: [...evidence, ...inventoryEvidence],
  });
  const entityDomains = next.entities.flatMap((item) => {
    const parsed = parseHandle(item.handle);
    return parsed ? [ENTITY_DOMAINS[parsed.type]] : [];
  });
  const writerFailed = synthesis.stages.find(
    (item) => item.stage === "writer" && item.status === "error",
  );
  const outcome: V2Response["outcome"] =
    answer.status === "answered" || answer.status === "partial_answer"
      ? "success"
      : writerFailed?.code === "pool_exhausted"
        ? "pool_exhausted"
        : writerFailed?.code === "timeout"
          ? "timeout"
          : writerFailed
            ? "provider_error"
            : "insufficient";
  return {
    version: "2",
    status: answer.status,
    diagnostics: {
      status: answer.status,
      outcome,
      path: check.path,
      planner: deps.planModel ? (analysisPlan ? "ok" : "failed") : "off",
      stopReason: investigation.stopReason ?? null,
      reads: investigation.outcomes.map((item) => ({
        tool: item.request.tool,
        round: item.round,
        status: item.result.status,
        error: item.result.error?.code ?? null,
        evidence: item.result.evidence.length,
      })),
      stages: synthesis.stages.map((item) => ({
        stage: item.stage,
        status: item.status,
        code: item.code ?? null,
      })),
      rejections: answer.verification.rejectionReasons,
      review: synthesis.review ?? null,
      claims: {
        proposed: answer.verification.claimsProposed,
        passed: answer.verification.claimsPassed,
      },
      providerCalls: ledger.usage.providerCalls,
    },
    memorySuggestion: suggestion,
    relatedMemoryIds: relatedIds,
    presentation,
    candidates: [],
    suggestions: suggestFollowUpsV2({
      question: input.question,
      brief,
      answer,
      domains: [...new Set([...(next.topic?.domains ?? []), ...entityDomains])],
      capabilities,
      context: deps.contextKey ? next : null,
      language,
    }),
    models: {
      planner,
      writer: synthesis.models.writer,
      reviewer: synthesis.models.reviewer,
      fallback: synthesis.models.fallback,
    },
    context: seal(next),
    contextNotice,
    outcome,
    usage: ledger.usage,
  };
}
