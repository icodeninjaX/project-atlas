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
      comparison: null,
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
  it("rejects unverified figures, causal claims, direction and unsupported certainty", () => {
    for (const text of [
      "Expenses increased by 25%.",
      "Recorded expenses were ₱999.00 this month.",
      "Recorded expenses were about 5k this month.",
      "Expenses reached a thousand pesos this month.",
      "Debt fell because income rose.",
      "This always proves progress.",
      "These patterns may explain the change in tasks.",
      "This may be a cause of task completion.",
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
  it("rejects a preferred or guaranteed financial scenario", () => {
    const scenario = {
      ...evidence[0]!,
      provenance: {
        ...evidence[0]!.provenance,
        tool: "compareFinancialScenarios" as const,
      },
    };
    for (const text of [
      "This may be the best option for your finances.",
      "This option might be safe to choose.",
      "This could guarantee your financial security.",
    ]) {
      expect(
        validateGroundedAnswer({ claims: [{ ...valid.claims[0], text }] }, [
          scenario,
        ]),
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
          comparison: null,
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
  it("does not turn whole-domain history into goal-specific evidence", () => {
    const wholeDomain = {
      ...evidence[0]!,
      id: "history",
      provenance: {
        ...evidence[0]!.provenance,
        tool: "getCrossDomainHistory" as const,
      },
    };
    const goalLink = {
      ...evidence[0]!,
      id: "goal-link",
      provenance: {
        ...evidence[0]!.provenance,
        tool: "getGoalLinkedActivity" as const,
      },
    };
    expect(
      validateGroundedAnswer(
        {
          claims: [
            { ...valid.claims[0], evidenceIds: ["history", "goal-link"] },
          ],
        },
        [wholeDomain, goalLink],
      ),
    ).toBeNull();
  });
});

const income: ToolEvidence = {
  ...evidence[0]!,
  id: "money.income",
  metric: "Recorded income",
  value: 20000,
};

describe("verified figures and comparisons", () => {
  const observe = (
    text: string,
    comparison: unknown = null,
    evidenceIds = ["money.current", "money.income"],
  ) =>
    validateGroundedAnswer(
      { claims: [{ kind: "observation", text, evidenceIds, comparison }] },
      [...evidence, income],
    );

  it("accepts figures copied from or derived from cited evidence", () => {
    for (const text of [
      "Recorded expenses were ₱123.45 for 2026-09-01 to 2026-09-24.",
      "Recorded expenses were about ₱123 against ₱200.00 of income in 2026.",
      "Income and expenses differ by ₱76.55 across the recorded period.",
      "Recorded expenses were 38% less than recorded income.",
    ])
      expect(
        observe(
          text,
          /less than/.test(text)
            ? {
                subjectId: "money.current",
                referenceId: "money.income",
                direction: "lower",
              }
            : null,
        ),
        text,
      ).not.toBeNull();
  });
  it("preserves the sign of a cited figure", () => {
    expect(observe("Recorded expenses were -₱123.45 this month.")).toBeNull();
    const refund = { ...income, id: "refund", value: -5000 };
    const signed = (text: string) =>
      validateGroundedAnswer(
        {
          claims: [
            {
              kind: "observation",
              text,
              evidenceIds: ["refund"],
              comparison: null,
            },
          ],
        },
        [refund],
      );
    expect(
      signed("The recorded change was -₱50.00 this month."),
    ).not.toBeNull();
    expect(signed("The recorded change was ₱50.00 this month.")).toBeNull();
    expect(
      observe(
        "Income and expenses differ by ₱76.55 in 2026-09-01 to 2026-09-24.",
      ),
    ).not.toBeNull();
  });
  it("reads a bare hyphenated range as two unsigned figures", () => {
    const low = { ...income, id: "low", unit: "months" as const, value: 4 };
    const high = { ...low, id: "high", value: 6 };
    expect(
      validateGroundedAnswer(
        {
          claims: [
            {
              kind: "observation",
              text: "Runway ranges from 4-6 months across the options.",
              evidenceIds: ["low", "high"],
              comparison: null,
            },
          ],
        },
        [low, high],
      ),
    ).not.toBeNull();
  });
  it("rejects figures from uncited evidence and unknown dates", () => {
    expect(
      observe("Recorded income was ₱200.00.", null, ["money.current"]),
    ).toBeNull();
    expect(observe("Recorded expenses were ₱123.45 on 2026-10-02.")).toBeNull();
  });
  it("requires a declared comparison that matches the values", () => {
    const lower = {
      subjectId: "money.current",
      referenceId: "money.income",
      direction: "lower",
    };
    expect(observe("Recorded expenses were lower than income.")).toBeNull();
    expect(observe("Recorded expenses were lower than income.", lower)).toEqual(
      expect.any(Array),
    );
    expect(
      observe("Recorded expenses were higher than income.", {
        ...lower,
        direction: "higher",
      }),
    ).toBeNull();
    expect(
      observe("Recorded expenses were higher than income.", lower),
    ).toBeNull();
    expect(
      observe("Recorded expenses were lower than income.", lower, [
        "money.current",
      ]),
    ).toBeNull();
  });
  it("still requires scenario claims to cite a baseline and an option", () => {
    const tool = "compareFinancialScenarios" as const;
    const current = {
      ...evidence[0]!,
      id: "current",
      metric: "Current · Runway",
      unit: "months" as const,
      value: 4,
      provenance: { ...evidence[0]!.provenance, tool },
    };
    const option = {
      ...current,
      id: "option",
      metric: "Option 1 · Runway",
      value: 6,
    };
    const claim = (evidenceIds: string[]) => ({
      claims: [
        {
          kind: "observation",
          text: "Option 1 shows 6 months of runway against 4 months today.",
          evidenceIds,
          comparison: null,
        },
      ],
    });
    expect(
      validateGroundedAnswer(claim(["current", "option"]), [current, option]),
    ).not.toBeNull();
    expect(
      validateGroundedAnswer(claim(["option"]), [current, option]),
    ).toBeNull();
    const withClaim = (kind: string, text: string) =>
      validateGroundedAnswer(
        {
          claims: [
            claim(["current", "option"]).claims[0],
            {
              kind,
              text,
              evidenceIds: ["current", "option"],
              comparison: null,
            },
          ],
        },
        [current, option],
      );
    expect(
      withClaim("suggestion", "Consider using Option 1 for runway."),
    ).toBeNull();
    expect(
      withClaim("interpretation", "Option 1 may be the better choice here."),
    ).toBeNull();
    expect(
      withClaim(
        "suggestion",
        "Consider reviewing the stated assumptions, then using Option 1.",
      ),
    ).toBeNull();
    expect(
      withClaim(
        "suggestion",
        "Consider reviewing the stated assumptions behind each option.",
      ),
    ).not.toBeNull();
  });
});

describe("freeform provider boundary", () => {
  it("sends earlier exchanges as context only when present", async () => {
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
    const history = [
      {
        question: "How did I spend in August?",
        answer: "It may be worth a look.",
      },
    ];
    await requestGroundedAnswer("What about September?", evidence, {
      fetch,
      history,
    });
    const sent = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(JSON.parse(sent.messages.at(-1).content).previousExchanges).toEqual(
      history,
    );
    expect(sent.messages.at(-2).content).toContain("previousExchanges");
    await requestGroundedAnswer("What about September?", evidence, { fetch });
    const plain = JSON.parse(fetch.mock.calls[1]![1].body);
    expect(JSON.parse(plain.messages.at(-1).content)).not.toHaveProperty(
      "previousExchanges",
    );
  });
  it("does not contact the provider when evidence exceeds the bounded context", async () => {
    const fetch = vi.fn();
    const result = await requestGroundedAnswer(
      "How is my money?",
      Array.from({ length: 17 }, (_, i) => ({
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
    expect(sent.messages.at(-1).content).not.toContain("record-a");
    expect(JSON.parse(sent.messages.at(-1).content).evidence[0].display).toBe(
      "₱123.45",
    );
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
