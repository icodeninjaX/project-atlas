import "server-only";
import { reasoningEffortFor } from "./models";

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
  | "invalid_response";

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

export type StructuredCallRequest = {
  model: string;
  schemaName: string;
  schema: unknown;
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxOutputTokens: number;
};

/** The request body, exposed so callers can bound its size before sending. */
export function structuredRequestBody(request: StructuredCallRequest) {
  const effort = reasoningEffortFor(request.model);
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
  },
): Promise<StructuredCallResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { status: "error", code: "configuration_error" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await (options.fetch ?? globalThis.fetch)(
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
