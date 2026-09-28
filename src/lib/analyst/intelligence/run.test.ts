import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import { OWNER_A } from "./evaluation/fixtures";
import {
  createEmulator,
  fixtureTables,
  type Emulator,
} from "./evaluation/postgrest";
import {
  detectLanguage,
  detectStyle,
  formatDay,
  formatMoney,
} from "./language";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { safeProgress, type V2ProgressEvent } from "./progress";
import { runAnalystV2, type V2Response } from "./run";
import { createStageCaller } from "./stages";
import { authorizeHandlesV2, invokeAnalystToolV2 } from "./tools/server";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  createClient: vi.fn(),
  exhausted: new Set<string>(),
  meterDown: false,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));
vi.mock("@/lib/ai/pool-meter", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/pool-meter")>();
  return {
    ...original,
    // The meter has its own tests; here it passes through, or refuses a
    // model whose pool is marked used up, before anything is sent.
    meteredOpenAIFetch: (
      url: string,
      init: RequestInit,
      options: { model: string; fetch?: typeof fetch },
    ) => {
      if (state.exhausted.has(options.model))
        throw new original.PoolExhaustedError("large");
      if (state.meterDown) throw new original.PoolMeterError("synthetic");
      return (options.fetch ?? globalThis.fetch)(url, init);
    },
  };
});

const now = new Date("2026-09-24T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const key = randomBytes(32);
let emulator: Emulator;
let providerRequests: Array<{
  model: string;
  schema: string;
  input: Record<string, unknown>;
}>;
type Evidence = {
  id: string;
  value?: number;
  scope: { type: string };
  period: { from: string; through: string };
  measure: string;
};
let writer: (input: Record<string, unknown>) => unknown;
/** The analysis planner's reply, for runs that configure a planner model. */
let planner: (input: Record<string, unknown>) => unknown;
/** Injected provider or source faults for the AI-07 fault suite. */
let fault:
  | null
  | "timeout"
  | "invalid_output"
  | "missing_usage"
  | "http_error"
  | "source_error";

const pesos = (centavos: number) =>
  `₱${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centavos / 100)}`;

/** A writer that cites the whole-period expense total it was given. */
function totalWriter(extra: (total: Evidence) => unknown[] = () => []) {
  return (input: Record<string, unknown>) => {
    const evidence = input.evidence as Evidence[];
    const total = evidence.find(
      (item) =>
        item.scope.type === "whole_domain" &&
        item.measure === "expense_centavos",
    )!;
    const requirement = (input.requirements as Array<{ id: string }>)[0]!.id;
    return {
      version: "2",
      directAnswerClaimIds: ["c1"],
      claims: [
        {
          id: "c1",
          kind: "fact",
          text: `Recorded expenses were ${pesos(total.value!)} from ${total.period.from} to ${total.period.through}.`,
          answersRequirementIds: [requirement],
          evidenceIds: [total.id],
          derivedFactIds: [],
          assumptionIds: [],
          scopeId: "whole_domain:expense",
          comparison: null,
          recommendation: null,
        },
        ...(extra(total) as object[]),
      ],
      sections: [],
      table: null,
    };
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now });
  process.env.OPENAI_API_KEY = "sk-synthetic";
  state.exhausted.clear();
  state.meterDown = false;
  fault = null;
  providerRequests = [];
  writer = totalWriter();
  planner = () => ({ not: "a plan" });
  emulator = createEmulator(fixtureTables(), OWNER_A);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      if (url.hostname !== "api.openai.com") {
        if (fault === "source_error" && url.pathname.startsWith("/rest/"))
          return Response.json({ message: "unavailable" }, { status: 503 });
        return emulator.fetch(input, init);
      }
      const body = JSON.parse(String(init?.body));
      const payload = JSON.parse(body.messages[1].content);
      providerRequests.push({
        model: body.model,
        schema: body.response_format.json_schema.name,
        input: payload,
      });
      if (fault === "timeout")
        throw Object.assign(new Error("The operation was aborted."), {
          name: "AbortError",
        });
      if (fault === "http_error")
        return Response.json({ error: { message: "down" } }, { status: 500 });
      return Response.json({
        model: body.model,
        ...(fault !== "missing_usage" && {
          usage: { prompt_tokens: 800, completion_tokens: 200 },
        }),
        choices: [
          {
            finish_reason: "stop",
            message: {
              content:
                fault === "invalid_output"
                  ? "not json"
                  : JSON.stringify(
                      body.response_format.json_schema.name ===
                        "atlas_analysis_plan"
                        ? planner(payload)
                        : writer(payload),
                    ),
            },
          },
        ],
      });
    }),
  );
  state.createClient.mockImplementation(
    async (options: { fetch?: typeof fetch } = {}) => {
      const client = createSupabaseClient(
        "http://localhost:54321",
        "synthetic-key",
        {
          global: { fetch: options.fetch },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const getUser = client.auth.getUser.bind(client.auth);
      client.auth.getUser = () => getUser("synthetic-access-token");
      return client;
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function ask(
  question: string,
  options: {
    model?: AnalystModelId;
    context?: string | null;
    contextKey?: Buffer | null;
    consent?: typeof consent;
    signal?: AbortSignal;
    planModel?: string;
  } = {},
) {
  const events: V2ProgressEvent[] = [];
  const granted = options.consent ?? consent;
  const policy = { consent: granted, route: SHARED_ROUTE };
  const result = runAnalystV2(
    {
      ownerId: OWNER_A,
      question,
      contextToken: options.context ?? null,
      model: options.model ?? AI_MODELS.analyst,
      consent: granted,
      route: SHARED_ROUTE,
    },
    {
      invoke: (tool, input) => invokeAnalystToolV2(tool, input, policy),
      authorize: (handles) => authorizeHandlesV2(handles, policy),
      stageCaller: (ledger) =>
        createStageCaller({ ledger, consent: granted, route: SHARED_ROUTE }),
      contextKey: options.contextKey === undefined ? key : options.contextKey,
      now: () => now,
      clock: () => 0,
      emit: (event) => events.push(event),
      signal: options.signal,
      planModel: options.planModel ?? null,
    },
  );
  return { result, events };
}

describe("Analyst V2 end to end (mocked provider)", () => {
  it("answers a lookup with the chosen writer and reports safe progress", async () => {
    const { result, events } = ask("How much did I spend this month?", {
      model: "gpt-5.4-mini-2026-03-17",
    });
    const response = await result;
    expect(response.status).toBe("answered");
    expect(response.presentation.direct[0]?.text).toBe(
      "Recorded expenses were ₱11,000.00 from Sep 1, 2026 to Sep 24, 2026.",
    );
    // The chosen model writes; planning stays deterministic and is recorded as such.
    expect(providerRequests.map((item) => [item.schema, item.model])).toEqual([
      ["atlas_answer_v2", "gpt-5.4-mini-2026-03-17"],
    ]);
    expect(response.models).toMatchObject({
      planner: { requested: "deterministic" },
      writer: {
        requested: "gpt-5.4-mini-2026-03-17",
        resolved: "gpt-5.4-mini-2026-03-17",
      },
      reviewer: null,
      fallback: false,
    });
    expect(
      events.map((event) =>
        event.stage === "reading"
          ? `reading:${event.round}:${event.domains.join()}`
          : event.stage,
      ),
    ).toEqual(["understanding", "reading:1:money", "writing", "checking"]);
    // Progress never carries record text, figures or percentages.
    expect(JSON.stringify(events)).not.toMatch(/₱|Groceries|%|\d{3,}/);
    expect(response.outcome).toBe("success");
    expect(response.usage).toMatchObject({
      providerCalls: 1,
      inputTokens: 800,
      outputTokens: 200,
    });
  });

  it("falls back from a used-up large pool and discloses it exactly once", async () => {
    state.exhausted.add("gpt-6-sol");
    const response = await ask("How much did I spend this month?", {
      model: "gpt-6-sol",
    }).result;
    expect(response.status).toBe("answered");
    expect(providerRequests.map((item) => item.model)).toEqual([
      AI_MODELS.analyst,
    ]);
    const disclosures = response.presentation.limitations.filter((item) =>
      item.includes("free daily allowance"),
    );
    expect(disclosures).toEqual([
      "GPT-6 Sol's free daily allowance is used up, so GPT-4o mini wrote this answer. It resets at 8:00 AM Manila time.",
    ]);
    expect(response.models).toMatchObject({
      fallback: true,
      writer: { requested: "gpt-6-sol", resolved: AI_MODELS.analyst },
    });
  });

  it("compares two extra payments against one runway baseline (Q10)", async () => {
    writer = () => ({
      version: "2",
      directAnswerClaimIds: [],
      claims: [],
      sections: [],
      table: null,
    });
    await ask(
      "Compare paying an extra ₱2,000 monthly versus ₱4,000 monthly on my Synthetic Card debt.",
    ).result;
    // The writer's first draft request carries the selected evidence.
    const evidence = providerRequests.find(
      (item) => item.schema === "atlas_answer_v2",
    )!.input.evidence as Array<{ definition: string; value?: number }>;
    const months = (label: string) =>
      evidence.find((item) => item.definition === `${label} · Runway estimate`)
        ?.value;
    // ₱60,000.00 liquid over a monthly need of ₱9,500.00 essentials plus the
    // ₱2,000.00 card minimum, plus each extra payment.
    expect(months("Current")).toBeCloseTo(6_000_000 / 1_150_000, 6);
    expect(months("Option 1")).toBeCloseTo(6_000_000 / 1_350_000, 6);
    expect(months("Option 2")).toBeCloseTo(6_000_000 / 1_550_000, 6);
  });

  it("asks to confirm an income assumption, then runs the scenario on yes (Q43)", async () => {
    writer = () => ({
      version: "2",
      directAnswerClaimIds: [],
      claims: [],
      sections: [],
      table: null,
    });
    const first = await ask("What if my income drops?").result;
    expect(first.status).toBe("clarification_required");
    expect(first.presentation.limitations.join(" ")).toMatch(
      /assume your monthly income falls by 20%/,
    );
    // Nothing is assumed or sent before the user confirms.
    expect(providerRequests).toEqual([]);
    await ask("Yes", { context: first.context }).result;
    // The writer's first draft request carries the selected evidence.
    const evidence = providerRequests.find(
      (item) => item.schema === "atlas_answer_v2",
    )!.input.evidence as Array<{ definition: string; value?: number }>;
    expect(
      evidence.find((item) => item.definition === "Option 1 · Monthly income")
        ?.value,
    ).toBe(4_000_000);
  });

  it("runs a different percentage given in reply to the assumption question", async () => {
    writer = () => ({
      version: "2",
      directAnswerClaimIds: [],
      claims: [],
      sections: [],
      table: null,
    });
    const first = await ask("What if my income drops?").result;
    await ask("10%", { context: first.context }).result;
    const evidence = providerRequests.find(
      (item) => item.schema === "atlas_answer_v2",
    )!.input.evidence as Array<{ definition: string; value?: number }>;
    // "10%" keeps the proposed direction: a 10% drop from ₱50,000.00.
    expect(
      evidence.find((item) => item.definition === "Option 1 · Monthly income")
        ?.value,
    ).toBe(4_500_000);
  });

  it("carries the subject into a follow-up and changes only the period (Q39)", async () => {
    const first = await ask("How much did I spend this month?").result;
    expect(first.context).not.toBeNull();
    const second = await ask("What about last month?", {
      context: first.context,
    }).result;
    expect(second.status).toBe("answered");
    const evidence = providerRequests[1]!.input.evidence as Evidence[];
    expect(
      evidence.find((item) => item.scope.type === "whole_domain")?.period,
    ).toEqual({ from: "2026-08-01", through: "2026-08-31" });
    expect(second.presentation.direct[0]?.text).toMatch(
      /Aug 1, 2026 to Aug 31, 2026/,
    );
  });

  it("keeps a three-sentence answer short without losing the caveat (Q48)", async () => {
    writer = totalWriter((total) => [
      {
        id: "c2",
        kind: "fact",
        text: `The total covers ${total.period.from} to ${total.period.through}.`,
        answersRequirementIds: [],
        evidenceIds: [total.id],
        derivedFactIds: [],
        assumptionIds: [],
        scopeId: "whole_domain:expense",
        comparison: null,
        recommendation: null,
      },
      {
        id: "c3",
        kind: "fact",
        text: `That total is ${pesos(total.value!)}.`,
        answersRequirementIds: [],
        evidenceIds: [total.id],
        derivedFactIds: [],
        assumptionIds: [],
        scopeId: "whole_domain:expense",
        comparison: null,
        recommendation: null,
      },
      {
        id: "c4",
        kind: "limitation",
        text: "Spending you did not record in ATLAS is not included.",
        answersRequirementIds: [],
        evidenceIds: [],
        derivedFactIds: [],
        assumptionIds: [],
        scopeId: "whole_domain:expense",
        comparison: null,
        recommendation: null,
      },
    ]);
    const response = await ask(
      "In three sentences, how much did I spend this month?",
    ).result;
    const p = response.presentation;
    const shown = [...p.direct, ...p.findings, ...p.options].length;
    expect(shown + 1).toBeLessThanOrEqual(3);
    expect(p.limitations[0]).toBe(
      "Spending you did not record in ATLAS is not included.",
    );
    expect(p.shortened?.hidden).toBeGreaterThan(0);
  });

  it("answers a Taglish question in Filipino labels with the same verified facts (Q49)", async () => {
    const response = await ask("Magkano ang gastos ko ngayong buwan?").result;
    expect(response.presentation.language).toBe("fil-en");
    expect(response.presentation.statusLabel).toBe("May sagot");
    expect(response.presentation.direct[0]?.text).toContain("₱11,000.00");
    expect(response.presentation.direct[0]?.text).toContain("Set 1, 2026");
    const verification = Object.values(response.presentation.verification)
      .filter(Boolean)
      .join(" ");
    expect(verification).not.toMatch(/100\s?%|fully accurate|guarantee/i);
  });

  it("suggests follow-ups that fit the answer and never repeat the question", async () => {
    const withContext = await ask("How much did I spend this month?").result;
    const texts = withContext.suggestions.map((item) => item.text);
    expect(texts).not.toContain("How much did I spend this month?");
    expect(texts).toContain("What about last month?");
    // Without context nothing refers back to a subject that would be lost.
    const stateless = await ask("How much did I spend this month?", {
      contextKey: null,
    }).result;
    expect(stateless.context).toBeNull();
    expect(stateless.suggestions.every((item) => !item.referential)).toBe(true);
  });

  it("asks for a complete question when a short message has no context", async () => {
    const response = await ask("Why?").result;
    expect(response.status).toBe("clarification_required");
    expect(providerRequests).toEqual([]);
  });

  it("starts fresh, and says so, when the context cannot be verified", async () => {
    const response = await ask("How much did I spend this month?", {
      context: "tampered-token",
    }).result;
    expect(response.contextNotice).toMatch(/could not be/);
    expect(response.status).toBe("answered");
  });
});

describe("communication helpers", () => {
  it("detects Taglish and requested formats", () => {
    expect(
      detectLanguage(
        "Mas malaki ba ang gastos ko ngayong buwan kaysa noong nakaraang buwan?",
      ),
    ).toBe("fil-en");
    expect(detectLanguage("How much did I spend this month?")).toBe("en");
    expect(
      detectStyle("In three sentences, what changed?", "explain_change"),
    ).toEqual({ style: "concise", maxSentences: 3 });
    expect(
      detectStyle("Sa tatlong pangungusap, ano ang nagbago?", "explain_change"),
    ).toEqual({ style: "concise", maxSentences: 3 });
    expect(detectStyle("Show it as a table", "lookup").style).toBe("table");
    expect(detectStyle("How much did I spend?", "lookup").style).toBe(
      "concise",
    );
    expect(formatMoney(1_100_000)).toBe("₱11,000.00");
    expect(formatDay("2026-09-24", "fil-en")).toBe("Set 24, 2026");
  });

  it("refuses progress events with anything beyond the fixed vocabulary", () => {
    expect(() =>
      safeProgress({
        type: "stage",
        stage: "writing",
        question: "private",
      } as unknown as V2ProgressEvent),
    ).toThrow();
  });
});

describe("Analyst V2 under injected faults (AI-07)", () => {
  const question = "How much did I spend this month?";
  const noEmptyRecordsClaim = (response: V2Response) =>
    expect(JSON.stringify(response.presentation)).not.toMatch(
      /no (?:recorded )?(?:expenses|records|spending)|₱0\.00/i,
    );

  it.each([
    ["timeout", "timeout"],
    ["invalid_output", "provider_error"],
    ["http_error", "provider_error"],
  ] as const)(
    "shows checked figures when the writer fails with %s",
    async (injected, outcome) => {
      fault = injected;
      const response = await ask(question).result;
      expect(response.status).toBe("fallback_facts");
      expect(response.presentation.direct[0]?.text).toContain("₱11,000.00");
      expect(response.presentation.limitations.join(" ")).toMatch(
        /only checked ATLAS figures/,
      );
      expect(response.outcome).toBe(outcome);
      // A provider that may have processed the call is charged.
      expect(response.usage.providerCalls).toBe(1);
    },
  );

  it("charges unknown usage at the reserved upper bound, never as zero", async () => {
    fault = "missing_usage";
    const response = await ask(question).result;
    expect(response.status).toBe("answered");
    expect(response.usage.providerCalls).toBe(1);
    expect(response.usage.inputTokens).toBeGreaterThan(800);
    expect(response.usage.outputTokens).toBeGreaterThanOrEqual(1_200);
  });

  it("sends nothing and settles nothing when the pool is used up or the meter is down", async () => {
    state.exhausted.add(AI_MODELS.analyst);
    const exhausted = await ask(question).result;
    expect(exhausted.status).toBe("fallback_facts");
    expect(exhausted.outcome).toBe("pool_exhausted");
    expect(exhausted.usage.providerCalls).toBe(0);
    state.exhausted.clear();
    state.meterDown = true;
    const metered = await ask(question).result;
    expect(metered.status).toBe("fallback_facts");
    expect(metered.outcome).toBe("provider_error");
    expect(metered.usage.providerCalls).toBe(0);
    expect(providerRequests).toEqual([]);
  });

  it("never reports a failed source as empty records", async () => {
    fault = "source_error";
    const response = await ask(question).result;
    expect(response.status).toBe("error");
    expect(response.presentation.unresolved.map((item) => item.reason)).toEqual(
      ["operational_failure"],
    );
    expect(response.presentation.unresolved[0]?.text).not.toMatch(
      /enough records/,
    );
    noEmptyRecordsClaim(response);
    // Nothing to cite, so no metered writer call is spent.
    expect(providerRequests).toEqual([]);
  });

  it("starts fresh, and says so, when consent changes between turns", async () => {
    const first = await ask(question).result;
    const narrower = { ...consent, domains: ["money" as const] };
    const second = await ask("What about last month?", {
      context: first.context,
      consent: narrower,
    }).result;
    expect(second.contextNotice).toMatch(/sharing choices changed/);
  });

  it("stops before any provider call when the request is cancelled", async () => {
    const cancelled = new AbortController();
    cancelled.abort();
    const response = await ask(question, { signal: cancelled.signal }).result;
    expect(response.status).toBe("error");
    expect(providerRequests).toEqual([]);
    expect(response.usage.providerCalls).toBe(0);
  });
});

describe("Analyst V2 with the analysis planner (mocked provider)", () => {
  const planModel = AI_MODELS.planner;
  const plan = (extra: Record<string, unknown> = {}) => ({
    understanding:
      "Whether income covers spending and where attention should go.",
    intent: "prioritize",
    responseStyle: "detailed",
    subQuestions: [
      {
        question: "How much was spent this month?",
        capabilities: ["money.totals"],
        moneyKind: "expense",
      },
      {
        question: "How much income came in this month?",
        capabilities: ["money.totals"],
        moneyKind: "income",
      },
      {
        question: "Where do debts stand?",
        capabilities: ["debt.payments"],
        moneyKind: "none",
      },
    ],
    hypotheses: ["One category may account for most spending."],
    comparePreviousPeriod: false,
    period: null,
    clarification: null,
    ...extra,
  });

  it("plans before reading, reads every planned area and briefs the writer", async () => {
    planner = () => plan();
    const response = await ask("How am I doing overall?", { planModel }).result;
    expect(providerRequests[0]).toMatchObject({
      schema: "atlas_analysis_plan",
      model: planModel,
    });
    // The planner sees the question and a catalog, never a record.
    expect(Object.keys(providerRequests[0]!.input).sort()).toEqual([
      "catalog",
      "currentReading",
      "previousTurns",
      "question",
      "today",
    ]);
    const writerInput = providerRequests.find(
      (item) => item.schema === "atlas_answer_v2",
    )!.input as {
      analysisPlan: { understanding: string } | null;
      requirements: Array<{ id: string }>;
      evidence: Array<{ id: string }>;
    };
    expect(writerInput.analysisPlan?.understanding).toBe(
      "Whether income covers spending and where attention should go.",
    );
    expect(writerInput.requirements.map((item) => item.id)).toEqual([
      "r_plan1_expense",
      "r_plan2_income",
      "r_plan3",
    ]);
    expect(response.models.planner).toEqual({
      requested: planModel,
      resolved: planModel,
    });
    expect(["answered", "partial_answer"]).toContain(response.status);
  });

  it("keeps the rules' reading when the plan is invalid", async () => {
    const response = await ask("How much did I spend this month?", {
      planModel,
    }).result;
    expect(response.status).toBe("answered");
    const writerInput = providerRequests.find(
      (item) => item.schema === "atlas_answer_v2",
    )!.input as {
      analysisPlan: unknown;
      requirements: Array<{ id: string }>;
    };
    expect(writerInput.analysisPlan).toBeNull();
    expect(writerInput.requirements.map((item) => item.id)).toEqual([
      "r_money",
    ]);
  });

  it("asks back, reading nothing, when no records could answer", async () => {
    planner = () =>
      plan({
        subQuestions: [],
        clarification: "ATLAS keeps no weather records. What did you mean?",
      });
    const response = await ask("What will the weather be tomorrow?", {
      planModel,
    }).result;
    expect(response.status).toBe("clarification_required");
    expect(response.presentation.limitations).toContain(
      "ATLAS keeps no weather records. What did you mean?",
    );
    expect(providerRequests.map((item) => item.schema)).toEqual([
      "atlas_analysis_plan",
    ]);
    expect(response.usage.providerCalls).toBe(1);
  });

  it("accepts the writer's private analysis and never shows it", async () => {
    const base = totalWriter();
    writer = (input) => ({
      analysis: {
        keyObservations: ["Spending is the only area read."],
        connections: [],
        alternatives: [],
        gaps: [],
        confidence: "medium",
      },
      ...(base(input) as object),
    });
    const response = await ask("How much did I spend this month?").result;
    expect(response.status).toBe("answered");
    expect(JSON.stringify(response.presentation)).not.toContain(
      "only area read",
    );
  });

  it("shows the writer's findings when the plan asks for detail", async () => {
    planner = () =>
      plan({ intent: "lookup", responseStyle: "detailed", subQuestions: [] });
    writer = totalWriter((total) => [
      {
        id: "c2",
        kind: "fact",
        text: `Recorded expenses were ${pesos(total.value!)} in this period.`,
        answersRequirementIds: ["r_money"],
        evidenceIds: [total.id],
        derivedFactIds: [],
        assumptionIds: [],
        scopeId: "whole_domain:expense",
        comparison: null,
        recommendation: null,
      },
    ]);
    const detailed = await ask("How much did I spend this month?", {
      planModel,
    }).result;
    expect(detailed.presentation.findings).toHaveLength(1);
    expect(detailed.presentation.shortened).toBeNull();
    // Without a plan a lookup still stays short, as before.
    const short = await ask("How much did I spend this month?").result;
    expect(short.presentation.findings).toHaveLength(0);
  });

  it("carries earlier turns to the planner and the writer", async () => {
    planner = () => plan({ subQuestions: [] });
    const first = await ask("How much did I spend this month?", { planModel })
      .result;
    providerRequests = [];
    await ask("And how does that compare with my income this month?", {
      planModel,
      context: first.context,
    }).result;
    for (const schema of ["atlas_analysis_plan", "atlas_answer_v2"]) {
      const input = providerRequests.find((item) => item.schema === schema)!
        .input as {
        previousTurns: Array<{ question: string; answer: string }>;
      };
      expect(input.previousTurns).toEqual([
        {
          question: "How much did I spend this month?",
          answer:
            "Recorded expenses were ₱11,000.00 from 2026-09-01 to 2026-09-24.",
        },
      ]);
    }
  });
});
