import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTEXT_LIMITS,
  newConversation,
  openContext,
  parseV2Request,
  needsContext,
  reauthorizeContext,
  sealContext,
  type ConversationContext,
} from "./context";
import type { AnalysisBrief, AnswerV2, EvidenceV2 } from "./contracts";
import { EVALUATION_CORPUS } from "./evaluation/corpus";
import { EXPECTED_FACTS } from "./evaluation/expected";
import { OWNER_A, OWNER_B } from "./evaluation/fixtures";
import {
  createEmulator,
  fixtureTables,
  fixtureUuid,
  type Emulator,
} from "./evaluation/postgrest";
import {
  SHARED_ROUTE,
  legacyEquivalentConsent,
  type AnalystConsent,
} from "./policy";
import { authorizeHandlesV2, invokeAnalystToolV2 } from "./tools/server";
import {
  applyTurn,
  askAssumption,
  classifyTurn,
  explainChange,
  recordAnswer,
  resolvePeriod,
  topicDomains,
} from "./turns";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

const now = new Date("2026-09-24T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const key = randomBytes(32);
const goal = `goal:${fixtureUuid("goal-a-career")}`;
const fund = `goal:${fixtureUuid("goal-a-fund")}`;
const trip = `goal:${fixtureUuid("goal-a-trip")}`;
let emulator: Emulator;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now });
  emulator = createEmulator(fixtureTables(), OWNER_A);
  vi.stubGlobal("fetch", emulator.fetch);
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
  return () => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  };
});

const fresh = () => newConversation(OWNER_A, consent, now);

/** One turn: interpret, apply, then record a synthetic validated answer. */
function turn(
  context: ConversationContext,
  message: string,
  answer?: {
    brief?: Partial<AnalysisBrief>;
    claims?: AnswerV2["claims"];
    evidence?: EvidenceV2[];
    status?: AnswerV2["status"];
    candidates?: string[];
  },
) {
  const interpretation = classifyTurn(message, context, now);
  const plan = applyTurn(context, interpretation, message, fresh);
  if (!answer) return plan;
  const brief: AnalysisBrief = {
    version: "1",
    intent: "lookup",
    language: "en",
    responseStyle: "standard",
    question: plan.question ?? message,
    resolvedEntities: [],
    periods: [],
    requirements: [
      {
        id: "answer",
        question: "The requested answer",
        essential: true,
        evidenceNeeded: [],
      },
    ],
    assumptions: [],
    unresolvedReferences: [],
    ...answer.brief,
  };
  const recorded: AnswerV2 = {
    version: "2",
    status: answer.status ?? "answered",
    directAnswerClaimIds: [],
    claims: answer.claims ?? [],
    sections: [],
    table: null,
    sources: [],
    coverage: [],
    unresolved: [],
    limitations: [],
    assumptions: [],
    model: null,
    verification: {
      claimsProposed: 0,
      claimsPassed: 0,
      rejectionReasons: [],
      semanticReview: "not_run",
      repairEligible: false,
    },
    nextTurnContext: null,
  };
  return {
    ...plan,
    context: recordAnswer(plan.context, {
      brief,
      answer: recorded,
      evidence: answer.evidence ?? [],
      candidates: answer.candidates,
    }),
  };
}

const claim = (
  id: string,
  text: string,
  kind: AnswerV2["claims"][number]["kind"] = "fact",
  evidenceIds: string[] = [],
) => ({
  id,
  kind,
  text,
  answersRequirementIds: ["answer"],
  evidenceIds,
  derivedFactIds: [],
  assumptionIds: [],
  scopeId: "whole_domain:expense",
  comparison: null,
  verification: {
    structural: "passed" as const,
    deterministic: "passed" as const,
    semantic: "not_required" as const,
    reasons: [],
  },
});

describe("sealed conversation context", () => {
  it("round-trips for the same owner and consent", () => {
    const token = sealContext(fresh(), key, now);
    const opened = openContext(token, { ownerId: OWNER_A, consent, key, now });
    expect(opened.ok).toBe(true);
    // The browser cannot read it.
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain(
      OWNER_A,
    );
  });

  it("rejects tampered, cross-owner, expired and consent-changed context (test 8)", () => {
    const token = sealContext(
      {
        ...fresh(),
        entities: [{ handle: goal, resolution: "selected", turn: 1 }],
      },
      key,
      now,
    );
    const flipped = Buffer.from(token, "base64url");
    flipped[40] = flipped[40]! ^ 1;
    expect(
      openContext(flipped.toString("base64url"), {
        ownerId: OWNER_A,
        consent,
        key,
        now,
      }),
    ).toEqual({ ok: false, reason: "tampered" });
    expect(openContext(token, { ownerId: OWNER_B, consent, key, now })).toEqual(
      { ok: false, reason: "tampered" },
    );
    expect(
      openContext(token, {
        ownerId: OWNER_A,
        consent,
        key: randomBytes(32),
        now,
      }),
    ).toEqual({ ok: false, reason: "tampered" });
    expect(
      openContext(token, {
        ownerId: OWNER_A,
        consent,
        key,
        now: new Date(now.getTime() + CONTEXT_LIMITS.ttlMs + 1),
      }),
    ).toEqual({ ok: false, reason: "expired" });
    const narrowed: AnalystConsent = { ...consent, domains: ["money"] };
    expect(
      openContext(token, { ownerId: OWNER_A, consent: narrowed, key, now }),
    ).toEqual({ ok: false, reason: "consent_changed" });
    expect(
      openContext(token, { ownerId: OWNER_A, consent: null, key, now }),
    ).toEqual({ ok: false, reason: "consent_changed" });
    expect(
      openContext(token, { ownerId: OWNER_A, consent, key: null, now }),
    ).toEqual({ ok: false, reason: "disabled" });
    expect(
      openContext("not a token", { ownerId: OWNER_A, consent, key, now }).ok,
    ).toBe(false);
  });

  it("bounds requests and needs context for very short messages", () => {
    expect(
      parseV2Request(JSON.stringify({ question: "x".repeat(4000) })).ok,
    ).toBe(true);
    expect(
      parseV2Request(JSON.stringify({ question: "x".repeat(4001) })).ok,
    ).toBe(false);
    expect(
      parseV2Request(
        JSON.stringify({ question: "Why?", context: "a".repeat(30_000) }),
      ),
    ).toEqual({ ok: false, reason: "too_large" });
    expect(
      parseV2Request(JSON.stringify({ question: "Why?", owner: OWNER_B })).ok,
    ).toBe(false);
    expect(needsContext("Why?")).toBe(true);
    expect(classifyTurn("Why?", null, now)).toEqual({
      kind: "needs_clarification",
      reason: "no_context",
    });
  });
});

describe("follow-up interpretation", () => {
  it("resolves Manila periods", () => {
    expect(resolvePeriod("What about last month?", now)).toMatchObject({
      from: "2026-08-01",
      through: "2026-08-31",
    });
    expect(resolvePeriod("e noong nakaraang buwan?", now)).toMatchObject({
      from: "2026-08-01",
      through: "2026-08-31",
    });
    expect(resolvePeriod("and last week", now)).toMatchObject({
      from: "2026-09-14",
      through: "2026-09-20",
    });
    expect(resolvePeriod("how about in May", now)).toMatchObject({
      from: "2026-05-01",
      through: "2026-05-31",
    });
    expect(resolvePeriod("it may be higher", now)).toBeNull();
    expect(resolvePeriod("last quarter", now)).toMatchObject({
      from: "2026-04-01",
      through: "2026-06-30",
    });
  });

  it("keeps the goal and changes only the period (test 1, Q39)", () => {
    let context = turn(
      fresh(),
      "How is my Land a developer job goal going this month?",
      {
        brief: {
          resolvedEntities: [
            { handle: goal, type: "goal", resolution: "exact_match" },
          ],
          periods: [
            {
              id: "p",
              from: "2026-09-01",
              through: "2026-09-24",
              timeZone: "Asia/Manila",
              basis: "explicit",
            },
          ],
        },
        evidence: [],
      },
    ).context;
    context = { ...context, topic: { domains: ["goals"], intent: "lookup" } };
    const plan = turn(context, "What about last month?");
    expect(plan.interpretation.kind).toBe("change_period");
    expect(plan.entities).toEqual([goal]);
    expect(plan.periods).toEqual([
      {
        id: "requested",
        from: "2026-08-01",
        through: "2026-08-31",
        basis: "explicit",
      },
    ]);
    expect(plan.question).toBe(
      "How is my Land a developer job goal going this month?",
    );
    expect(
      EXPECTED_FACTS["goal.career_activity_previous"]!.value,
    ).toMatchObject({ completedLinked: 1 });
    expect(EVALUATION_CORPUS.find((item) => item.id === "Q39")?.question).toBe(
      "What about last month?",
    );
  });

  it("changes one scenario assumption and keeps the rest (test 2, Q40)", () => {
    let context = turn(
      fresh(),
      "What if my income falls 20% and I pay ₱2,000 extra monthly on my card?",
    ).context;
    context = {
      ...context,
      topic: { domains: ["runway"], intent: "scenario" },
      assumptions: [
        {
          key: "income_change_percent",
          value: -20,
          origin: "user_stated",
          turn: 1,
        },
        {
          key: "extra_debt_payment_pesos",
          value: 2000,
          origin: "user_stated",
          turn: 1,
        },
      ],
    };
    const plan = turn(context, "And 30%?");
    expect(plan.interpretation).toEqual({
      kind: "change_assumption",
      key: "income_change_percent",
      value: 30,
    });
    expect(plan.assumptions).toEqual(
      expect.arrayContaining([
        {
          key: "extra_debt_payment_pesos",
          value: 2000,
          origin: "user_stated",
          turn: 1,
        },
        {
          key: "income_change_percent",
          value: 30,
          origin: "user_stated",
          turn: 2,
        },
      ]),
    );
    expect(plan.question).toMatch(/What if my income falls/);
  });

  it("resolves an offered candidate in the original question (test 3, Q42)", () => {
    const context = turn(fresh(), "How is my main goal going?", {
      status: "clarification_required",
      candidates: [goal, fund, trip],
    }).context;
    expect(context.pendingClarification).toMatchObject({
      kind: "entity",
      question: "How is my main goal going?",
    });
    const plan = turn(context, "The second one");
    expect(plan.interpretation).toEqual({
      kind: "select_candidate",
      handle: fund,
      question: "How is my main goal going?",
    });
    expect(plan.entities[0]).toBe(fund);
    expect(plan.question).toBe("How is my main goal going?");
    expect(plan.context.pendingClarification).toBeNull();
    expect(turn(context, "yung pangatlo").interpretation).toMatchObject({
      handle: trip,
    });
    const named = classifyTurn(
      "Japan trip",
      context,
      now,
      new Map([
        [trip, "Japan trip"],
        [fund, "Build emergency fund"],
      ]),
    );
    expect(named).toMatchObject({ kind: "select_candidate", handle: trip });
  });

  it("confirms only the proposed assumption on Yes (Q43)", () => {
    const context = askAssumption(
      turn(fresh(), "What if my income drops?").context,
      "What if my income drops?",
      "income_change_percent",
      -20,
    );
    const plan = turn(context, "Yes");
    expect(plan.interpretation.kind).toBe("confirm_assumption");
    expect(plan.assumptions).toEqual([
      {
        key: "income_change_percent",
        value: -20,
        origin: "user_confirmed",
        turn: 2,
      },
    ]);
    expect(plan.question).toBe("What if my income drops?");
    expect(turn(context, "Hindi").interpretation.kind).toBe(
      "decline_assumption",
    );
  });

  it("explains an earlier recommendation from its recorded basis (test 4, Q41)", () => {
    const context = turn(fresh(), "What should I focus on this week?", {
      claims: [
        claim(
          "c1",
          "Consider finishing the overdue interview practice first.",
          "recommendation",
          ["focus.rank"],
        ),
      ],
      evidence: [],
    }).context;
    expect(context.recommendations).toEqual([
      { findingId: "t1.c1", turn: 1, origin: "analyst_suggestion" },
    ]);
    // A suggestion is never recorded as a user preference or assumption.
    expect(context.assumptions).toEqual([]);
    const plan = turn(context, "Why?");
    expect(plan.interpretation).toEqual({ kind: "why", findingId: "t1.c1" });
    expect(plan.refreshFindings).toEqual(["t1.c1"]);
    expect(turn(context, "Bakit?").interpretation.kind).toBe("why");
  });

  it("treats a correction as a conversational assumption, never a record change (test 5, Q46)", () => {
    let context = turn(
      fresh(),
      "What if my monthly income is ₱40,000?",
    ).context;
    context = {
      ...context,
      assumptions: [
        {
          key: "monthly_income_pesos",
          value: 40000,
          origin: "user_stated",
          turn: 1,
        },
      ],
    };
    const plan = turn(
      context,
      "That amount was wrong; use ₱45,000 a month instead.",
    );
    expect(plan.interpretation).toMatchObject({
      kind: "correction",
      assumption: { key: "monthly_income_pesos", value: 45000 },
    });
    expect(plan.assumptions).toEqual([
      {
        key: "monthly_income_pesos",
        value: 45000,
        origin: "user_stated",
        turn: 2,
      },
    ]);
    expect(plan.question).toBe("What if my monthly income is ₱40,000?");
  });

  it("clears the previous focus on a new topic (test 6, Q44)", () => {
    let context = turn(fresh(), "How much did I spend this month?", {
      brief: {
        periods: [
          {
            id: "p",
            from: "2026-09-01",
            through: "2026-09-24",
            timeZone: "Asia/Manila",
            basis: "explicit",
          },
        ],
      },
      evidence: [],
    }).context;
    context = {
      ...context,
      topic: { domains: ["money"], intent: "lookup" },
      entities: [
        {
          handle: `category:${fixtureUuid("cat-a-dining")}`,
          resolution: "context",
          turn: 1,
        },
      ],
    };
    const plan = turn(context, "Which job applications need a follow-up?");
    expect(plan.interpretation).toEqual({
      kind: "new_topic",
      domains: ["career"],
    });
    expect(plan.entities).toEqual([]);
    expect(plan.periods).toEqual([]);
    expect(topicDomains("Magkano ang gastos ko?")).toEqual(["money"]);
  });

  it("keeps context across more than two short exchanges", () => {
    let context = turn(
      fresh(),
      "How is my Land a developer job goal going this month?",
      {
        brief: {
          resolvedEntities: [
            { handle: goal, type: "goal", resolution: "exact_match" },
          ],
        },
        claims: [
          claim(
            "c1",
            "Consider finishing the linked interview practice.",
            "recommendation",
          ),
        ],
      },
    ).context;
    context = { ...context, topic: { domains: ["goals"], intent: "lookup" } };
    const kinds: string[] = [];
    for (const message of [
      "Why?",
      "What about last month?",
      "And last week?",
      "Is that still true?",
    ]) {
      const plan = turn(context, message);
      kinds.push(plan.interpretation.kind);
      context = plan.context;
      expect(plan.entities).toEqual([goal]);
    }
    expect(kinds).toEqual(["why", "change_period", "change_period", "refresh"]);
    expect(context.turn).toBe(5);
    expect(context.lastQuestion).toBe(
      "How is my Land a developer job goal going this month?",
    );
  });

  it("starts again when the turn bound is reached", () => {
    const context = {
      ...fresh(),
      turn: CONTEXT_LIMITS.turns,
      entities: [{ handle: goal, resolution: "selected" as const, turn: 1 }],
    };
    const plan = applyTurn(
      context,
      { kind: "same_topic" },
      "And the tasks?",
      fresh,
    );
    expect(plan.restarted).toBe(true);
    expect(plan.entities).toEqual([]);
  });
});

describe("re-authorization and refresh against records", () => {
  const options = { consent, route: SHARED_ROUTE };

  it("drops a deleted record and never carries another owner's handle (tests 7 and 8)", async () => {
    const task = `task:${fixtureUuid("task-a-site")}`;
    const foreign = `goal:${fixtureUuid("goal-b-career")}`;
    const context: ConversationContext = {
      ...fresh(),
      turn: 2,
      entities: [
        { handle: goal, resolution: "exact_match", turn: 1 },
        { handle: task, resolution: "context", turn: 1 },
        { handle: foreign, resolution: "context", turn: 1 },
      ],
    };
    emulator.tables.tasks = emulator.tables.tasks!.filter(
      (row) => row.id !== fixtureUuid("task-a-site"),
    );
    const result = await reauthorizeContext(context, (handles) =>
      authorizeHandlesV2(handles, options),
    );
    expect(result.context.entities.map((item) => item.handle)).toEqual([goal]);
    expect(result.dropped.sort()).toEqual([task, foreign].sort());
  });

  it("drops a pending choice whose candidates are no longer readable", async () => {
    const context: ConversationContext = {
      ...fresh(),
      turn: 1,
      pendingClarification: {
        kind: "entity",
        question: "Which goal?",
        candidates: [goal, `goal:${fixtureUuid("goal-b-career")}`],
      },
    };
    const result = await reauthorizeContext(context, (handles) =>
      authorizeHandlesV2(handles, options),
    );
    expect(result.context.pendingClarification).toBeNull();
  });

  it("explains that an edited record changed an earlier answer (test 7, Q47)", async () => {
    const input = {
      from: "2026-09-01",
      through: "2026-09-24",
      kind: "expense",
    };
    const first = await invokeAnalystToolV2(
      "getMoneyBreakdown",
      input,
      options,
    );
    const total = first.evidence.find(
      (item) => item.scope.type === "whole_domain",
    )!;
    const context = turn(fresh(), "How much did I spend this month?", {
      claims: [
        claim("c1", "Recorded expenses were ₱11,000.00 this month.", "fact", [
          total.id,
        ]),
      ],
      evidence: first.evidence,
    }).context;
    expect(context.findings[0]?.cited[0]).toMatchObject({
      metricKey: "expense_centavos",
      value: 1_100_000,
    });
    const row = emulator.tables.transactions!.find(
      (item) => item.id === fixtureUuid("tx-a-0906"),
    )!;
    row.amount_centavos = 200_000;
    const second = await invokeAnalystToolV2(
      "getMoneyBreakdown",
      input,
      options,
    );
    const change = explainChange(context, "t1.c1", second.evidence);
    expect(change).toEqual({
      outcome: "data_changed",
      changes: [
        {
          metricKey: "expense_centavos",
          period: { from: "2026-09-01", through: "2026-09-24" },
          before: 1_100_000,
          after: 1_120_000,
        },
      ],
    });
    expect(explainChange(context, "t1.c1", first.evidence).outcome).toBe(
      "unchanged",
    );
    expect(
      explainChange(context, "t1.c1", first.evidence, {
        priorClaimStillHolds: false,
      }).outcome,
    ).toBe("prior_error");
    expect(explainChange(context, "t1.c1", []).outcome).toBe(
      "source_unavailable",
    );
    expect(
      explainChange(context, "t1.c1", first.evidence, { scopeId: goal })
        .outcome,
    ).toBe("scope_changed");
  });

  it("never stores private text in context", async () => {
    const excerpt = {
      kind: "text_excerpt",
      id: "x",
      sharing: { route: "sensitive_narrative", allowedFields: [] },
    } as unknown as EvidenceV2;
    const context = turn(fresh(), "Summarize my reviews.", {
      claims: [claim("c1", "Your reviews were recorded.", "fact", ["x"])],
      evidence: [excerpt],
    }).context;
    expect(context.findings[0]?.cited).toEqual([]);
  });
});
