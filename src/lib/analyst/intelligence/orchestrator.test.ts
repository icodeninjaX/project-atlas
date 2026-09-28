import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RUN_BUDGETS, RunLedger } from "./budgets";
import { checkBrief, choosePath } from "./brief";
import type { AnalysisBrief } from "./contracts";
import { EVALUATION_CORPUS } from "./evaluation/corpus";
import { EXPECTED_FACTS } from "./evaluation/expected";
import { OWNER_A } from "./evaluation/fixtures";
import {
  createEmulator,
  fixtureTables,
  fixtureUuid,
  type Emulator,
} from "./evaluation/postgrest";
import { runInvestigation, type Proposal, type Proposer } from "./orchestrator";
import {
  SHARED_ROUTE,
  legacyEquivalentConsent,
  type AnalystConsent,
} from "./policy";
import { capabilityProposer } from "./proposer";
import { invokeAnalystToolV2 } from "./tools/server";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

const now = new Date("2026-09-24T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const goal = `goal:${fixtureUuid("goal-a-career")}`;
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

type Req = [
  id: string,
  question: string,
  capabilities: string[],
  essential?: boolean,
];

function brief(
  requirements: Req[],
  extra: Partial<AnalysisBrief> = {},
): AnalysisBrief {
  return {
    version: "1",
    intent: "lookup",
    language: "en",
    responseStyle: "standard",
    question: "Synthetic question",
    resolvedEntities: [],
    periods: [
      {
        id: "current",
        from: "2026-09-01",
        through: "2026-09-24",
        timeZone: "Asia/Manila",
        basis: "explicit",
      },
    ],
    requirements: requirements.map(
      ([id, question, evidenceNeeded, essential = true]) => ({
        id,
        question,
        essential,
        evidenceNeeded,
      }),
    ),
    assumptions: [],
    unresolvedReferences: [],
    ...extra,
  };
}

const check = (
  raw: AnalysisBrief,
  options: { consent?: AnalystConsent | null; handles?: string[] } = {},
) => {
  const result = checkBrief(raw, {
    consent: options.consent === undefined ? consent : options.consent,
    route: SHARED_ROUTE,
    authorizedHandles: new Set(options.handles ?? []),
  });
  if (!result.ok) throw new Error(result.reason);
  return result;
};

const invoke = (
  tool: Parameters<typeof invokeAnalystToolV2>[0],
  input: unknown,
) => invokeAnalystToolV2(tool, input, { consent, route: SHARED_ROUTE });

const run = (
  raw: AnalysisBrief,
  options: Partial<Parameters<typeof runInvestigation>[0]> = {},
) =>
  runInvestigation({
    check: check(raw),
    proposer: capabilityProposer(now),
    invoke,
    clock: () => 0,
    ...options,
  });

const tools = (result: Awaited<ReturnType<typeof run>>) =>
  result.outcomes.map((item) => `${item.round}:${item.request.tool}`);

describe("brief checks", () => {
  it("accepts only authorized entities and known capabilities", () => {
    const raw = brief([["r1", "Linked activity", ["goal.linked_activity"]]], {
      resolvedEntities: [{ handle: goal, type: "goal", resolution: "context" }],
    });
    expect(
      checkBrief(raw, {
        consent,
        route: SHARED_ROUTE,
        authorizedHandles: new Set(),
      }),
    ).toEqual({ ok: false, reason: "unauthorized_entity" });
    expect(
      checkBrief(brief([["r1", "x", ["sql.anything"]]]), {
        consent,
        route: SHARED_ROUTE,
        authorizedHandles: new Set(),
      }),
    ).toEqual({ ok: false, reason: "unknown_capability" });
    expect(
      checkBrief(
        { version: "1" },
        { consent, route: SHARED_ROUTE, authorizedHandles: new Set() },
      ).ok,
    ).toBe(false);
  });

  it("separates unsupported, excluded and supported requirements before retrieval", () => {
    const result = check(
      brief([
        ["budget", "Budget variance", ["money.budget"]],
        ["goal", "Goal activity", ["goal.linked_activity"]],
        ["text", "Decision text", ["decision.text"]],
      ]),
      {
        consent: {
          ...consent,
          domains: consent.domains.filter((d) => d !== "goals"),
        },
      },
    );
    expect(
      result.readiness.map((item) => [
        item.requirementId,
        item.state,
        item.reason,
      ]),
    ).toEqual([
      ["budget", "unsupported", "unsupported_capability"],
      ["goal", "not_authorized", "excluded_by_consent"],
      ["text", "not_authorized", "excluded_by_consent"],
    ]);
  });

  it("keeps single lookups on the simple path", () => {
    expect(
      choosePath(brief([["r1", "Spent this month", ["money.totals"]]])),
    ).toBe("simple");
    expect(
      choosePath(brief([["r1", "Linked tasks", ["goal.linked_activity"]]])),
    ).toBe("deep");
    expect(
      choosePath(
        brief([
          ["a", "x", ["money.totals"]],
          ["b", "y", ["debt.payments"]],
        ]),
      ),
    ).toBe("deep");
    expect(
      choosePath(
        brief([["r1", "Why", ["money.totals"]]], { intent: "explain_change" }),
      ),
    ).toBe("deep");
  });
});

describe("bounded investigation", () => {
  it("answers a single lookup in one round with no extra retrieval (Q01)", async () => {
    const result = await run(
      brief([["total", "Recorded expenses this month", ["money.totals"]]]),
    );
    expect(result.path).toBe("simple");
    expect(tools(result)).toEqual(["1:getMoneyBreakdown"]);
    expect(result.status).toBe("ready");
    expect(result.stopReason).toBe("sufficient");
    const total = result.selection.selected.find(
      (item) => item.scope.type === "whole_domain",
    );
    expect(total).toMatchObject({
      value: EXPECTED_FACTS["expense.current"]!.value,
    });
  });

  it("resolves a goal, reads its linked tasks, then a related decision", async () => {
    const result = await run(
      brief(
        [
          ["tasks", "Tasks behind the goal", ["goal.linked_activity"]],
          [
            "decision",
            "The decision connected to those tasks",
            ["decision.context"],
          ],
        ],
        {
          intent: "relationship",
          unresolvedReferences: ["Land a developer job"],
        },
      ),
    );
    expect(tools(result)).toEqual([
      "1:resolveAnalystEntities",
      "2:getGoalAnalysisContext",
      "2:getRelationshipPaths",
      "3:getDecisionAnalysisContext",
    ]);
    expect(result.status).toBe("ready");
    expect(result.usage.rounds).toBe(3);
    expect(result.usage.toolCalls).toBeLessThanOrEqual(
      RUN_BUDGETS.deep.toolCalls,
    );
    expect(
      result.selection.selected.some((item) =>
        item.id.includes(fixtureUuid("decision-a-study")),
      ),
    ).toBe(true);
    expect(result.asOf.sources).toHaveLength(4);
    expect(result.limitations.join(" ")).toMatch(/not as one snapshot/);
  });

  it("makes three development cases that need dependent retrieval answerable", async () => {
    const cases = {
      Q13: brief(
        [
          ["activity", "Linked activity", ["goal.linked_activity"]],
          ["outcome", "Milestones and progress", ["goal.linked_activity"]],
        ],
        {
          intent: "explain_change",
          unresolvedReferences: ["Land a developer job"],
        },
      ),
      Q14: brief(
        [
          [
            "linked",
            "Linked tasks with state",
            ["goal.linked_activity", "task.detail"],
          ],
        ],
        {
          intent: "relationship",
          unresolvedReferences: ["Land a developer job"],
        },
      ),
      Q58: brief(
        [
          ["support", "Completed linked work", ["goal.linked_activity"]],
          ["counter", "Open linked tasks", ["task.detail"]],
        ],
        {
          intent: "explain_change",
          unresolvedReferences: ["Land a developer job"],
        },
      ),
    };
    for (const [id, raw] of Object.entries(cases)) {
      expect(EVALUATION_CORPUS.find((item) => item.id === id)?.split).toBe(
        "development",
      );
      const result = await run(raw);
      expect(result.status, id).toBe("ready");
      expect(result.usage.rounds, id).toBeGreaterThanOrEqual(2);
      expect(
        result.outcomes.every((item) => item.result.status !== "error"),
        id,
      ).toBe(true);
    }
  });

  it("keeps counterevidence under selection pressure (Q58)", async () => {
    const result = await run(
      brief(
        [
          ["support", "Completed linked work", ["goal.linked_activity"]],
          ["counter", "Open linked tasks", ["task.detail"]],
        ],
        {
          intent: "explain_change",
          unresolvedReferences: ["Land a developer job"],
        },
      ),
      { selection: { items: 10, bytes: 60_000 } },
    );
    const interview = fixtureUuid("task-a-interview");
    const open = result.selection.selected.find(
      (item) =>
        item.kind === "record_fact" &&
        item.semantics.metricKey === "record:task.status" &&
        item.value === "todo",
    );
    expect(open?.id).toContain(interview);
    expect(
      result.selection.selected.some(
        (item) => item.semantics.metricKey === "goal_linked_task_completion",
      ),
    ).toBe(true);
    expect(result.selection.dropped).toBeGreaterThan(0);
  });

  it("keeps goal and whole-domain scopes labeled separately (Q20)", async () => {
    const raw = brief(
      [
        ["linked", "Goal-linked completions", ["goal.linked_activity"]],
        ["money", "Whole-account spending", ["money.totals"]],
      ],
      {
        resolvedEntities: [
          { handle: goal, type: "goal", resolution: "context" },
        ],
      },
    );
    const result = await runInvestigation({
      check: check(raw, { handles: [goal] }),
      proposer: capabilityProposer(now),
      invoke,
      clock: () => 0,
    });
    const scopes = result.selection.scopes.map((item) => item.scopeId);
    expect(scopes).toEqual(
      expect.arrayContaining([
        goal,
        "whole_domain:expense",
        "cohort:expense_by_category",
      ]),
    );
    expect(
      result.selection.byRequirement.linked!.every(
        (id) =>
          result.selection.selected.find((item) => item.id === id)?.scope.id ===
          goal,
      ),
    ).toBe(true);
  });

  it("uses complete aggregates for large months and reports incomplete ones", async () => {
    emulator = createEmulator(fixtureTables("bulk"), OWNER_A);
    vi.stubGlobal("fetch", emulator.fetch);
    const complete = await run(
      brief([["total", "Every expense this month", ["money.full_aggregate"]]]),
    );
    expect(complete.status).toBe("ready");
    expect(
      complete.selection.selected.find(
        (item) => item.scope.type === "whole_domain",
      ),
    ).toMatchObject({
      value: EXPECTED_FACTS["bulk.expense_total"]!.value,
    });
    emulator.oversizedAggregate = true;
    const withheld = await run(
      brief([["total", "Every expense this month", ["money.full_aggregate"]]]),
    );
    expect(withheld.status).toBe("insufficient");
    expect(withheld.unresolved).toEqual([
      { requirementId: "total", reason: "insufficient_evidence" },
    ]);
    expect(withheld.selection.selected).toEqual([]);
  });

  it("asks which record rather than guessing (Q25)", async () => {
    const result = await run(
      brief([["status", "Application status", ["career.applications"]]], {
        unresolvedReferences: ["Acme Synthetic"],
      }),
    );
    expect(result.status).toBe("clarification_required");
    expect(result.candidates).toHaveLength(2);
    expect(tools(result)).toEqual(["1:resolveAnalystEntities"]);
  });

  it("does not retrieve for a blocked requirement", async () => {
    const result = await run(
      brief([
        ["budget", "Budget variance", ["money.budget"]],
        ["total", "Spending", ["money.totals"], false],
      ]),
    );
    expect(result.unresolved).toContainEqual({
      requirementId: "budget",
      reason: "unsupported_capability",
    });
    expect(
      result.outcomes.every(
        (item) => !item.request.requirementIds.includes("budget"),
      ),
    ).toBe(true);
  });
});

describe("server control of proposals", () => {
  const fixed = (requests: Proposal): Proposer => ({
    provider: null,
    propose: () => requests,
  });

  it("stops a repeated request instead of looping", async () => {
    const proposer = fixed({
      requests: [
        {
          tool: "resolveAnalystEntities",
          input: { text: "Land a developer job", types: ["goal"] },
          requirementIds: ["r1"],
        },
      ],
    });
    const result = await runInvestigation({
      check: check(brief([["r1", "Task details", ["task.detail"]]])),
      proposer,
      invoke,
      clock: () => 0,
    });
    expect(result.outcomes).toHaveLength(1);
    expect(result.rejected).toEqual([
      { round: 2, tool: "resolveAnalystEntities", reason: "duplicate" },
    ]);
    expect(result.stopReason).toBe("no_progress");
  });

  it("rejects unlisted tools, bad input, unknown handles and immaterial calls before reading", async () => {
    const foreign = `goal:${fixtureUuid("goal-b-career")}`;
    const proposer = fixed({
      requests: [
        {
          tool: "executeSql",
          input: { query: "delete from goals" },
          requirementIds: ["r1"],
        },
        {
          tool: "getMoneyBreakdown",
          input: { from: "2026-09-01", kind: "expense" },
          requirementIds: ["r1"],
        },
        {
          tool: "getGoalAnalysisContext",
          input: { goal: foreign, from: "2026-09-01", through: "2026-09-24" },
          requirementIds: ["r1"],
        },
        {
          tool: "getMoneyBreakdown",
          input: { from: "2026-09-01", through: "2026-09-24", kind: "expense" },
          requirementIds: ["nope"],
        },
      ],
    });
    const result = await runInvestigation({
      check: check(brief([["r1", "Goal", ["goal.linked_activity"]]])),
      proposer,
      invoke,
      clock: () => 0,
    });
    expect(result.rejected.map((item) => item.reason)).toEqual([
      "not_allowlisted",
      "invalid_input",
      "unknown_handle",
      "unknown_requirement",
    ]);
    expect(emulator.requests).toEqual([]);
    expect(result.status).toBe("insufficient");
  });

  it("stops before the deadline would consume the answer reserve", async () => {
    let clock = 0;
    // Calls in one round run concurrently: a round takes ten seconds.
    const timed = async (
      tool: Parameters<typeof invokeAnalystToolV2>[0],
      input: unknown,
    ) => {
      const start = clock;
      const result = await invoke(tool, input);
      clock = Math.max(clock, start + 10_000);
      return result;
    };
    const result = await runInvestigation({
      check: check(
        brief(
          [
            ["tasks", "Tasks", ["goal.linked_activity"]],
            ["decision", "Decision", ["decision.context"]],
          ],
          {
            intent: "relationship",
            unresolvedReferences: ["Land a developer job"],
          },
        ),
      ),
      proposer: capabilityProposer(now),
      invoke: timed,
      clock: () => clock,
    });
    expect(result.stopReason).toBe("deadline");
    expect(result.status).toBe("partial");
    expect(result.unresolved).toEqual([
      { requirementId: "decision", reason: "insufficient_evidence" },
    ]);
    expect(result.remainingForAnswer.timeMs).toBeGreaterThanOrEqual(
      RUN_BUDGETS.deep.reserve.timeMs,
    );
  });

  it("stops on cancellation without reading", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await run(brief([["total", "Spending", ["money.totals"]]]), {
      signal: controller.signal,
    });
    expect(result.status).toBe("cancelled");
    expect(emulator.requests).toEqual([]);
  });

  it("charges a model-backed proposer against the budget outside the reserve", async () => {
    const proposer: Proposer = {
      provider: { tokens: 20_000, costUsdMicros: 5_000 },
      propose: () => ({ requests: [] }),
    };
    const result = await runInvestigation({
      check: check(brief([["total", "Spending", ["money.totals"]]])),
      proposer,
      invoke,
      clock: () => 0,
    });
    expect(result.stopReason).toBe("tokens");
    const ledger = new RunLedger(RUN_BUDGETS.deep, () => 0);
    ledger.recordProvider(
      { tokens: null, costUsdMicros: null },
      { tokens: 9_000, costUsdMicros: 4_000 },
    );
    expect(ledger.usage).toMatchObject({
      providerCalls: 1,
      tokens: 9_000,
      costUsdMicros: 4_000,
    });
  });
});
