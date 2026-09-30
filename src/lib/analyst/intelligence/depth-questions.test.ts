import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkBrief } from "./brief";
import { analystCapabilities } from "./capabilities";
import type { DerivedFact, EvidenceV2 } from "./contracts";
import { autoDerive } from "./derive";
import { OWNER_A } from "./evaluation/fixtures";
import {
  createEmulator,
  fixtureTables,
  fixtureUuid,
} from "./evaluation/postgrest";
import { runInvestigation } from "./orchestrator";
import { deterministicBrief } from "./planning";
import type { AnalysisBrief } from "./contracts";
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

/**
 * Owner A's records with three earlier months of dining and groceries: dining
 * ₱500, ₱600 and ₱700 in May through July (then ₱800 in August), and
 * groceries ₱4,000 each month.
 */
function withHistory() {
  const tables = fixtureTables();
  const row = (id: string, category: string, amount: number, date: string) => ({
    id: fixtureUuid(id),
    user_id: OWNER_A,
    category_id: fixtureUuid(category),
    transaction_type: "expense",
    amount_centavos: amount,
    transaction_date: date,
    merchant_or_source: "Synthetic merchant",
    description: null,
  });
  tables.transactions!.push(
    row("tx-h-0510", "cat-a-dining", 50_000, "2026-05-10"),
    row("tx-h-0610", "cat-a-dining", 60_000, "2026-06-10"),
    row("tx-h-0710", "cat-a-dining", 70_000, "2026-07-10"),
    row("tx-h-0512", "cat-a-groceries", 400_000, "2026-05-12"),
    row("tx-h-0612", "cat-a-groceries", 400_000, "2026-06-12"),
    row("tx-h-0712", "cat-a-groceries", 400_000, "2026-07-12"),
  );
  vi.stubGlobal("fetch", createEmulator(tables, OWNER_A).fetch);
}

async function investigate(brief: AnalysisBrief): Promise<Answered> {
  const check = checkBrief(brief, {
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

const dining = `category:${fixtureUuid("cat-a-dining")}`;
const groceries = `category:${fixtureUuid("cat-a-groceries")}`;
/** The trend fact of the query that read `category`. */
const trendOf = (answered: Answered, category: string, name: string) => {
  const scopes = new Set(
    answered.evidence
      .filter((item) =>
        item.provenance.sourceRefs.some((ref) => ref.handle === category),
      )
      .map((item) => item.scope.id),
  );
  return answered.derived.find(
    (item) =>
      item.id.startsWith("derived.trend.") &&
      item.id.endsWith(`.${name}`) &&
      scopes.has(item.scopeId),
  );
};

describe("category trends", () => {
  it("Is my dining spending going up?", async () => {
    withHistory();
    const answered = await answer(
      "Is my dining spending going up?",
      query("Dining by month", {
        ...none,
        category: "dining",
        groupBy: "month",
        measures: ["total"],
      }),
    );
    // Without a named window, the last six months: April through today.
    const september = answered.evidence.find(
      (item) => item.scope.cohort?.member === "month:2026-09",
    )!;
    expect(september.time.period).toEqual({
      from: "2026-04-01",
      through: "2026-09-24",
    });
    // April has no dining and no records are known before it, so the whole
    // months are May through August: ₱500, ₱600, ₱700, ₱800.
    expect(trendOf(answered, dining, "streak")?.output).toMatchObject({
      value: 3,
    });
    expect(trendOf(answered, dining, "mean")?.output).toMatchObject({
      value: 65_000,
    });
    expect(trendOf(answered, dining, "latest_vs_mean")?.output).toMatchObject({
      value: 20_000,
    });
    // September so far is ₱1,800 over 24 days: at ₱75 a day, ₱2,250.
    expect(
      answered.derived.find((item) => item.operation === "projection")?.output,
    ).toMatchObject({ value: 225_000 });
  });

  it("Why did my spending go up?", async () => {
    withHistory();
    const answered = await investigate(
      deterministicBrief({
        question: "Why did my spending go up?",
        plan: null,
        now,
      }),
    );
    // Sep 1–24 against Aug 1–24: ₱11,000 against ₱9,100, with groceries and
    // dining tied for the largest rise (+₱1,000 each).
    const contribution = answered.derived.find(
      (item) =>
        item.id ===
        "derived.contribution.whole_domain:expense|expense_centavos",
    );
    expect(contribution?.output).toMatchObject({ value: 190_000 });
    expect([...(contribution?.top ?? [])].sort()).toEqual(
      [dining, groceries].sort(),
    );
    // Each leading category's own months since April.
    expect(trendOf(answered, dining, "streak")?.output).toMatchObject({
      value: 3,
    });
    // Groceries: ₱4,000 in May through July, then ₱13,999 in August.
    expect(
      trendOf(answered, groceries, "latest_vs_mean")?.output,
    ).toMatchObject({ value: 999_900 });
    expect(trendOf(answered, groceries, "streak")).toBeUndefined();
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
