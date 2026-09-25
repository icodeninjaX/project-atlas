import "server-only";
import { invokeAnalystTool } from "@/lib/analyst/tools/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ToolEvidence,
  ToolFailureCode,
  ToolName,
  ToolResult,
} from "@/lib/analyst/tools/contracts";
import {
  PLANNER_LIMITS,
  PlannerContractError,
  validateExecutablePlan,
  type PlannerMetadata,
  type PlannerPlan,
  type PlannerRequestResult,
} from "./contracts";
import { requestAnalystPlan } from "./provider";

export type PlannerCallExecution = {
  callId: string;
  tool: ToolName;
  input: PlannerPlan["calls"][number]["input"];
  status: ToolResult["status"];
  result: ToolResult;
};

export type PlannerExecution = {
  status: "ready" | "partial" | "error";
  calls: PlannerCallExecution[];
  evidence: ToolEvidence[];
  limitations: string[];
  metadata: {
    version: "1";
    startedAt: string;
    durationMs: number;
    approvedToolNames: ToolName[];
    toolCalls: number;
    evidenceCount: number;
    evidenceBytes: number;
    planner?: PlannerMetadata;
  };
  error?: { code: "invalid_plan" | "execution_timeout"; message: string };
};

export type PlannerRunResult =
  PlannerExecution | Exclude<PlannerRequestResult, { status: "planned" }>;

const plannerBudgetMessage =
  "Planner evidence was withheld because the aggregate context budget was reached.";

function boundaryError(
  code: "unauthenticated" | "timeout",
  started: Date,
): Exclude<PlannerRequestResult, { status: "planned" }> {
  return {
    status: "error",
    error: {
      code,
      message:
        code === "timeout"
          ? "Authentication timed out before planning began."
          : "Sign in before using the Analyst planner.",
    },
    metadata: {
      version: "1",
      model: null,
      resolvedModel: null,
      startedAt: started.toISOString(),
      durationMs: Math.max(0, Date.now() - started.getTime()),
      modelCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsdMicros: 0,
      providerStatus: "not_called",
    },
  };
}

function failedToolResult(
  tool: ToolName,
  source: ToolResult,
  code: ToolFailureCode = "budget_exceeded",
): ToolResult {
  const message =
    code === "invalid_output"
      ? "Duplicate or inconsistent evidence was withheld."
      : plannerBudgetMessage;
  return {
    tool,
    status: "error",
    evidence: [],
    limitations: [message],
    error: { code, message },
    metadata: { ...source.metadata, evidenceCount: 0 },
  };
}

export async function executeAnalystPlan(
  rawPlan: PlannerPlan,
  options: {
    invoke?: typeof invokeAnalystTool;
    now?: Date;
    plannerMetadata?: PlannerMetadata;
  } = {},
): Promise<PlannerExecution> {
  const started = Date.now();
  const now = options.now ?? new Date(started);
  let plan: PlannerPlan;
  try {
    plan = validateExecutablePlan(rawPlan);
  } catch (error) {
    return {
      status: "error",
      calls: [],
      evidence: [],
      limitations: [
        error instanceof PlannerContractError
          ? error.message
          : "The plan is invalid.",
      ],
      error: { code: "invalid_plan", message: "The plan is invalid." },
      metadata: {
        version: "1",
        startedAt: now.toISOString(),
        durationMs: Math.max(0, Date.now() - started),
        approvedToolNames: [],
        toolCalls: 0,
        evidenceCount: 0,
        evidenceBytes: 0,
        ...(options.plannerMetadata && { planner: options.plannerMetadata }),
      },
    };
  }
  if (plan.outcome !== "plan") {
    return {
      status: "error",
      calls: [],
      evidence: [],
      limitations: ["Only an executable plan can reach the tool boundary."],
      error: { code: "invalid_plan", message: "The plan is not executable." },
      metadata: {
        version: "1",
        startedAt: now.toISOString(),
        durationMs: Math.max(0, Date.now() - started),
        approvedToolNames: [],
        toolCalls: 0,
        evidenceCount: 0,
        evidenceBytes: 0,
        ...(options.plannerMetadata && { planner: options.plannerMetadata }),
      },
    };
  }

  const invoke = options.invoke ?? invokeAnalystTool;
  const timeoutMarker = Symbol("planner-timeout");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof timeoutMarker>((resolve) => {
    timer = setTimeout(
      () => resolve(timeoutMarker),
      PLANNER_LIMITS.executionTimeoutMs,
    );
  });
  const work = Promise.all(
    plan.calls.map(async (call) => {
      let result: ToolResult;
      try {
        result = await invoke(call.tool, call.input);
      } catch {
        const message = "The approved source could not be loaded.";
        result = {
          tool: call.tool,
          status: "error",
          evidence: [],
          limitations: [message],
          error: { code: "unavailable_source", message },
          metadata: {
            version: "1",
            startedAt: now.toISOString(),
            durationMs: Math.max(0, Date.now() - started),
            queries: 0,
            rows: 0,
            evidenceCount: 0,
            modelCalls: 0,
            tokens: 0,
            estimatedCost: 0,
          },
        };
      }
      return { callId: call.id, tool: call.tool, input: call.input, result };
    }),
  );
  const completed = await Promise.race([work, deadline]);
  if (timer) clearTimeout(timer);
  if (completed === timeoutMarker) {
    return {
      status: "error",
      calls: [],
      evidence: [],
      limitations: [
        "Approved tool execution exceeded the whole-plan deadline.",
      ],
      error: {
        code: "execution_timeout",
        message: "Approved tool execution timed out.",
      },
      metadata: {
        version: "1",
        startedAt: now.toISOString(),
        durationMs: Math.max(0, Date.now() - started),
        approvedToolNames: plan.calls.map((call) => call.tool),
        toolCalls: plan.calls.length,
        evidenceCount: 0,
        evidenceBytes: 0,
        ...(options.plannerMetadata && { planner: options.plannerMetadata }),
      },
    };
  }

  const calls: PlannerCallExecution[] = [];
  const evidence: ToolEvidence[] = [];
  const limitations = [...plan.missingCapabilities];
  const evidenceIds = new Set<string>();
  let evidenceBytes = 0;
  for (const call of completed) {
    const candidateBytes = Buffer.byteLength(
      JSON.stringify({
        evidence: call.result.evidence,
        limitations: call.result.limitations,
      }),
    );
    const hasDuplicateEvidence = call.result.evidence.some((item) =>
      evidenceIds.has(item.id),
    );
    const exceedsBudget =
      evidence.length + call.result.evidence.length >
        PLANNER_LIMITS.evidenceItems ||
      evidenceBytes + candidateBytes > PLANNER_LIMITS.evidenceBytes;
    const result =
      exceedsBudget || hasDuplicateEvidence
        ? failedToolResult(
            call.tool,
            call.result,
            hasDuplicateEvidence ? "invalid_output" : "budget_exceeded",
          )
        : call.result;
    if (result === call.result) {
      evidenceBytes += candidateBytes;
      for (const item of result.evidence) {
        evidenceIds.add(item.id);
        evidence.push(item);
      }
    }
    limitations.push(...result.limitations);
    calls.push({
      callId: call.callId,
      tool: call.tool,
      input: call.input,
      status: result.status,
      result,
    });
  }
  const partial =
    plan.missingCapabilities.length > 0 ||
    calls.some((call) => call.status !== "ready");
  return {
    status: partial ? "partial" : "ready",
    calls,
    evidence,
    limitations: [...new Set(limitations)],
    metadata: {
      version: "1",
      startedAt: now.toISOString(),
      durationMs: Math.max(0, Date.now() - started),
      approvedToolNames: plan.calls.map((call) => call.tool),
      toolCalls: plan.calls.length,
      evidenceCount: evidence.length,
      evidenceBytes,
      ...(options.plannerMetadata && { planner: options.plannerMetadata }),
    },
  };
}

export async function runAnalystQueryPlanner(
  question: unknown,
): Promise<PlannerRunResult> {
  const started = new Date();
  const authTimeout = Symbol("auth-timeout");
  const authController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof authTimeout>((resolve) => {
    timer = setTimeout(() => {
      authController.abort();
      resolve(authTimeout);
    }, PLANNER_LIMITS.authenticationTimeoutMs);
  });
  let user:
    | { data: { user: { id: string } | null }; error: unknown }
    | typeof authTimeout
    | null = null;
  try {
    user = await Promise.race([
      (async () => {
        const client = await createClient({
          fetch: (input, init) =>
            globalThis.fetch(new Request(input, init), {
              signal: authController.signal,
              redirect: "error",
            }),
        });
        return client ? await client.auth.getUser() : null;
      })(),
      deadline,
    ]);
  } catch {
    user = null;
  } finally {
    if (timer) clearTimeout(timer);
    authController.abort();
  }
  if (user === authTimeout) return boundaryError("timeout", started);
  if (!user || user.error || !user.data.user)
    return boundaryError("unauthenticated", started);
  const planning = await requestAnalystPlan(question);
  if (planning.status !== "planned") return planning;
  return executeAnalystPlan(planning.plan, {
    plannerMetadata: planning.metadata,
  });
}
