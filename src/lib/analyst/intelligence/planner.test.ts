import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkBrief } from "./brief";
import { analystCapabilities } from "./capabilities";
import { OWNER_A } from "./evaluation/fixtures";
import { createEmulator, fixtureTables } from "./evaluation/postgrest";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import {
  planAnalysis,
  refineBrief,
  requestedRequirements,
  requirementMoneyKind,
  type PlannerOutput,
} from "./planner";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { capabilityProposer } from "./proposer";
import type { StageCaller } from "./stages";
import { invokeAnalystToolV2 } from "./tools/server";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

const now = new Date("2026-09-24T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const allowed = new Set(
  analystCapabilities({ consent, route: SHARED_ROUTE })
    .filter((item) => item.status === "available" || item.status === "partial")
    .map((item) => item.id),
);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now });
  const emulator = createEmulator(fixtureTables(), OWNER_A);
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

function output(extra: Partial<PlannerOutput> = {}): PlannerOutput {
  return {
    understanding:
      "Whether income covers spending and debts, and where effort is going.",
    intent: "lookup",
    responseStyle: "standard",
    subQuestions: [],
    hypotheses: [],
    comparePreviousPeriod: false,
    period: null,
    clarification: null,
    ...extra,
  };
}

const rules = (question: string) =>
  deterministicBrief({ question, plan: null, now });

describe("analysis planner", () => {
  it("leaves the brief unchanged when the output is invalid", () => {
    const brief = rules("How much did I spend this month?");
    const refined = refineBrief(
      brief,
      { understanding: 3 },
      {
        now,
        allowed,
        defaultedTopic: false,
      },
    );
    expect(refined).toEqual({ brief, plan: null, clarification: null });
  });

  it("replaces the money default with a plan across areas for a broad question", () => {
    const brief = rules("How am I doing overall?");
    expect(brief.requirements.map((item) => item.id)).toEqual(["r_money"]);
    const refined = refineBrief(
      brief,
      output({
        intent: "prioritize",
        responseStyle: "detailed",
        subQuestions: [
          {
            question: "Is spending within income this month?",
            capabilities: ["money.totals"],
            moneyKind: "expense",
          },
          {
            question: "How much income was recorded this month?",
            capabilities: ["money.totals"],
            moneyKind: "income",
          },
          {
            question: "Where do debts stand?",
            capabilities: ["debt.payments"],
            moneyKind: "none",
          },
          {
            question: "Which tasks need attention?",
            capabilities: ["task.ranking", "invented.capability"],
            moneyKind: "none",
          },
          {
            question: "A fifth question beyond the limit",
            capabilities: ["reviews.scores"],
            moneyKind: "none",
          },
        ],
        hypotheses: ["One category may account for most spending."],
      }),
      { now, allowed, defaultedTopic: true },
    );
    expect(refined.clarification).toBeNull();
    expect(refined.plan?.hypotheses).toEqual([
      "One category may account for most spending.",
    ]);
    expect(refined.brief.intent).toBe("prioritize");
    expect(refined.brief.responseStyle).toBe("detailed");
    expect(
      refined.brief.requirements.map((item) => [
        item.id,
        item.essential,
        item.evidenceNeeded,
      ]),
    ).toEqual([
      ["r_plan1_expense", true, ["money.totals"]],
      ["r_plan2_income", true, ["money.totals"]],
      ["r_plan3", false, ["debt.payments"]],
      ["r_plan4", false, ["task.ranking"]],
    ]);
    const check = checkBrief(refined.brief, {
      consent,
      route: SHARED_ROUTE,
      authorizedHandles: new Set(),
    });
    expect(check.ok && check.path).toBe("deep");
  });

  it("keeps the rules' requirements and adds only new, non-essential ones", () => {
    const brief = rules("Where do I spend the most?");
    const refined = refineBrief(
      brief,
      output({
        subQuestions: [
          {
            question: "Which categories hold the most spending?",
            capabilities: ["money.category_ranking"],
            moneyKind: "expense",
          },
          {
            question: "How much income was there to cover it?",
            capabilities: ["money.totals"],
            moneyKind: "income",
          },
        ],
      }),
      { now, allowed, defaultedTopic: false },
    );
    expect(refined.brief.requirements[0]).toEqual(brief.requirements[0]);
    expect(
      refined.brief.requirements
        .slice(1)
        .map((item) => [item.id, item.essential]),
    ).toEqual([["r_plan1_income", false]]);
  });

  it("drops capabilities that consent does not allow", () => {
    const refined = refineBrief(
      rules("How much did I spend this month?"),
      output({
        subQuestions: [
          {
            question: "Where do debts stand?",
            capabilities: ["debt.payments"],
            moneyKind: "none",
          },
        ],
      }),
      {
        now,
        allowed: new Set([...allowed].filter((id) => id !== "debt.payments")),
        defaultedTopic: false,
      },
    );
    expect(refined.brief.requirements.map((item) => item.id)).toEqual([
      "r_money",
    ]);
  });

  it("adds an aligned baseline when the answer needs one", () => {
    const refined = refineBrief(
      rules("How much did I spend this month?"),
      output({ comparePreviousPeriod: true }),
      { now, allowed, defaultedTopic: false },
    );
    expect(
      refined.brief.periods.map(({ id, from, through }) => [id, from, through]),
    ).toEqual([
      ["requested", "2026-09-01", "2026-09-24"],
      ["previous", "2026-08-01", "2026-08-24"],
    ]);
  });

  it("reads a named window, and refuses a future or overlong one", () => {
    const named = refineBrief(
      rules("How much have I spent since the start of summer?"),
      output({
        period: { from: "2026-06-01", through: "2026-09-24" },
        comparePreviousPeriod: true,
      }),
      { now, allowed, defaultedTopic: false },
    );
    expect(
      named.brief.periods.map(({ id, from, through, basis }) => [
        id,
        from,
        through,
        basis,
      ]),
    ).toEqual([
      ["requested", "2026-06-01", "2026-09-24", "explicit"],
      ["previous", "2026-02-05", "2026-05-31", "explicit"],
    ]);
    for (const period of [
      { from: "2026-09-01", through: "2026-10-30" },
      { from: "2025-01-01", through: "2026-09-24" },
      { from: "2026-02-30", through: "2026-03-10" },
    ]) {
      const refused = refineBrief(
        rules("How much have I spent lately?"),
        output({ period }),
        { now, allowed, defaultedTopic: false },
      );
      expect(refused.brief.periods[0]?.basis).toBe("disclosed_default");
    }
  });

  it("asks back only when no area of the records could answer", () => {
    const brief = rules("What will the weather be tomorrow?");
    const asked = refineBrief(
      brief,
      output({
        clarification:
          "ATLAS has no weather records. Which records did you mean?",
      }),
      { now, allowed, defaultedTopic: true },
    );
    expect(asked.clarification).toBe(
      "ATLAS has no weather records. Which records did you mean?",
    );
    // A question the rules placed is answered, never sent back.
    const placed = refineBrief(
      rules("How much did I spend this month?"),
      output({ clarification: "Which month?" }),
      { now, allowed, defaultedTopic: false },
    );
    expect(placed.clarification).toBeNull();
  });

  it("never changes a scenario's own reading", () => {
    const brief = rules(
      "What if I pay ₱2,000 extra a month on my credit card debt?",
    );
    const refined = refineBrief(
      brief,
      output({
        intent: "compare",
        comparePreviousPeriod: true,
        period: { from: "2026-06-01", through: "2026-09-24" },
      }),
      { now, allowed, defaultedTopic: false },
    );
    expect(refined.brief.intent).toBe("scenario");
    expect(refined.brief.periods).toEqual(brief.periods);
  });

  it("names a requirement's money kind by ID before wording", () => {
    expect(
      requirementMoneyKind({ id: "r_plan1_expense", question: "Income gap" }),
    ).toBe("expense");
    expect(
      requirementMoneyKind({ id: "r_plan2_income", question: "Spending" }),
    ).toBe("income");
    expect(requirementMoneyKind({ id: "r_money", question: "My salary" })).toBe(
      "income",
    );
  });

  it("falls back to the rules' brief when the call fails", async () => {
    const brief = rules("How am I doing overall?");
    const call: StageCaller = async () => ({
      status: "error",
      code: "timeout",
    });
    const refined = await planAnalysis({
      brief,
      history: [],
      model: "gpt-5.4-mini-2026-03-17",
      now,
      allowed,
      defaultedTopic: true,
      call,
    });
    expect(refined).toMatchObject({ brief, plan: null, resolvedModel: null });
  });

  it("sends the planner no records, only the question and the catalog", async () => {
    const requests: Parameters<StageCaller>[0][] = [];
    const call: StageCaller = async (request) => {
      requests.push(request);
      return { status: "ok", content: output(), resolvedModel: "planner" };
    };
    await planAnalysis({
      brief: rules("How am I doing overall?"),
      history: [],
      model: "gpt-5.4-mini-2026-03-17",
      now,
      allowed,
      defaultedTopic: true,
      call,
    });
    const [request] = requests;
    expect(request?.stage).toBe("planner");
    expect(request?.payload.evidence).toEqual([]);
    expect(request?.payload.labels).toEqual([]);
    const rendered = request!.render(request!.payload) as {
      catalog: Array<{ id: string }>;
    };
    expect(rendered.catalog.map((item) => item.id)).toContain("debt.payments");
  });

  it("gathers evidence from every planned area", async () => {
    const refined = refineBrief(
      rules("How am I doing overall?"),
      output({
        subQuestions: [
          {
            question: "Spending this month",
            capabilities: ["money.totals"],
            moneyKind: "expense",
          },
          {
            question: "Income this month",
            capabilities: ["money.totals"],
            moneyKind: "income",
          },
          {
            question: "Debts",
            capabilities: ["debt.payments"],
            moneyKind: "none",
          },
          {
            question: "Tasks",
            capabilities: ["task.ranking"],
            moneyKind: "none",
          },
        ],
      }),
      { now, allowed, defaultedTopic: true },
    );
    const check = checkBrief(refined.brief, {
      consent,
      route: SHARED_ROUTE,
      authorizedHandles: new Set(),
    });
    if (!check.ok) throw new Error(check.reason);
    const policy = { consent, route: SHARED_ROUTE };
    const result = await runInvestigation({
      check,
      proposer: capabilityProposer(now),
      invoke: (tool, input) => invokeAnalystToolV2(tool, input, policy),
      clock: () => 0,
    });
    const reads = result.outcomes.map((item) => [
      item.request.tool,
      (item.request.input as { kind?: string }).kind ?? null,
    ]);
    expect(reads).toEqual(
      expect.arrayContaining([
        ["getMoneyBreakdown", "expense"],
        ["getMoneyBreakdown", "income"],
        ["getDebtProgress", null],
        ["getTaskFocus", null],
      ]),
    );
    expect(
      new Set(result.selection.selected.map((item) => item.domain)),
    ).toEqual(new Set(["money", "debts", "tasks"]));
  });

  it("turns a draft's requests into new requirements, never repeating a read", () => {
    const brief = rules("How much did I spend this month?");
    const added = requestedRequirements(
      brief,
      [
        // Already read by the brief: skipped.
        {
          question: "Spending this month",
          capabilities: ["money.totals"],
          moneyKind: "expense",
        },
        {
          question: "Debts",
          capabilities: ["debt.payments", "not.a.capability"],
        },
        { question: "Malformed", capabilities: "debt.payments" },
        {
          question: "Income this month",
          capabilities: ["money.totals"],
          moneyKind: "income",
        },
      ],
      { now, allowed, limit: 2 },
    );
    expect(
      added.map((item) => [item.id, item.essential, item.evidenceNeeded]),
    ).toEqual([
      ["r_more1", false, ["debt.payments"]],
      ["r_more2_income", false, ["money.totals"]],
    ]);
    expect(
      requestedRequirements(
        brief,
        [{ question: "Debts", capabilities: ["debt.payments"] }],
        {
          now,
          allowed: new Set([...allowed].filter((id) => id !== "debt.payments")),
          limit: 2,
        },
      ),
    ).toEqual([]);
  });
});
