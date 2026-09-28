import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolFailure } from "@/lib/analyst/tools/contracts";
import { createToolTransport } from "@/lib/analyst/tools/transport";
import { contribution, rank } from "../calculations";
import { EXPECTED_FACTS } from "../evaluation/expected";
import { INJECTION_REFLECTION, OWNER_A, OWNER_B } from "../evaluation/fixtures";
import {
  createEmulator,
  fixtureTables,
  fixtureUuid,
  type Emulator,
} from "../evaluation/postgrest";
import {
  SHARED_ROUTE,
  filterProviderPayload,
  legacyEquivalentConsent,
  type AnalystConsent,
  type ProviderRoute,
} from "../policy";
import { BRIDGED_TOOLS } from "./contracts";
import { V2_TABLES, invokeAnalystToolV2, listAnalystToolsV2 } from "./server";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const sensitiveConsent: AnalystConsent = {
  ...consent,
  profiles: ["aggregate", "basic_context", "sensitive_narrative"],
};
const verifiedRoute: ProviderRoute = {
  id: "openai_non_sharing",
  sharing: "non_sharing_verified",
  profiles: ["aggregate", "basic_context", "sensitive_narrative"],
};
const handle = (type: string, fixtureId: string) =>
  `${type}:${fixtureUuid(fixtureId)}`;
let emulator: Emulator;

const signIn = (
  owner: typeof OWNER_A | typeof OWNER_B,
  variant: "rich" | "bulk" = "rich",
) => {
  emulator = createEmulator(fixtureTables(variant), owner);
  vi.stubGlobal("fetch", emulator.fetch);
};
const invoke = (
  name: string,
  input: unknown,
  options: { consent: AnalystConsent | null; route: ProviderRoute } = {
    consent,
    route: SHARED_ROUTE,
  },
) => invokeAnalystToolV2(name, input, options);

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["Date"],
    now: new Date("2026-09-24T04:00:00.000Z"),
  });
  signIn(OWNER_A);
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

describe("Analyst V2 tool registry", () => {
  it("is separate from the legacy catalog and read-only", () => {
    expect(listAnalystToolsV2().map((tool) => tool.name)).toEqual([
      "resolveAnalystEntities",
      "searchAnalystRecords",
      "getAnalystRecordDetails",
      "getMoneyBreakdown",
      "getGoalAnalysisContext",
      "getDecisionAnalysisContext",
      "getRelationshipPaths",
      // Existing aggregate tools, called unchanged and adapted.
      ...BRIDGED_TOOLS,
    ]);
    expect(listAnalystToolsV2().every((tool) => tool.readOnly)).toBe(true);
  });

  it("runs bridged aggregate tools unchanged and adapts their fixed labels", async () => {
    const focus = await invoke("getTaskFocus", {});
    expect(focus.status).toBe("ready");
    expect(focus.tool).toBe("getTaskFocus");
    const open = focus.evidence.find((item) =>
      item.id.startsWith("getTaskFocus.tasks.open."),
    )!;
    // The tool's fixed label survives, in the task domain, as an aggregate.
    expect(open).toMatchObject({
      kind: "metric",
      value: 2,
      domain: "tasks",
      semantics: { definition: "Open tasks", aggregation: "count" },
      sharing: { route: "aggregate" },
    });
    const pipeline = await invoke("getCareerPipeline", {});
    expect(
      pipeline.evidence.map((item) => item.semantics.definition),
    ).toContain("Applications with overdue next action");
    // Inputs are validated with the tool's own schema before anything runs.
    expect(
      (
        await invoke("getDebtPayments", {
          from: "2026-09-24",
          through: "2026-09-01",
        })
      ).error?.code,
    ).toBe("invalid_input");
    // With the runway supplement the engine reports owner A's reserve.
    const runway = await invoke("getRunway", {});
    expect(runway.status).toBe("ready");
    expect(
      runway.evidence.find(
        (item) => item.semantics.definition === "Available liquid balance",
      ),
    ).toMatchObject({ value: 6_000_000, domain: "runway" });
    // Owner B has no balances: "not enough history" stays insufficient,
    // never an operational error.
    signIn(OWNER_B);
    const none = await invoke("getRunway", {});
    expect(none.status).toBe("insufficient");
    expect(none.error).toBeUndefined();
  });

  it("rejects unknown tools, raw IDs, SQL, oversized and duplicate input before reading", async () => {
    for (const [name, input] of [
      ["deleteEverything", {}],
      ["getAnalystRecordDetails", { handles: [fixtureUuid("goal-a-career")] }],
      ["getAnalystRecordDetails", { handles: ["goal:1; drop table goals"] }],
      [
        "getAnalystRecordDetails",
        { handles: ["capture_preview:" + fixtureUuid("x")] },
      ],
      [
        "getAnalystRecordDetails",
        {
          handles: Array.from({ length: 11 }, (_, i) =>
            handle("task", `t${i}`),
          ),
        },
      ],
      [
        "getAnalystRecordDetails",
        {
          handles: [
            handle("goal", "goal-a-career"),
            handle("goal", "goal-a-career"),
          ],
        },
      ],
      ["resolveAnalystEntities", { text: "x".repeat(121), types: ["goal"] }],
      [
        "resolveAnalystEntities",
        { text: "career", types: ["goal"], owner: OWNER_B },
      ],
      [
        "getMoneyBreakdown",
        { from: "2025-01-01", through: "2026-09-24", kind: "expense" },
      ],
    ] as const) {
      const result = await invoke(name, input);
      expect(result.error?.code, name).toBe("invalid_input");
    }
    expect(emulator.requests).toEqual([]);
  });

  it("reads nothing without current consent", async () => {
    const result = await invoke(
      "resolveAnalystEntities",
      { text: "career", types: ["goal"] },
      { consent: null, route: SHARED_ROUTE },
    );
    expect(result.status).toBe("error");
    expect(emulator.requests).toEqual([]);
  });

  it("never lets a V2 tool read unconfirmed Capture previews", async () => {
    expect(V2_TABLES.has("capture_previews")).toBe(false);
    const transport = createToolTransport({
      ownerId: OWNER_A,
      signal: new AbortController().signal,
      fetch: emulator.fetch,
      policy: { tables: V2_TABLES },
    });
    await expect(
      transport.fetch(
        `http://localhost:54321/rest/v1/capture_previews?select=id&user_id=eq.${OWNER_A}`,
      ),
    ).rejects.toBeInstanceOf(ToolFailure);
  });
});

describe("entity resolution (AI-02B)", () => {
  it("keeps two owners with identical goal names isolated", async () => {
    const a = await invoke("resolveAnalystEntities", {
      text: "Land a developer job",
      types: ["goal"],
    });
    expect(a.candidates).toEqual([
      { handle: handle("goal", "goal-a-career"), type: "goal", basis: "exact" },
    ]);
    expect(a.ambiguous).toBe(false);
    signIn(OWNER_B);
    const b = await invoke("resolveAnalystEntities", {
      text: "Land a developer job",
      types: ["goal"],
    });
    expect(b.candidates.map((item) => item.handle)).toEqual([
      handle("goal", "goal-b-career"),
    ]);
    expect(JSON.stringify(b)).not.toContain(fixtureUuid("goal-a-career"));
  });

  it("returns owner-only candidates for an ambiguous name instead of guessing", async () => {
    const result = await invoke("resolveAnalystEntities", {
      text: "Acme Synthetic",
      types: ["job_application", "goal"],
    });
    expect(result.ambiguous).toBe(true);
    expect(result.candidates.map((item) => item.handle).sort()).toEqual(
      [
        handle("job_application", "app-a-acme-fe"),
        handle("job_application", "app-a-acme-be"),
      ].sort(),
    );
    expect(result.labels.map((item) => item.text).sort()).toEqual([
      "Acme Synthetic · Backend Engineer",
      "Acme Synthetic · Frontend Engineer",
    ]);
    const main = await invoke("resolveAnalystEntities", {
      text: "my main goal",
      types: ["goal"],
    });
    expect(main.candidates).toEqual([]);
  });

  it("resolves a name mentioned inside a longer phrase", async () => {
    const result = await invoke("resolveAnalystEntities", {
      text: "How is my Build emergency fund goal going",
      types: ["goal"],
    });
    expect(result.candidates).toEqual([
      {
        handle: handle("goal", "goal-a-fund"),
        type: "goal",
        basis: "mentioned",
      },
    ]);
  });

  it("pages search results with a stable cursor", async () => {
    const first = await invoke("searchAnalystRecords", {
      text: "a",
      type: "task",
      limit: 1,
    }).catch(() => null);
    expect(first?.error?.code).toBe("invalid_input");
    const page = await invoke("searchAnalystRecords", {
      text: "re",
      type: "task",
      limit: 1,
    });
    expect(page.candidates).toHaveLength(1);
    expect(page.nextCursor).not.toBeNull();
    const next = await invoke("searchAnalystRecords", {
      text: "re",
      type: "task",
      limit: 1,
      cursor: page.nextCursor,
    });
    const seen = new Set(
      [...page.candidates, ...next.candidates].map((item) => item.handle),
    );
    expect(seen.size).toBe(page.candidates.length + next.candidates.length);
  });
});

describe("record details (AI-02B)", () => {
  it("reports another owner's or an unknown record the same way", async () => {
    signIn(OWNER_B);
    const foreign = await invoke("getAnalystRecordDetails", {
      handles: [handle("goal", "goal-a-career")],
    });
    const unknown = await invoke("getAnalystRecordDetails", {
      handles: [handle("goal", "never-existed")],
    });
    for (const result of [foreign, unknown]) {
      expect(result.status).toBe("insufficient");
      expect(result.evidence).toEqual([]);
      expect(result.labels).toEqual([]);
    }
    expect(foreign.limitations).toEqual(unknown.limitations);
  });

  it("returns dated task facts bound to their own dates", async () => {
    const result = await invoke("getAnalystRecordDetails", {
      handles: [handle("task", "task-a-site")],
    });
    const completed = result.evidence.find((item) =>
      item.id.endsWith(".completed_on"),
    )!;
    expect(completed).toMatchObject({
      kind: "record_fact",
      value: "2026-09-12",
      time: { period: { from: "2026-09-12" } },
    });
    expect(
      result.evidence.find((item) => item.id.endsWith(".linked_goal")),
    ).toMatchObject({
      value: handle("goal", "goal-a-career"),
    });
    expect(result.labels[0]?.text).toBe("Build portfolio site");
  });

  it("does not retrieve private reflections unless consent and the route allow it", async () => {
    const review = handle("weekly_review", "rev-a-0907");
    const shared = await invoke(
      "getAnalystRecordDetails",
      { handles: [review], profile: "sensitive_narrative" },
      { consent: sensitiveConsent, route: SHARED_ROUTE },
    );
    expect(shared.evidence.some((item) => item.kind === "text_excerpt")).toBe(
      false,
    );
    expect(shared.limitations.join(" ")).toMatch(/not retrieved/);
    const allowed = await invoke(
      "getAnalystRecordDetails",
      { handles: [review], profile: "sensitive_narrative" },
      { consent: sensitiveConsent, route: verifiedRoute },
    );
    const text = allowed.evidence.find((item) => item.kind === "text_excerpt");
    // Stored instructions stay inert data, attributed to the user.
    expect(text).toMatchObject({
      kind: "text_excerpt",
      attributedTo: "user",
      text: INJECTION_REFLECTION,
    });
    expect(listAnalystToolsV2()).toHaveLength(7 + BRIDGED_TOOLS.length);
    // Even retrieved text never reaches the shared route.
    const filtered = filterProviderPayload(
      {
        stage: "writer",
        question: "Summarize my September reviews.",
        history: [],
        evidence: allowed.evidence,
        labels: [],
      },
      sensitiveConsent,
      SHARED_ROUTE,
    );
    expect(
      filtered.payload.evidence.some((item) => item.kind === "text_excerpt"),
    ).toBe(false);
  });
});

describe("money breakdown (AI-02B)", () => {
  it("returns every category from the aggregate and reconciles the change", async () => {
    const now = await invoke("getMoneyBreakdown", {
      from: "2026-09-01",
      through: "2026-09-24",
      kind: "expense",
    });
    const before = await invoke("getMoneyBreakdown", {
      from: "2026-08-01",
      through: "2026-08-24",
      kind: "expense",
    });
    expect(now.status).toBe("ready");
    const members = (result: typeof now) =>
      result.evidence.filter((item) => item.scope.cohort);
    const total = (result: typeof now) =>
      result.evidence.find((item) => item.scope.type === "whole_domain")!;
    expect(total(now)).toMatchObject({
      value: EXPECTED_FACTS["expense.current"]!.value,
    });
    const fact = contribution("c", {
      totalCurrent: total(now),
      totalPrevious: total(before),
      current: members(now),
      previous: members(before),
    });
    expect(fact.reconciled).toBe(true);
    expect(fact.output).toMatchObject({
      value: EXPECTED_FACTS["expense.change"]!.value,
    });
    expect(fact.top?.sort()).toEqual(
      [
        handle("category", "cat-a-dining"),
        handle("category", "cat-a-groceries"),
      ].sort(),
    );
    expect(now.labels.map((item) => item.text)).toEqual(
      expect.arrayContaining(["Groceries", "Dining"]),
    );
    // Category names are owner-only labels, never evidence text.
    expect(JSON.stringify(now.evidence)).not.toContain("Groceries");
  });

  it("ranks a 1,501-row month completely through the aggregate", async () => {
    signIn(OWNER_A, "bulk");
    const result = await invoke("getMoneyBreakdown", {
      from: "2026-09-01",
      through: "2026-09-24",
      kind: "expense",
    });
    expect(result.status).toBe("ready");
    const ranking = rank(
      "r",
      result.evidence.filter((item) => item.scope.cohort),
    );
    expect(ranking.top).toEqual([handle("category", "cat-a-groceries")]);
    expect(
      result.evidence.find((item) => item.scope.type === "whole_domain"),
    ).toMatchObject({
      value: EXPECTED_FACTS["bulk.expense_total"]!.value,
    });
    expect(result.metadata.rows).toBeLessThan(10);
  });

  it("withholds totals when the aggregate exceeds its bound", async () => {
    emulator.oversizedAggregate = true;
    const result = await invoke("getMoneyBreakdown", {
      from: "2026-09-01",
      through: "2026-09-24",
      kind: "expense",
    });
    expect(result.status).toBe("partial");
    expect(result.error?.code).toBe("partial");
    expect(result.evidence).toEqual([]);
  });
});

describe("goal, decision and Graph context (AI-02B, AI-02C)", () => {
  it("builds goal context from the existing goal-linked activity adapter", async () => {
    const result = await invoke("getGoalAnalysisContext", {
      goal: handle("goal", "goal-a-career"),
      from: "2026-09-01",
      through: "2026-09-24",
    });
    expect(result.status).not.toBe("error");
    const byKey = (key: string) =>
      result.evidence.filter((item) => item.semantics.metricKey === key);
    expect(byKey("goal_linked_task_completion")).toHaveLength(2);
    expect(byKey("goal_linked_milestone_completion")[0]).toMatchObject({
      value: 1,
    });
    expect(byKey("record:goal.progress_percent")[0]).toMatchObject({
      value: 40,
    });
    expect(
      result.evidence.every(
        (item) => item.scope.id === handle("goal", "goal-a-career"),
      ),
    ).toBe(true);
  });

  it("keeps the original decision plan beside its revision", async () => {
    const decision = handle("decision", "decision-a-study");
    const result = await invoke(
      "getDecisionAnalysisContext",
      { decision, includeText: true },
      { consent: sensitiveConsent, route: verifiedRoute },
    );
    const text = (suffix: string) =>
      result.evidence.find((item) => item.id.endsWith(suffix));
    expect(text(".original_plan")).toMatchObject({
      text: expect.stringContaining("two free evenings"),
    });
    expect(text(".current_plan")).toMatchObject({
      text: expect.stringContaining("three free evenings"),
    });
    expect(text(".review_state")).toMatchObject({
      value: "review_date_not_reached",
    });
    expect(text(".unavailable_observation_sources")).toMatchObject({
      value: 1,
    });
    expect(
      result.evidence.filter((item) => item.id.includes(".observation.")),
    ).toHaveLength(2);
    expect(
      result.evidence.some(
        (item) =>
          item.kind === "text_excerpt" && /receipt shows/.test(item.text),
      ),
    ).toBe(true);
    // Without approval, only dates, counts and the review state are read.
    const plain = await invoke("getDecisionAnalysisContext", {
      decision,
      includeText: true,
    });
    expect(plain.evidence.some((item) => item.kind === "text_excerpt")).toBe(
      false,
    );
    expect(plain.limitations.join(" ")).toMatch(/not retrieved/);
  });

  it("traverses two hops with provenance, cuts cycles and isolates owners", async () => {
    const start = handle("goal", "goal-a-career");
    const result = await invoke("getRelationshipPaths", { start, depth: 2 });
    expect(result.status).not.toBe("error");
    const decisionKey = `decision:${fixtureUuid("decision-a-study")}`;
    const toDecision = result.evidence.find(
      (item) =>
        item.kind === "graph_path" && item.path.at(-1)?.handle === decisionKey,
    );
    expect(toDecision).toBeDefined();
    expect(toDecision?.coverage.relationship).toBe("current_only");
    const reached = result.evidence.flatMap((item) =>
      item.kind === "graph_path" ? [item.path.at(-1)!.handle] : [],
    );
    expect(new Set(reached).size).toBe(reached.length);
    expect(result.limitations.join(" ")).toMatch(/loop was found and cut/);
    signIn(OWNER_B);
    const foreign = await invoke("getRelationshipPaths", { start, depth: 2 });
    expect(foreign.error?.code).toBe("unavailable_source");
    expect(foreign.labels).toEqual([]);
  });
});
