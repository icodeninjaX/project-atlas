import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkBrief } from "./brief";
import { analystCapabilities } from "./capabilities";
import type { DerivedFact, EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { OWNER_A } from "./evaluation/fixtures";
import { createEmulator, fixtureTables } from "./evaluation/postgrest";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import { refineBrief, type PlannerOutput } from "./planner";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { capabilityProposer } from "./proposer";
import { invokeAnalystToolV2 } from "./tools/server";
import { resolvePeriod } from "./turns";

/**
 * Questions the fixed reads could not answer, run end to end without a
 * model: the planner's reading is scripted, and everything after it (the
 * brief check, category resolution, the owner-scoped reads on the synthetic
 * fixtures, and ATLAS's derivations) is real. Each case states the exact
 * figures a correct answer rests on, computed by hand from the fixtures.
 * A change that breaks one of these answers fails here.
 */

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
  vi.stubGlobal("fetch", createEmulator(fixtureTables(), OWNER_A).fetch);
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

type Sub = PlannerOutput["subQuestions"][number];
type Answered = { evidence: EvidenceV2[]; derived: DerivedFact[] };

async function answer(
  question: string,
  sub: Sub,
  period: PlannerOutput["period"] = null,
): Promise<Answered> {
  const refined = refineBrief(
    deterministicBrief({ question, plan: null, now }),
    {
      understanding: question,
      intent: "compare",
      responseStyle: "standard",
      subQuestions: [sub],
      hypotheses: [],
      comparePreviousPeriod: false,
      period,
      clarification: null,
    },
    { now, allowed, defaultedTopic: true },
  );
  const check = checkBrief(refined.brief, {
    consent,
    route: SHARED_ROUTE,
    authorizedHandles: new Set(),
  });
  if (!check.ok) throw new Error(check.reason);
  const result = await runInvestigation({
    check,
    proposer: capabilityProposer(now),
    invoke: (tool, input) =>
      invokeAnalystToolV2(tool, input, { consent, route: SHARED_ROUTE }),
    clock: () => 0,
  });
  const evidence = result.selection.selected;
  return { evidence, derived: autoDerive(evidence, { today: "2026-09-24" }) };
}

const query = (question: string, q: NonNullable<Sub["query"]>): Sub => ({
  question,
  capabilities: ["money.query"],
  moneyKind: "expense",
  query: q,
});
const none = {
  category: null,
  minAmountPesos: null,
  maxAmountPesos: null,
};
const value = (answered: Answered, metricKey: string, member?: string) => {
  const item = answered.evidence.find(
    (entry) =>
      entry.semantics.metricKey === metricKey &&
      (member === undefined
        ? entry.scope.type === "whole_domain"
        : entry.scope.cohort?.member === member),
  );
  return item && "value" in item ? item.value : undefined;
};

describe("questions that need a transaction query", () => {
  it("Do I spend more on weekends? (Sep 1–24)", async () => {
    const answered = await answer(
      "Do I spend more on weekends?",
      query("Weekend against weekday spending", {
        ...none,
        groupBy: "weekend",
        measures: ["total", "count"],
      }),
    );
    // Sundays 6, 13 and 20 September: ₱1,800 + ₱450 + ₱350.
    expect(value(answered, "expense_query_centavos", "day_type:weekend")).toBe(
      260_000,
    );
    expect(value(answered, "expense_query_centavos", "day_type:weekday")).toBe(
      840_000,
    );
    expect(value(answered, "expense_query_count", "day_type:weekend")).toBe(3);
    const ranking = answered.derived.find(
      (item) =>
        item.operation === "rank" &&
        item.metricKey === "expense_query_centavos",
    );
    expect(ranking?.top).toEqual(["day_type:weekday"]);
    const weekendShare = answered.derived.find((item) =>
      item.id.startsWith("derived.share.day_type:weekend|"),
    );
    expect(weekendShare?.output).toEqual({
      status: "defined",
      value: 23.6,
      unit: "percent",
    });
  });

  it("How many purchases over ₱1,000 did I make this month?", async () => {
    const answered = await answer(
      "How many purchases over ₱1,000 did I make this month?",
      query("Purchases over ₱1,000", {
        ...none,
        minAmountPesos: 1000,
        groupBy: "none",
        measures: ["count", "total"],
      }),
    );
    expect(value(answered, "expense_query_count")).toBe(4);
    expect(value(answered, "expense_query_centavos")).toBe(960_000);
  });

  it("What's my average purchase this month?", async () => {
    const answered = await answer(
      "What's my average purchase this month?",
      query("Average expense transaction", {
        ...none,
        groupBy: "none",
        measures: ["average", "count"],
      }),
    );
    // ₱11,000 over 7 transactions, rounded to the centavo.
    expect(value(answered, "expense_query_average_centavos")).toBe(157_143);
    expect(value(answered, "expense_query_count")).toBe(7);
  });

  it("How much did I spend on dining each month since August?", async () => {
    const answered = await answer(
      "How much did I spend on dining each month since August?",
      query("Dining by month", {
        ...none,
        category: "dining",
        groupBy: "month",
        measures: ["total"],
      }),
      { from: "2026-08-01", through: "2026-09-24" },
    );
    expect(value(answered, "expense_query_centavos", "month:2026-08")).toBe(
      80_000,
    );
    expect(value(answered, "expense_query_centavos", "month:2026-09")).toBe(
      180_000,
    );
    const total = answered.evidence.find(
      (item) =>
        item.semantics.metricKey === "expense_query_centavos" &&
        item.scope.type === "whole_domain",
    )!;
    // A filtered query never poses as all spending.
    expect(total.scope.id).not.toBe("whole_domain:expense");
    expect(total).toMatchObject({ value: 260_000 });
  });

  it("names a category the records do not have without reading anything", async () => {
    const answered = await answer(
      "How much did I spend on travel?",
      query("Travel spending", {
        ...none,
        category: "travel",
        groupBy: "none",
        measures: ["total"],
      }),
    );
    expect(
      answered.evidence.some((item) => item.sourceType === "queryTransactions"),
    ).toBe(false);
  });
});

describe("reading the period", () => {
  it("reads 'since August' as August 1 through today, not August alone", () => {
    expect(resolvePeriod("How much since August?", now)).toMatchObject({
      from: "2026-08-01",
      through: "2026-09-24",
    });
    expect(resolvePeriod("Magkano mula Agosto?", now)).toMatchObject({
      from: "2026-08-01",
      through: "2026-09-24",
    });
    // A single named month is still that month.
    expect(resolvePeriod("How much in August?", now)).toMatchObject({
      from: "2026-08-01",
      through: "2026-08-31",
    });
    // Never more than a year back.
    expect(resolvePeriod("since August 2024", now)).toMatchObject({
      from: "2025-09-24",
      through: "2026-09-24",
    });
  });
});
