import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolResult } from "@/lib/analyst/tools/contracts";
import { executeAnalystPlan, runAnalystQueryPlanner } from "./server";
import { PLANNER_LIMITS, type PlannerPlan } from "./contracts";

vi.mock("server-only", () => ({}));

const provider = vi.hoisted(() => ({ request: vi.fn() }));
const tools = vi.hoisted(() => ({ invoke: vi.fn() }));
const auth = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn() }));
vi.mock("./provider", () => ({ requestAnalystPlan: provider.request }));
vi.mock("@/lib/analyst/tools/server", () => ({
  invokeAnalystTool: tools.invoke,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: auth.createClient }));

const baseMetadata = {
  model: "gpt-4o-mini-2024-07-18",
  resolvedModel: "gpt-4o-mini-2024-07-18",
  startedAt: "2026-09-24T00:00:00.000Z",
  durationMs: 10,
  modelCalls: 1 as const,
  inputTokens: 100,
  outputTokens: 50,
  estimatedCostUsdMicros: 45,
  providerStatus: "success" as const,
};
const plan: PlannerPlan = {
  version: "1",
  outcome: "plan",
  clarification: null,
  unsupportedReason: null,
  missingCapabilities: [],
  calls: [
    { id: "call_1", tool: "getGoalProgress", input: {} },
    { id: "call_2", tool: "getCareerPipeline", input: {} },
  ],
};

function result(
  tool: "getGoalProgress" | "getCareerPipeline",
  status: ToolResult["status"] = "ready",
): ToolResult {
  return {
    tool,
    status,
    evidence:
      status === "ready"
        ? [
            {
              id: `${tool}:evidence`,
              metric: "Synthetic fact",
              value: 1,
              unit: "count",
              period: { from: "2026-09-24", through: "2026-09-24" },
              comparisonBasis: "Synthetic fixture",
              source: { description: "Fixture", recordIds: [], href: "/goals" },
              completeness: "complete",
              claimType: "FACT",
              provenance: {
                tool,
                calculationVersion: "1",
                retrievedAt: "2026-09-24T00:00:00.000Z",
                textTrust: "untrusted_data",
              },
            },
          ]
        : [],
    limitations: status === "ready" ? [] : ["Synthetic partial failure."],
    ...(status === "error"
      ? {
          error: {
            code: "unavailable_source" as const,
            message: "The requested source is unavailable.",
          },
        }
      : {}),
    metadata: {
      version: "1",
      startedAt: "2026-09-24T00:00:00.000Z",
      durationMs: 5,
      queries: 1,
      rows: 1,
      evidenceCount: status === "ready" ? 1 : 0,
      modelCalls: 0,
      tokens: 0,
      estimatedCost: 0,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({
    data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } },
    error: null,
  });
  auth.createClient.mockResolvedValue({ auth: { getUser: auth.getUser } });
  provider.request.mockResolvedValue({
    status: "planned",
    plan,
    metadata: baseMetadata,
  });
  tools.invoke.mockImplementation(
    async (name: "getGoalProgress" | "getCareerPipeline") => result(name),
  );
});

describe("Analyst query planner execution", () => {
  it("authenticates before planning or retrieval", async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const response = await runAnalystQueryPlanner("What is my current runway?");
    expect(response).toMatchObject({
      status: "error",
      error: { code: "unauthenticated" },
      metadata: { modelCalls: 0, providerStatus: "not_called" },
    });
    expect(provider.request).not.toHaveBeenCalled();
    expect(tools.invoke).not.toHaveBeenCalled();
  });

  it("bounds authentication before any provider call", async () => {
    vi.useFakeTimers();
    auth.getUser.mockReturnValueOnce(new Promise(() => undefined));
    const pending = runAnalystQueryPlanner("What is my current runway?");
    await vi.advanceTimersByTimeAsync(PLANNER_LIMITS.authenticationTimeoutMs);
    expect(await pending).toMatchObject({
      status: "error",
      error: { code: "timeout" },
      metadata: { modelCalls: 0 },
    });
    expect(provider.request).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("executes only validated plan calls and aggregates evidence", async () => {
    const response = await runAnalystQueryPlanner(
      "What is blocking my career goal?",
    );
    expect(response.status).toBe("ready");
    if (!("calls" in response)) throw new Error("Expected executed plan.");
    expect(response.evidence).toHaveLength(2);
    expect(tools.invoke.mock.calls).toEqual([
      ["getGoalProgress", {}],
      ["getCareerPipeline", {}],
    ]);
    expect(response.metadata).toMatchObject({
      approvedToolNames: ["getGoalProgress", "getCareerPipeline"],
      toolCalls: 2,
      planner: { providerStatus: "success" },
    });
    expect(response).not.toHaveProperty("question");
  });

  it("preserves a tool failure as partial evidence", async () => {
    tools.invoke.mockImplementation(
      async (name: "getGoalProgress" | "getCareerPipeline") =>
        name === "getCareerPipeline" ? result(name, "error") : result(name),
    );
    const response = await runAnalystQueryPlanner(
      "Review my goals and career pipeline",
    );
    expect(response.status).toBe("partial");
    if (!("calls" in response)) throw new Error("Expected executed plan.");
    expect(response.evidence).toHaveLength(1);
    expect(response.calls[1]).toMatchObject({
      callId: "call_2",
      status: "error",
      result: { error: { code: "unavailable_source" } },
    });
  });

  it("preserves successful evidence when another tool unexpectedly throws", async () => {
    tools.invoke.mockImplementation(
      async (name: "getGoalProgress" | "getCareerPipeline") => {
        if (name === "getCareerPipeline")
          throw new Error("private source detail");
        return result(name);
      },
    );
    const response = await runAnalystQueryPlanner(
      "Review my goals and career pipeline",
    );
    expect(response.status).toBe("partial");
    if (!("calls" in response)) throw new Error("Expected executed plan.");
    expect(response.evidence).toHaveLength(1);
    expect(response.calls[1]).toMatchObject({
      result: { error: { code: "unavailable_source" } },
    });
    expect(JSON.stringify(response)).not.toContain("private source detail");
  });

  it("marks a plan with missing capabilities as partial", async () => {
    const response = await executeAnalystPlan({
      ...plan,
      missingCapabilities: ["Synthetic unavailable source"],
    });
    expect(response.status).toBe("partial");
    expect(response.limitations).toContain("Synthetic unavailable source");
  });

  it("does not execute clarification, unsupported, or planning-error results", async () => {
    for (const planning of [
      {
        status: "clarification_required",
        clarification: "Which goal?",
        metadata: { ...baseMetadata, providerStatus: "success" },
      },
      {
        status: "unsupported",
        unsupportedReason: "No sleep source.",
        missingCapabilities: ["sleep records"],
        metadata: { ...baseMetadata, providerStatus: "success" },
      },
      {
        status: "error",
        error: { code: "timeout", message: "Planning timed out." },
        metadata: { ...baseMetadata, providerStatus: "timeout" },
      },
    ]) {
      provider.request.mockResolvedValueOnce(planning);
      const response = await runAnalystQueryPlanner("Synthetic question");
      expect(response.status).toBe(planning.status);
    }
    expect(tools.invoke).not.toHaveBeenCalled();
  });

  it("revalidates direct plans before invoking tools", async () => {
    const unsafe = {
      ...plan,
      calls: [
        {
          id: "call_1",
          tool: "getGoalProgress",
          input: { ownerId: "other" },
        },
      ],
    } as unknown as PlannerPlan;
    const response = await executeAnalystPlan(unsafe);
    expect(response.status).toBe("error");
    expect(tools.invoke).not.toHaveBeenCalled();
  });

  it("enforces the aggregate evidence context budget explicitly", async () => {
    tools.invoke.mockImplementation(
      async (name: "getGoalProgress" | "getCareerPipeline") => {
        const value = result(name);
        value.limitations = ["x".repeat(PLANNER_LIMITS.evidenceBytes)];
        return value;
      },
    );
    const response = await runAnalystQueryPlanner(
      "Review my goals and career pipeline",
    );
    expect(response.status).toBe("partial");
    if (!("calls" in response)) throw new Error("Expected executed plan.");
    expect(response.evidence).toEqual([]);
    expect(response.calls.every((call) => call.status === "error")).toBe(true);
    expect(response.limitations.join(" ")).toMatch(/budget/i);
  });

  it("enforces a whole-plan tool execution deadline", async () => {
    vi.useFakeTimers();
    tools.invoke.mockReturnValue(new Promise(() => undefined));
    const pending = executeAnalystPlan(plan);
    await vi.advanceTimersByTimeAsync(PLANNER_LIMITS.executionTimeoutMs);
    const response = await pending;
    expect(response).toMatchObject({
      status: "error",
      error: { code: "execution_timeout" },
      evidence: [],
    });
    vi.useRealTimers();
  });
});
