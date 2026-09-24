import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  existingEvidence,
  paymentSummary,
  related,
  runway,
  timeline,
} from "./adapters";
import {
  TOOL_LIMITS,
  ToolFailure,
  toolInputs,
  toolDescriptions,
  type ToolName,
  type ToolPayload,
  type ToolResult,
  type ToolFailureCode,
} from "./contracts";
import { createToolTransport } from "./transport";

const messages: Record<ToolFailureCode, string> = {
  invalid_input:
    "Choose an approved tool with valid arguments and a supported date period.",
  unauthenticated: "Sign in again to read your ATLAS records.",
  unavailable_source:
    "The requested source is unavailable. No private record existence is disclosed.",
  setup_error: "The required source or database setup is unavailable.",
  timeout: "Retrieval timed out. Try a smaller supported request.",
  partial: "The retrieval limit was reached. Reliable totals are withheld.",
  insufficient_history:
    "The recorded data cannot support this calculation or historical claim.",
  stale_data:
    "The available fallback is out of date. Review the source before using this calculation.",
  invalid_output: "The source did not provide safe, valid evidence.",
  budget_exceeded:
    "This request exceeds the approved retrieval or output budget.",
};

const period = z.object({ from: z.iso.date(), through: z.iso.date() }).strict();
const safeHref = z
  .string()
  .max(300)
  .regex(
    /^\/(?:money\/transactions|money\/runway|debts|tasks|goals|career|reviews|signals|timeline|knowledge)(?:[/?][a-zA-Z0-9_?=&%.-]*)?$/,
  );
const evidenceSchema = z
  .object({
    id: z.string().min(1).max(200),
    metric: z.string().min(1).max(160),
    value: z.union([z.number().finite(), z.string().max(100)]),
    unit: z.enum([
      "centavos",
      "count",
      "percent",
      "score",
      "stage",
      "severity",
      "priority",
      "months",
      "event",
      "relationship",
    ]),
    period,
    comparisonBasis: z.string().max(1200),
    source: z
      .object({
        description: z.string().max(200),
        recordIds: z.array(z.uuid()).max(20),
        href: safeHref,
      })
      .strict(),
    completeness: z.enum(["complete", "partial", "insufficient"]),
    note: z.string().max(500).optional(),
    claimType: z.enum(["FACT", "TREND", "SCENARIO", "RECOMMENDATION"]),
    provenance: z
      .object({
        tool: z.string(),
        calculationVersion: z.literal("1"),
        retrievedAt: z.iso.datetime(),
        textTrust: z.literal("untrusted_data"),
      })
      .strict(),
    relationship: z
      .object({
        source: z.object({ type: z.string().max(30), id: z.uuid() }).strict(),
        target: z.object({ type: z.string().max(30), id: z.uuid() }).strict(),
        origin: z.enum(["native", "manual"]),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      ["centavos", "count"].includes(value.unit) &&
      (typeof value.value !== "number" || !Number.isSafeInteger(value.value))
    )
      ctx.addIssue({ code: "custom", message: "Unsafe integer evidence" });
    if (value.period.from > value.period.through)
      ctx.addIssue({ code: "custom", message: "Invalid evidence period" });
    if (
      ["event", "relationship"].includes(value.unit) &&
      (typeof value.value !== "string" ||
        !/^[a-z][a-z0-9_.-]{0,79}$/.test(value.value))
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid event or relationship",
      });
  });
const payloadSchema = z
  .object({
    status: z.enum(["ready", "partial", "insufficient"]),
    evidence: z.array(evidenceSchema).max(TOOL_LIMITS.evidence),
    limitations: z.array(z.string().max(1200)).max(12),
  })
  .strict();

/** Server-side discovery only. Schemas are explicit; a model never defines capabilities. */
export function listAnalystTools() {
  return (Object.keys(toolInputs) as ToolName[]).map((name) => ({
    name,
    description: toolDescriptions[name],
    readOnly: true as const,
    inputSchema: z.toJSONSchema(toolInputs[name], { unrepresentable: "any" }),
    limits: TOOL_LIMITS,
  }));
}

/** Independent read-only invocation. There is deliberately no route, planner or model call. */
export async function invokeAnalystTool(
  name: unknown,
  rawInput: unknown,
): Promise<ToolResult> {
  const started = Date.now();
  const now = new Date(started);
  const controller = new AbortController();
  let transport: ReturnType<typeof createToolTransport> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tool: ToolName | null =
    typeof name === "string" && Object.hasOwn(toolInputs, name)
      ? (name as ToolName)
      : null;
  const meta = (evidenceCount: number): ToolResult["metadata"] => ({
    version: "1",
    startedAt: now.toISOString(),
    durationMs: Math.max(0, Date.now() - started),
    queries: transport?.stats.queries ?? 0,
    rows: transport?.stats.rows ?? 0,
    evidenceCount,
    modelCalls: 0,
    tokens: 0,
    estimatedCost: 0,
  });
  try {
    if (!tool || !toolInputs[tool].safeParse(rawInput).success)
      throw new ToolFailure("invalid_input");
    const work = async (): Promise<ToolPayload> => {
      const nativeFetch = globalThis.fetch;
      const client = await createClient({
        fetch: async (request, init) => {
          if (controller.signal.aborted) throw new ToolFailure("timeout");
          if (transport) return transport.fetch(request, init);
          // Before identity is established, only Auth may be contacted.
          const authRequest = new Request(request, init);
          const url = new URL(authRequest.url);
          const isUser =
            authRequest.method === "GET" && url.pathname === "/auth/v1/user";
          const isRefresh =
            authRequest.method === "POST" &&
            url.pathname === "/auth/v1/token" &&
            url.search === "?grant_type=refresh_token";
          if (!isUser && !isRefresh) throw new ToolFailure("unauthenticated");
          return nativeFetch(authRequest, {
            signal: controller.signal,
            redirect: "error",
          });
        },
      });
      if (!client) throw new ToolFailure("setup_error");
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error || !user) throw new ToolFailure("unauthenticated");
      if (controller.signal.aborted) throw new ToolFailure("timeout");
      transport = createToolTransport({
        ownerId: user.id,
        signal: controller.signal,
        fetch: nativeFetch,
      });
      const context = { client, owner: user.id, now };
      switch (tool) {
        case "getMoneySummary":
          return paymentSummary(
            tool,
            toolInputs.getMoneySummary.parse(rawInput),
            context,
          );
        case "getDebtPayments":
          return paymentSummary(
            tool,
            toolInputs.getDebtPayments.parse(rawInput),
            context,
          );
        case "getRelatedEntities":
          return related(
            toolInputs.getRelatedEntities.parse(rawInput),
            context,
          );
        case "getTimelineEvents":
          return timeline(
            toolInputs.getTimelineEvents.parse(rawInput),
            context,
          );
        case "getRunway":
          return runway(tool, null, context);
        case "runFinancialScenario":
          return runway(
            tool,
            toolInputs.runFinancialScenario.parse(rawInput),
            context,
          );
        default:
          return existingEvidence(tool, context);
      }
    };
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ToolFailure("timeout"));
      }, TOOL_LIMITS.timeoutMs);
    });
    const payload = await Promise.race([work(), deadline]);
    if (transport?.failure) throw transport.failure;
    if (!payloadSchema.safeParse(payload).success)
      throw new ToolFailure("invalid_output");
    if (
      new Set(payload.evidence.map((item) => item.id)).size !==
      payload.evidence.length
    )
      throw new ToolFailure("invalid_output");
    if (Buffer.byteLength(JSON.stringify(payload)) > TOOL_LIMITS.outputBytes)
      throw new ToolFailure("budget_exceeded");
    const status =
      payload.status === "ready" &&
      payload.evidence.some((item) => item.completeness !== "complete")
        ? "partial"
        : payload.status;
    return {
      ...payload,
      status,
      tool,
      metadata: meta(payload.evidence.length),
      ...(status === "insufficient"
        ? {
            error: {
              code: "insufficient_history" as const,
              message: messages.insufficient_history,
            },
          }
        : {}),
    };
  } catch (error) {
    const code =
      transport?.failure?.code ??
      (error instanceof ToolFailure
        ? error.code
        : controller.signal.aborted
          ? "timeout"
          : "unavailable_source");
    return {
      tool,
      status:
        code === "partial"
          ? "partial"
          : code === "insufficient_history"
            ? "insufficient"
            : "error",
      evidence: [],
      limitations: [messages[code]],
      error: { code, message: messages[code] },
      metadata: meta(0),
    };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
