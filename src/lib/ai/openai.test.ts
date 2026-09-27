import { afterEach, describe, expect, it, vi } from "vitest";
import { estimatedCostUsdMicros } from "./models";
import { requestStructuredJson, structuredRequestBody } from "./openai";

vi.mock("server-only", () => ({}));
const oldKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = oldKey;
});

const request = (model: string) =>
  JSON.parse(
    structuredRequestBody({
      model,
      schemaName: "test",
      schema: { type: "object" },
      messages: [{ role: "user", content: "hi" }],
      maxOutputTokens: 100,
    }),
  );
const completion = (
  content: string,
  usage: unknown = {
    prompt_tokens: 10,
    completion_tokens: 5,
  },
) =>
  vi.fn().mockResolvedValue(
    Response.json({
      model: "resolved",
      usage,
      choices: [{ finish_reason: "stop", message: { content } }],
    }),
  );
const options = { timeoutMs: 1000, responseBytes: 10_000 };

describe("shared structured OpenAI call", () => {
  it("uses temperature for standard models and reasoning effort otherwise", () => {
    expect(request("gpt-4o-mini-2024-07-18")).toMatchObject({
      temperature: 0,
      store: false,
    });
    const reasoning = request("gpt-5.4-mini");
    expect(reasoning.reasoning_effort).toBe("none");
    expect(reasoning).not.toHaveProperty("temperature");
  });
  it("prices only models with published rates", () => {
    expect(estimatedCostUsdMicros("gpt-4o-mini-2024-07-18", 1000, 100)).toBe(
      210,
    );
    expect(estimatedCostUsdMicros("gpt-5.4-mini", 1000, 100)).toBeNull();
  });
  it("parses JSON content and usage", async () => {
    process.env.OPENAI_API_KEY = "k";
    expect(
      await requestStructuredJson("{}", {
        ...options,
        fetch: completion('{"a":1}'),
      }),
    ).toEqual({
      status: "ok",
      content: { a: 1 },
      resolvedModel: "resolved",
      inputTokens: 10,
      outputTokens: 5,
    });
  });
  it("maps failures without provider text", async () => {
    process.env.OPENAI_API_KEY = "k";
    expect(
      await requestStructuredJson("{}", {
        ...options,
        fetch: completion("not json"),
      }),
    ).toMatchObject({ status: "error", code: "invalid_response" });
    expect(
      await requestStructuredJson("{}", {
        ...options,
        fetch: completion("{}", { prompt_tokens: -1 }),
      }),
    ).toMatchObject({ status: "error", code: "invalid_response" });
    expect(
      await requestStructuredJson("{}", {
        ...options,
        fetch: vi
          .fn()
          .mockResolvedValue(Response.json({ secret: 1 }, { status: 429 })),
      }),
    ).toEqual({ status: "error", code: "provider_rate_limit" });
    expect(
      await requestStructuredJson("{}", {
        timeoutMs: 1000,
        responseBytes: 10,
        fetch: completion('{"a":1}'),
      }),
    ).toMatchObject({ status: "error", code: "invalid_response" });
    delete process.env.OPENAI_API_KEY;
    expect(await requestStructuredJson("{}", options)).toEqual({
      status: "error",
      code: "configuration_error",
    });
  });
});
