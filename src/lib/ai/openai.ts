import "server-only";
import { reasoningEffortFor } from "./models";
import {
  meteredOpenAIFetch,
  PoolExhaustedError,
  PoolMeterError,
  type PoolFeature,
} from "./pool-meter";

/**
 * Shared bounded call to OpenAI Chat Completions with strict JSON output.
 * It maps provider failures to safe codes, caps the response size, and never
 * returns provider error text. Feature code keeps its own budgets and
 * validation.
 */

export type StructuredCallFailure =
  | "configuration_error"
  | "timeout"
  | "provider_auth"
  | "model_access"
  | "provider_rate_limit"
  | "provider_error"
  | "invalid_response"
  /** The model's free daily pool is used up; nothing was sent. */
  | "pool_exhausted"
  /** The daily pool meter could not reserve; nothing was sent. */
  | "meter_unavailable";

export type StructuredCallResult =
  | {
      status: "ok";
      content: unknown;
      resolvedModel: string | null;
      inputTokens: number | undefined;
      outputTokens: number | undefined;
    }
  | {
      status: "error";
      code: StructuredCallFailure;
      resolvedModel?: string | null;
      inputTokens?: number;
      outputTokens?: number;
    };

export type StructuredMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StructuredCallRequest = {
  model: string;
  schemaName: string;
  schema: unknown;
  messages: StructuredMessage[];
  maxOutputTokens: number;
  /** Overrides the model's default effort; ignored for non-reasoning models. */
  reasoningEffort?: "none" | "low" | "medium";
};

/** The request body, exposed so callers can bound its size before sending. */
export function structuredRequestBody(request: StructuredCallRequest) {
  const defaultEffort = reasoningEffortFor(request.model);
  const effort = defaultEffort && (request.reasoningEffort ?? defaultEffort);
  return JSON.stringify({
    model: request.model,
    store: false,
    ...(effort ? { reasoning_effort: effort } : { temperature: 0 }),
    max_completion_tokens: request.maxOutputTokens,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: request.schema,
      },
    },
    messages: request.messages,
  });
}

export function providerFailure(status: number): StructuredCallFailure {
  if (status === 401) return "provider_auth";
  if (status === 403) return "model_access";
  if (status === 429) return "provider_rate_limit";
  return "provider_error";
}

export async function readBoundedText(response: Response, maxBytes: number) {
  if (!response.body) return null;
  const reportedLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(reportedLength) && reportedLength > maxBytes) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}

const tokenCount = (value: unknown) =>
  value === undefined
    ? undefined
    : Number.isSafeInteger(value) && (value as number) >= 0
      ? (value as number)
      : null;

export async function requestStructuredJson(
  body: string,
  options: {
    timeoutMs: number;
    responseBytes: number;
    fetch?: typeof globalThis.fetch;
    /** Which feature's reservation this is in the daily pool ledger. */
    feature: PoolFeature;
  },
): Promise<StructuredCallResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { status: "error", code: "configuration_error" };
  let request: { model?: unknown; max_completion_tokens?: unknown };
  try {
    request = JSON.parse(body);
  } catch {
    return { status: "error", code: "configuration_error" };
  }
  if (
    typeof request.model !== "string" ||
    !Number.isSafeInteger(request.max_completion_tokens)
  )
    return { status: "error", code: "configuration_error" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    // Bytes bound the prompt's tokens, so this is its largest possible size.
    const response = await meteredOpenAIFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body,
      },
      {
        model: request.model,
        feature: options.feature,
        reserveTokens:
          Buffer.byteLength(body) + (request.max_completion_tokens as number),
        fetch: options.fetch,
      },
    );
    if (!response.ok)
      return { status: "error", code: providerFailure(response.status) };
    const text = await readBoundedText(response, options.responseBytes);
    if (text === null) return { status: "error", code: "invalid_response" };
    let parsed: {
      model?: string;
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string; refusal?: string };
      }>;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: "error", code: "invalid_response" };
    }
    const resolvedModel = parsed.model ?? null;
    const inputTokens = tokenCount(parsed.usage?.prompt_tokens);
    const outputTokens = tokenCount(parsed.usage?.completion_tokens);
    if (inputTokens === null || outputTokens === null)
      return { status: "error", code: "invalid_response", resolvedModel };
    const choice = parsed.choices?.[0];
    const failed = {
      status: "error" as const,
      code: "invalid_response" as const,
      resolvedModel,
      inputTokens,
      outputTokens,
    };
    if (
      choice?.finish_reason !== "stop" ||
      choice.message?.refusal ||
      !choice.message?.content
    )
      return failed;
    try {
      return {
        status: "ok",
        content: JSON.parse(choice.message.content),
        resolvedModel,
        inputTokens,
        outputTokens,
      };
    } catch {
      return failed;
    }
  } catch (error) {
    if (error instanceof PoolExhaustedError)
      return { status: "error", code: "pool_exhausted" };
    if (error instanceof PoolMeterError)
      return { status: "error", code: "meter_unavailable" };
    return {
      status: "error",
      code:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "provider_error",
    };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
