import "server-only";
import { estimatedCostUsdMicros } from "@/lib/ai/models";
import {
  requestStructuredJson,
  structuredRequestBody,
  type StructuredCallFailure,
} from "@/lib/ai/openai";
import type { BudgetRefusal, RunLedger } from "./budgets";
import {
  assertProviderPayload,
  filterProviderPayload,
  ProviderPolicyViolation,
  type AnalystConsent,
  type ProviderPayload,
  type ProviderRoute,
} from "./policy";

/**
 * One provider call for a model stage: the analysis planner (before
 * retrieval) or an answer stage (AI-05): writer, critic or repair.
 * The request content is rendered only from the policy-filtered payload and
 * asserted again before sending; the call must fit the run ledger; usage is
 * charged from the provider's report or, when unknown, at the reserved
 * maximum. Calls go through the existing metered gateway and are recorded
 * under the `analyst_answer` pool feature.
 */

export type StageRequest = {
  stage: "planner" | "writer" | "critic" | "repair";
  model: string;
  schemaName: string;
  schema: unknown;
  system: string;
  payload: ProviderPayload;
  /** Builds the user message from the filtered payload only. */
  render: (payload: ProviderPayload) => unknown;
  /** Earlier turns of this stage, such as a rejected draft for repair. */
  extraMessages?: Array<{ role: "assistant" | "user"; content: string }>;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type StageResult =
  | { status: "ok"; content: unknown; resolvedModel: string | null }
  | {
      status: "error";
      code: StructuredCallFailure | BudgetRefusal | "policy" | "cost_unknown";
    };

export type StageCaller = (request: StageRequest) => Promise<StageResult>;

export function createStageCaller(options: {
  ledger: RunLedger;
  consent: AnalystConsent | null;
  route: ProviderRoute;
  fetch?: typeof globalThis.fetch;
}): StageCaller {
  return async (request) => {
    const { payload } = filterProviderPayload(
      request.payload,
      options.consent,
      options.route,
    );
    try {
      assertProviderPayload(payload, options.consent, options.route);
    } catch (error) {
      if (error instanceof ProviderPolicyViolation)
        return { status: "error", code: "policy" };
      throw error;
    }
    const body = structuredRequestBody({
      model: request.model,
      schemaName: request.schemaName,
      schema: request.schema,
      maxOutputTokens: request.maxOutputTokens,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: JSON.stringify(request.render(payload)) },
        ...(request.extraMessages ?? []),
      ],
    });
    // Bytes bound the prompt's tokens, so this is the call's largest size.
    const reservedTokens = Buffer.byteLength(body) + request.maxOutputTokens;
    const reservedCost = estimatedCostUsdMicros(
      request.model,
      Buffer.byteLength(body),
      request.maxOutputTokens,
    );
    if (reservedCost === null) return { status: "error", code: "cost_unknown" };
    const refusal = options.ledger.canCallAnswerStage(
      reservedTokens,
      reservedCost,
      request.timeoutMs,
    );
    if (refusal) return { status: "error", code: refusal };
    const result = await requestStructuredJson(body, {
      timeoutMs: request.timeoutMs,
      responseBytes: 64_000,
      fetch: options.fetch,
      feature: "analyst_answer",
      // The non-sharing route is its own provider project, outside the
      // shared project's complimentary pools.
      ...(options.route.id === "openai_non_sharing" && {
        unpooledKey: process.env.OPENAI_NON_SHARING_API_KEY ?? "",
      }),
    });
    const known =
      result.inputTokens !== undefined && result.outputTokens !== undefined;
    // A refused pooled call sent nothing; anything else may have been billed.
    const sentNothing =
      result.status === "error" &&
      (result.code === "pool_exhausted" ||
        result.code === "meter_unavailable" ||
        result.code === "configuration_error");
    if (!sentNothing)
      options.ledger.recordProvider(
        known
          ? {
              tokens: result.inputTokens! + result.outputTokens!,
              inputTokens: result.inputTokens!,
              outputTokens: result.outputTokens!,
              costUsdMicros: estimatedCostUsdMicros(
                request.model,
                result.inputTokens!,
                result.outputTokens!,
              ),
            }
          : { tokens: null, costUsdMicros: null },
        {
          tokens: reservedTokens,
          costUsdMicros: reservedCost,
          inputTokens: Buffer.byteLength(body),
          outputTokens: request.maxOutputTokens,
        },
      );
    if (result.status === "error")
      return { status: "error", code: result.code };
    return {
      status: "ok",
      content: result.content,
      resolvedModel: result.resolvedModel,
    };
  };
}
