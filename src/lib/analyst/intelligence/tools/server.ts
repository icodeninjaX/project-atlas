import "server-only";
import { z } from "zod";
import { ToolFailure } from "@/lib/analyst/tools/contracts";
import { invokeAnalystTool } from "@/lib/analyst/tools/server";
import {
  approvedToolTables,
  createToolTransport,
} from "@/lib/analyst/tools/transport";
import { createClient } from "@/lib/supabase/server";
import { evidenceV2Schema } from "../contracts";
import { adaptLegacyCall } from "../legacy-evidence";
import {
  eligibility,
  type AnalystConsent,
  type ProviderRoute,
} from "../policy";
import {
  ENTITY_DOMAINS,
  V2_TOOL_LIMITS,
  emptyPayload,
  isBridgedTool,
  type BridgedTool,
  parseHandle,
  v2ToolDescriptions,
  v2ToolInputs,
  type V2FailureCode,
  type V2ToolName,
  type V2ToolPayload,
  type V2ToolResult,
} from "./contracts";
import {
  dataInventory,
  decisionContext,
  goalContext,
  goalPace,
  moneyBreakdown,
  transactionQuery,
  recordDetails,
  relationshipPaths,
  resolveEntities,
  searchRecords,
  type ReadContext,
} from "./reads";

/**
 * Authenticated invocation of the Analyst V2 read tools. Identity comes from
 * the session, never from input. Every read uses the owner's RLS client
 * through the bounded, owner-filtered tool transport; this module never
 * creates a service-role client. Sensitive narrative is not even retrieved
 * unless consent and the provider route allow it.
 */

/** The legacy allowlist plus decision and knowledge-review tables. Capture previews are never readable. */
export const V2_TABLES: ReadonlySet<string> = new Set([
  ...approvedToolTables,
  "decisions",
  "decision_revisions",
  "decision_observations",
  "knowledge_reviews",
]);

const messages: Record<V2FailureCode, string> = {
  invalid_input: "Choose an approved tool with valid arguments.",
  unauthenticated: "Sign in again to read your ATLAS records.",
  unavailable_source:
    "The requested record or source is unavailable. ATLAS does not say whether it exists.",
  setup_error: "The required source or database setup is unavailable.",
  timeout: "Retrieval timed out.",
  partial:
    "The source exceeded its bounded window, so totals and rankings are withheld.",
  invalid_output: "The source did not provide safe, valid evidence.",
  budget_exceeded: "This request exceeds the approved retrieval budget.",
};

const labelSchema = z
  .object({
    handle: z.string().max(80),
    domain: z.string().max(20),
    text: z.string().max(160),
    href: z
      .string()
      .max(300)
      .regex(/^\/(?!\/)[a-zA-Z0-9/_?=&%.#:-]*$/),
  })
  .strict();

export function listAnalystToolsV2() {
  return (Object.keys(v2ToolInputs) as V2ToolName[]).map((name) => ({
    name,
    description: v2ToolDescriptions[name],
    readOnly: true as const,
    inputSchema: z.toJSONSchema(v2ToolInputs[name], { unrepresentable: "any" }),
  }));
}

/** Whether a request may retrieve private text for a tool's domain. */
function sensitiveAllowed(
  name: V2ToolName,
  input: Record<string, unknown>,
  consent: AnalystConsent | null,
  route: ProviderRoute,
) {
  const domains =
    name === "getDecisionAnalysisContext"
      ? ["decisions" as const]
      : name === "getAnalystRecordDetails"
        ? (input.handles as string[]).map(
            (handle) => ENTITY_DOMAINS[parseHandle(handle)!.type],
          )
        : [];
  return (
    domains.length > 0 &&
    domains.every(
      (domain) =>
        eligibility(domain, "sensitive_narrative", consent, route) === null,
    )
  );
}

/**
 * Runs an existing aggregate tool unchanged and adapts its evidence. The
 * legacy tool keeps its own session identity, owner filter, bounded
 * transport and timeout; V2 only reshapes the result. A status other than
 * `error` passes through, so "not enough history" stays insufficient
 * evidence rather than an operational failure.
 */
async function invokeBridged(
  tool: BridgedTool,
  rawInput: unknown,
): Promise<V2ToolResult> {
  const result = await invokeAnalystTool(tool, rawInput);
  const metadata = {
    version: "1" as const,
    durationMs: result.metadata.durationMs,
    queries: result.metadata.queries,
    rows: result.metadata.rows,
  };
  const failed = (code: V2FailureCode): V2ToolResult => ({
    ...emptyPayload(),
    tool,
    status: "error",
    error: { code, message: messages[code] },
    limitations: [messages[code]],
    metadata,
  });
  if (result.status === "error") {
    const raw = result.error?.code ?? "unavailable_source";
    return failed(
      raw === "insufficient_history" || raw === "stale_data"
        ? "unavailable_source"
        : raw,
    );
  }
  try {
    return {
      ...emptyPayload(),
      tool,
      status: result.status,
      evidence: adaptLegacyCall({
        tool,
        input: v2ToolInputs[tool].parse(rawInput),
        evidence: result.evidence,
      }),
      limitations: result.limitations,
      metadata,
    };
  } catch {
    return failed("invalid_output");
  }
}

export async function invokeAnalystToolV2(
  name: unknown,
  rawInput: unknown,
  options: { consent: AnalystConsent | null; route: ProviderRoute },
): Promise<V2ToolResult> {
  const started = Date.now();
  const now = new Date(started);
  const controller = new AbortController();
  let transport: ReturnType<typeof createToolTransport> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tool: V2ToolName | null =
    typeof name === "string" && Object.hasOwn(v2ToolInputs, name)
      ? (name as V2ToolName)
      : null;
  const metadata = () => ({
    version: "1" as const,
    durationMs: Math.max(0, Date.now() - started),
    queries: transport?.stats.queries ?? 0,
    rows: transport?.stats.rows ?? 0,
  });
  try {
    const parsed = tool ? v2ToolInputs[tool].safeParse(rawInput) : null;
    if (!tool || !parsed?.success) throw new ToolFailure("invalid_input");
    // Nothing is sent to a provider without consent; nothing is read either.
    if (!options.consent) throw new ToolFailure("unauthenticated");
    if (isBridgedTool(tool)) return await invokeBridged(tool, rawInput);
    const input = parsed.data as Record<string, unknown>;
    const work = async (): Promise<V2ToolPayload> => {
      const nativeFetch = globalThis.fetch;
      const client = await createClient({
        fetch: async (request, init) => {
          if (controller.signal.aborted) throw new ToolFailure("timeout");
          if (transport) return transport.fetch(request, init);
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
      transport = createToolTransport({
        ownerId: user.id,
        signal: controller.signal,
        fetch: nativeFetch,
        policy: {
          tables: V2_TABLES,
          queries: V2_TOOL_LIMITS.queries,
          rows: V2_TOOL_LIMITS.rows,
          // The decision comparison reads two 14-day windows by day.
          historicalBuckets: 31,
          callerPaginates: true,
        },
      });
      const context: ReadContext = {
        client,
        owner: user.id,
        now,
        allowSensitive: sensitiveAllowed(
          tool,
          input,
          options.consent,
          options.route,
        ),
      };
      switch (tool) {
        case "resolveAnalystEntities":
          return resolveEntities(
            v2ToolInputs.resolveAnalystEntities.parse(rawInput),
            context,
          );
        case "searchAnalystRecords":
          return searchRecords(
            v2ToolInputs.searchAnalystRecords.parse(rawInput),
            context,
          );
        case "getAnalystRecordDetails":
          return recordDetails(
            v2ToolInputs.getAnalystRecordDetails.parse(rawInput),
            context,
          );
        case "getMoneyBreakdown":
          return moneyBreakdown(
            v2ToolInputs.getMoneyBreakdown.parse(rawInput),
            context,
          );
        case "queryTransactions":
          return transactionQuery(
            v2ToolInputs.queryTransactions.parse(rawInput),
            context,
          );
        case "getGoalAnalysisContext":
          return goalContext(
            v2ToolInputs.getGoalAnalysisContext.parse(rawInput),
            context,
          );
        case "getGoalPace":
          return goalPace(v2ToolInputs.getGoalPace.parse(rawInput), context);
        case "getDecisionAnalysisContext":
          return decisionContext(
            v2ToolInputs.getDecisionAnalysisContext.parse(rawInput),
            context,
          );
        case "getRelationshipPaths":
          return relationshipPaths(
            v2ToolInputs.getRelationshipPaths.parse(rawInput),
            context,
          );
        case "getDataInventory":
          return dataInventory(
            v2ToolInputs.getDataInventory.parse(rawInput),
            context,
          );
      }
    };
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ToolFailure("timeout"));
      }, V2_TOOL_LIMITS.timeoutMs);
    });
    const payload = await Promise.race([work(), deadline]);
    if (transport?.failure) throw transport.failure;
    if (
      !payload.evidence.every(
        (item) => evidenceV2Schema.safeParse(item).success,
      ) ||
      !payload.labels.every((item) => labelSchema.safeParse(item).success) ||
      new Set(payload.evidence.map((item) => item.id)).size !==
        payload.evidence.length
    )
      throw new ToolFailure("invalid_output");
    if (Buffer.byteLength(JSON.stringify(payload)) > V2_TOOL_LIMITS.outputBytes)
      throw new ToolFailure("budget_exceeded");
    return { ...payload, tool, metadata: metadata() };
  } catch (error) {
    const raw =
      transport?.failure?.code ??
      (error instanceof ToolFailure
        ? error.code
        : controller.signal.aborted
          ? "timeout"
          : "unavailable_source");
    const code: V2FailureCode =
      raw === "insufficient_history" || raw === "stale_data"
        ? "unavailable_source"
        : raw;
    return {
      tool,
      status: code === "partial" ? "partial" : "error",
      evidence: [],
      labels: [],
      candidates: [],
      ambiguous: false,
      nextCursor: null,
      limitations: [messages[code]],
      error: { code, message: messages[code] },
      metadata: metadata(),
    };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}

/**
 * The subset of handles the signed-in owner can still read. Used to
 * re-authorize conversation context on every turn: a deleted record and
 * another owner's record are both simply absent. An outage throws rather
 * than silently dropping context.
 */
export async function authorizeHandlesV2(
  handles: string[],
  options: { consent: AnalystConsent | null; route: ProviderRoute },
): Promise<ReadonlySet<string>> {
  const valid = [...new Set(handles)].filter((item) => parseHandle(item));
  const found = new Set<string>();
  for (
    let index = 0;
    index < valid.length;
    index += V2_TOOL_LIMITS.detailHandles
  ) {
    const result = await invokeAnalystToolV2(
      "getAnalystRecordDetails",
      { handles: valid.slice(index, index + V2_TOOL_LIMITS.detailHandles) },
      options,
    );
    if (
      result.status === "error" &&
      result.error?.code !== "unavailable_source"
    )
      throw new ToolFailure(result.error?.code ?? "unavailable_source");
    for (const label of result.labels) found.add(label.handle);
  }
  return found;
}
