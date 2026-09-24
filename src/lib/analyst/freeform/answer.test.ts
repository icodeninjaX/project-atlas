import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { requestGroundedAnswer, validateGroundedAnswer } from "./answer";

vi.mock("server-only", () => ({}));
const priorKey = process.env.OPENAI_API_KEY;
const evidence: ToolEvidence[] = [
  {
    id: "money.current",
    metric: "Recorded expenses",
    value: 12345,
    unit: "centavos",
    period: { from: "2026-09-01", through: "2026-09-24" },
    comparisonBasis: "Recorded expense transactions",
    completeness: "complete",
    source: {
      description: "Transactions",
      recordIds: ["record-a"],
      href: "/money/transactions",
    },
    claimType: "FACT",
    provenance: {
      tool: "getMoneySummary",
      calculationVersion: "1",
      retrievedAt: "2026-09-24T00:00:00Z",
      textTrust: "untrusted_data",
    },
  },
];
const valid = {
  claims: [
    {
      kind: "interpretation",
      text: "This may warrant a closer look at the recorded expenses.",
      evidenceIds: ["money.current"],
    },
  ],
};

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});
afterEach(() => {
  if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = priorKey;
});

describe("freeform claim validation", () => {
  it("requires an evidence citation for every claim", () => {
    expect(validateGroundedAnswer(valid, evidence)).toEqual(valid.claims);
    expect(
      validateGroundedAnswer(
        { claims: [{ ...valid.claims[0], evidenceIds: ["other-owner"] }] },
        evidence,
      ),
    ).toBeNull();
    expect(
      validateGroundedAnswer(
        { claims: [{ ...valid.claims[0], evidenceIds: [] }] },
        evidence,
      ),
    ).toBeNull();
  });
  it("rejects figures, causal claims, direction and unsupported certainty", () => {
    for (const text of [
      "Expenses increased by 25%.",
      "Debt fell because income rose.",
      "This always proves progress.",
      "Your finances are healthy.",
    ]) {
      expect(
        validateGroundedAnswer(
          { claims: [{ ...valid.claims[0], text }] },
          evidence,
        ),
      ).toBeNull();
    }
  });
  it("does not recommend action from incomplete data", () => {
    const suggestion = {
      claims: [
        {
          kind: "suggestion",
          text: "Consider reviewing the recorded expenses for context.",
          evidenceIds: ["money.current"],
        },
      ],
    };
    expect(validateGroundedAnswer(suggestion, evidence)).toEqual(
      suggestion.claims,
    );
    expect(
      validateGroundedAnswer(suggestion, [
        { ...evidence[0]!, completeness: "partial" },
      ]),
    ).toBeNull();
  });
});

describe("freeform provider boundary", () => {
  it("does not contact the provider when evidence exceeds the bounded context", async () => {
    const fetch = vi.fn();
    const result = await requestGroundedAnswer(
      "How is my money?",
      Array.from({ length: 13 }, (_, i) => ({
        ...evidence[0]!,
        id: `item-${i}`,
      })),
      { fetch },
    );
    expect(result).toEqual({ status: "error", code: "context_limit" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts structured cited claims and rejects invalid citations", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          usage: { prompt_tokens: 100, completion_tokens: 30 },
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(valid) },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(
      await requestGroundedAnswer("How is my money?", evidence, { fetch }),
    ).toMatchObject({ status: "answered", claims: valid.claims });
    const sent = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(sent.store).toBe(false);
    expect(sent.messages[1].content).not.toContain("record-a");
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          usage: { prompt_tokens: 100, completion_tokens: 30 },
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  claims: [{ ...valid.claims[0], evidenceIds: ["invented"] }],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(
      await requestGroundedAnswer("How is my money?", evidence, { fetch }),
    ).toMatchObject({
      status: "error",
      code: "invalid_response",
      inputTokens: 100,
      outputTokens: 30,
    });
  });
});
