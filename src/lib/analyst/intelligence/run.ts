import {
  AI_MODELS,
  ANALYST_MODEL_OPTIONS,
  type AnalystModelId,
} from "@/lib/ai/models";
import { freePoolFor } from "@/lib/ai/pools";
import { checkBrief } from "./brief";
import { RUN_BUDGETS, RunLedger } from "./budgets";
import { analystCapabilities } from "./capabilities";
import {
  newConversation,
  openContext,
  reauthorizeContext,
  sealContext,
  type ConversationContext,
} from "./context";
import type { AnswerV2, ConsentDomain, ResultStatus } from "./contracts";
import { autoDerive } from "./derive";
import { suggestFollowUpsV2, type FollowUp } from "./follow-ups";
import { detectStyle } from "./language";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import type { AnalystConsent, ProviderRoute } from "./policy";
import { presentAnswer, type Presentation } from "./presentation";
import { safeProgress, type V2ProgressEvent } from "./progress";
import { capabilityProposer } from "./proposer";
import type { StageCaller } from "./stages";
import { synthesizeAnswer } from "./synthesis";
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
import { applyTurn, askAssumption, classifyTurn, recordAnswer } from "./turns";

/**
 * One Analyst V2 request, end to end (AI-06): open and re-authorize the
 * conversation context, interpret the turn, build and check the brief,
 * investigate within one run budget, synthesize and check the answer,
 * present it, suggest follow-ups and seal the next context. Every external
 * effect is injected, so the whole path runs against fixtures in tests.
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
};

export type V2RunInput = {
  ownerId: string;
  question: string;
  contextToken: string | null;
  model: AnalystModelId;
  consent: AnalystConsent;
  route: ProviderRoute;
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
};

const toolDomains: Record<V2ToolName, ConsentDomain[]> = {
  resolveAnalystEntities: [],
  searchAnalystRecords: [],
  getAnalystRecordDetails: [],
  getMoneyBreakdown: ["money"],
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
  const planner = { requested: "deterministic", resolved: "deterministic" };
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

  const brief = deterministicBrief({ question: plan.question, plan, now });
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
  const check = checkBrief(brief, {
    consent: input.consent,
    route: input.route,
    authorizedHandles: new Set(plan.entities),
  });
  if (!check.ok)
    throw new Error(`The analysis brief was rejected: ${check.reason}.`);
  const ledger = new RunLedger(
    RUN_BUDGETS[check.path],
    deps.clock,
    deps.signal,
  );
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
  const capabilities = analystCapabilities({
    consent: input.consent,
    route: input.route,
  });

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

  const derived = autoDerive(investigation.selection.selected);
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
    evidence: investigation.selection.selected,
    derived,
    labels: investigation.labels.map(({ handle, domain, text }) => ({
      handle,
      domain,
      text,
    })),
    history: [],
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
    style: detectStyle(plan.question, brief.intent),
    requirementText,
    asOf,
  });
  const next = recordAnswer(plan.context, {
    brief,
    answer,
    evidence: investigation.selection.selected,
  });
  const entityDomains = next.entities.flatMap((item) => {
    const parsed = parseHandle(item.handle);
    return parsed ? [ENTITY_DOMAINS[parsed.type]] : [];
  });
  const writerFailed = synthesis.stages.find(
    (item) => item.stage === "writer" && item.status === "error",
  );
  return {
    version: "2",
    status: answer.status,
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
    outcome:
      answer.status === "answered" || answer.status === "partial_answer"
        ? "success"
        : writerFailed?.code === "pool_exhausted"
          ? "pool_exhausted"
          : writerFailed?.code === "timeout"
            ? "timeout"
            : writerFailed
              ? "provider_error"
              : "insufficient",
    usage: ledger.usage,
  };
}
