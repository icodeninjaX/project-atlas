import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import {
  requestGroundedAnswer,
  reviewGroundedAnswer,
  validateGroundedAnswer,
} from "./answer";

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
  it("keeps a minus after punctuation and allows spaced ranges", () => {
    const r = {
      ...income,
      id: "r",
      metric: "Association coefficient",
      unit: "correlation" as const,
      value: 0.5,
    };
    const one = (text: string, items: ToolEvidence[], ids: string[]) =>
      validateGroundedAnswer(
        {
          claims: [
            { kind: "observation", text, evidenceIds: ids, comparison: null },
          ],
        },
        items,
      );
    expect(one("The recorded coefficient was r=-0.5.", [r], ["r"])).toBeNull();
    expect(
      one("The recorded coefficient was r=0.5.", [r], ["r"]),
    ).not.toBeNull();
    expect(
      one(
        "The recorded coefficient was r=-0.5.",
        [{ ...r, value: -0.5 }],
        ["r"],
      ),
    ).not.toBeNull();
    const low = { ...income, id: "low", value: 10000 };
    const high = { ...income, id: "high", value: 20000 };
    expect(
      one(
        "Recorded amounts ranged from ₱100.00 - ₱200.00 this month.",
        [low, high],
        ["low", "high"],
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
    // Advice is dropped; the verified baseline-versus-option claim stays.
    const withClaim = (kind: string, text: string) =>
      reviewGroundedAnswer(
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
    for (const [kind, text] of [
      ["suggestion", "Consider using Option 1 for runway."],
      ["interpretation", "Option 1 may be the better choice here."],
      [
        "suggestion",
        "Consider reviewing the stated assumptions, then using Option 1.",
      ],
    ] as const) {
      const review = withClaim(kind, text);
      expect(review?.claims).toHaveLength(1);
      expect(review?.rejections).toEqual([
        { index: 1, reason: "scenario_advice" },
      ]);
    }
    expect(
      withClaim(
        "suggestion",
        "Consider reviewing the stated assumptions behind each option.",
      )?.claims,
    ).toHaveLength(2);
  });
});

describe("per-claim review", () => {
  it("keeps verified claims and reports why others were dropped", () => {
    const review = reviewGroundedAnswer(
      {
        claims: [
          {
            kind: "observation",
            text: "Recorded expenses were ₱123.45 this month.",
            evidenceIds: ["money.current"],
            comparison: null,
          },
          {
            kind: "observation",
            text: "Most of the expenses went to food this month.",
            evidenceIds: ["money.current"],
            comparison: null,
          },
          {
            kind: "interpretation",
            text: "Recorded expenses were ₱999.00 this month.",
            evidenceIds: ["money.current"],
            comparison: null,
          },
        ],
      },
      evidence,
    );
    expect(review?.claims.map((item) => item.text)).toEqual([
      "Recorded expenses were ₱123.45 this month.",
    ]);
    expect(review?.rejections).toEqual([
      { index: 1, reason: "wording" },
      { index: 2, reason: "unhedged_interpretation" },
    ]);
  });
  it("allows cited period days only inside month-day dates", () => {
    const one = (text: string) =>
      validateGroundedAnswer(
        {
          claims: [
            {
              kind: "observation",
              text,
              evidenceIds: ["money.current"],
              comparison: null,
            },
          ],
        },
        evidence,
      );
    expect(one("Recorded expenses were ₱123.45 for Sept 1–24.")).not.toBeNull();
    // A bare period day is not a count, and an uncited day is not a period.
    expect(one("There were 24 recorded expense transactions.")).toBeNull();
    expect(one("Recorded expenses were ₱123.45 by September 10.")).toBeNull();
    expect(one("Recorded expenses were ₱123.45 by October 24.")).toBeNull();
  });
  it("allows day numbers of cited period dates", () => {
    expect(
      validateGroundedAnswer(
        {
          claims: [
            {
              kind: "observation",
              text: "Recorded expenses were ₱123.45 from September 1 to September 24.",
              evidenceIds: ["money.current"],
              comparison: null,
            },
          ],
        },
        evidence,
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
    const invented = () =>
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
      );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rejecting = vi.fn().mockImplementation(async () => invented());
    // Invented citations fail both the first answer and the one repair.
    expect(
      await requestGroundedAnswer("How is my money?", evidence, {
        fetch: rejecting,
      }),
    ).toMatchObject({
      status: "error",
      code: "invalid_response",
      inputTokens: 200,
      outputTokens: 60,
    });
    expect(warn).toHaveBeenCalledWith("Grounded answer rejected", {
      attempt: 0,
      reasons: ["citation"],
    });
    warn.mockRestore();
  });
});

describe("grounded answer repair attempt", () => {
  const completion = (content: unknown) =>
    new Response(
      JSON.stringify({
        usage: { prompt_tokens: 100, completion_tokens: 30 },
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(content) },
          },
        ],
      }),
      { status: 200 },
    );
  const rejected = {
    claims: [
      {
        kind: "observation",
        text: "Recorded expenses were ₱999.00 this month.",
        evidenceIds: ["money.current"],
        comparison: null,
      },
    ],
  };

  it("retries once with the rejection reasons and returns the fixed answer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(completion(rejected))
      .mockResolvedValueOnce(completion(valid));
    const result = await requestGroundedAnswer("How is my money?", evidence, {
      fetch,
    });
    expect(result).toMatchObject({
      status: "answered",
      claims: valid.claims,
      inputTokens: 200,
      outputTokens: 60,
    });
    const retry = JSON.parse(fetch.mock.calls[1]![1].body);
    expect(retry.messages.at(-2)).toMatchObject({ role: "assistant" });
    expect(retry.messages.at(-1).content).toContain(
      "Claim 1 contains a number or date",
    );
    // Only rule names are logged, never claim text.
    expect(JSON.stringify(warn.mock.calls)).not.toContain("999");
    expect(warn).toHaveBeenCalledWith("Grounded answer rejected", {
      attempt: 0,
      reasons: ["figure"],
    });
    warn.mockRestore();
  });
  it("gives up after one repair attempt", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.fn().mockImplementation(async () => completion(rejected));
    expect(
      await requestGroundedAnswer("How is my money?", evidence, { fetch }),
    ).toMatchObject({
      status: "error",
      code: "invalid_response",
      inputTokens: 200,
      outputTokens: 60,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
