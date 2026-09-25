import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createClient as supabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { invokeAnalystTool, listAnalystTools } from "./server";
import { executeAnalystPlan } from "@/lib/analyst/planner/server";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

const enabled = process.env.ATLAS_TOOL_LOCAL_TESTS === "1";
const suite = enabled ? describe : describe.skip;
const authOptions = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
};
type Fixture = {
  owner: string;
  token: string;
  goal: string;
  task: string;
  debt: string;
  transaction: string;
  amount: number;
  client: SupabaseClient;
};
let admin: SupabaseClient;
let url: string;
let anon: string;
let active: Fixture;
const fixtures: Fixture[] = [];
const createdUsers: string[] = [];
const createdClients = new Map<string, SupabaseClient>();
const nativeFetch = globalThis.fetch;
let reads = 0;
let fixtureWrites = false;
const sourceErrors: string[] = [];
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const month = `${today.slice(0, 7)}-01`;
const previousMonth = new Date(
  Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1),
)
  .toISOString()
  .slice(0, 10);
const scenario = {
  monthlyIncomeCentavos: null,
  monthlyExpenseChangeCentavos: 0,
  oneTimePurchaseCentavos: 0,
  extraDebtPayment: null,
  targetMonths: 3,
};

function localUrl(value: string) {
  const parsed = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
    parsed.protocol !== "http:"
  )
    throw new Error(
      "Integration tests require a loopback HTTP Supabase instance.",
    );
  return parsed.origin;
}
async function insert(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await client.from(table).insert(row);
  if (error)
    throw new Error(`Synthetic ${table} fixture failed (${error.code}).`);
}
async function seed(index: number): Promise<Fixture> {
  const email = `atlas-tool-${randomUUID()}@example.test`;
  const password = `LocalOnly!${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error("Synthetic local user creation failed.");
  const owner = data.user.id;
  createdUsers.push(owner);
  const client = supabaseClient(url, anon, { auth: authOptions });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session)
    throw new Error("Synthetic local sign in failed.");
  createdClients.set(owner, client);
  const goal = randomUUID(),
    task = randomUUID(),
    debt = randomUUID(),
    transaction = randomUUID(),
    account = randomUUID(),
    category = randomUUID();
  const amount = index === 0 ? 12345 : 987654;
  await insert(client, "financial_accounts", {
    id: account,
    user_id: owner,
    name: "Synthetic tool account",
    account_type: "cash",
    opening_balance_centavos: 10000000,
    include_in_runway: true,
  });
  await insert(client, "transaction_categories", {
    id: category,
    user_id: owner,
    name: "Synthetic tool essential",
    category_type: "expense",
    is_essential: true,
  });
  await insert(client, "transactions", {
    id: transaction,
    user_id: owner,
    account_id: account,
    category_id: category,
    transaction_type: "expense",
    amount_centavos: amount,
    transaction_date: today,
  });
  await insert(client, "goals", {
    id: goal,
    user_id: owner,
    title: `Synthetic owner ${index} goal`,
    area: "finance",
  });
  await insert(client, "tasks", {
    id: task,
    user_id: owner,
    title: `Synthetic owner ${index} task`,
    related_goal_id: goal,
  });
  await insert(client, "debts", {
    id: debt,
    user_id: owner,
    creditor_name: `Synthetic owner ${index} debt`,
    debt_type: "other",
    original_balance_centavos: 100000,
    current_balance_centavos: 100000,
  });
  await insert(client, "atlas_relationships", {
    user_id: owner,
    source_type: "debt",
    source_id: debt,
    target_type: "goal",
    target_id: goal,
    relationship_type: "tracks_goal",
  });
  const budget = randomUUID();
  await insert(client, "monthly_budgets", {
    id: budget,
    user_id: owner,
    month_start: month,
    expected_income_centavos: 1000000,
  });
  await insert(client, "budget_items", {
    user_id: owner,
    monthly_budget_id: budget,
    category_id: category,
    planned_centavos: 100000,
  });
  return {
    owner,
    token: login.data.session.access_token,
    goal,
    task,
    debt,
    transaction,
    amount,
    client,
  };
}

suite("real local Analyst tool integration", () => {
  beforeAll(async () => {
    // Capture credentials only in process memory, never tool output or fixture files.
    const status = JSON.parse(
      execSync("npx supabase status -o json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ) as Record<string, string>;
    url = localUrl(status.API_URL!);
    anon = status.ANON_KEY!;
    if (!anon || !status.SERVICE_ROLE_KEY)
      throw new Error("Local Supabase credentials unavailable.");
    admin = supabaseClient(url, status.SERVICE_ROLE_KEY, { auth: authOptions });
    fixtures.push(await seed(0), await seed(1));
    active = fixtures[0]!;
    // The real client authenticates with the disposable user's access token.
    // All tool network requests are checked before they leave this process.
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (new URL(request.url).origin !== url)
          throw new Error("Non-local network request blocked.");
        if (fixtureWrites) return nativeFetch(request);
        if (
          request.method !== "GET" &&
          !new URL(request.url).pathname.startsWith("/rest/v1/rpc/")
        )
          throw new Error("Unexpected tool mutation blocked.");
        reads += 1;
        const response = await nativeFetch(request);
        if (!response.ok) {
          const body = await response.clone().json();
          sourceErrors.push(
            `${new URL(request.url).pathname}: ${body.code ?? response.status}`,
          );
        }
        return response;
      },
    );
    state.createClient.mockImplementation(
      async (options: { fetch?: typeof fetch } = {}) => {
        const client = supabaseClient(url, anon, {
          auth: authOptions,
          global: {
            fetch: options.fetch,
            headers: { Authorization: `Bearer ${active.token}` },
          },
        });
        const getUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = () => getUser(active.token);
        return client;
      },
    );
  }, 60000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    // Delete only auth IDs created by this test; cascade removes their fixtures.
    const failures: string[] = [];
    for (const id of createdUsers) {
      const client = createdClients.get(id);
      for (const table of client
        ? [
            "atlas_relationships",
            "tasks",
            "goals",
            "debt_payments",
            "debts",
            "budget_items",
            "monthly_budgets",
            "transactions",
            "financial_accounts",
            "transaction_categories",
          ]
        : []) {
        const deletion = await client!.from(table).delete().eq("user_id", id);
        if (deletion.error)
          failures.push(
            `Synthetic ${table} cleanup failed (${deletion.error.code}).`,
          );
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) failures.push("Synthetic local user cleanup failed.");
    }
    if (failures.length) throw new Error(failures.join(" "));
  }, 30000);

  it("invokes all approved tools against real local sources without a provider", async () => {
    active = fixtures[0]!;
    const inputs: Record<string, unknown> = {
      getMoneySummary: { kind: "expense", from: month, through: today },
      getDebtPayments: { from: month, through: today },
      getHistoricalMetricSeries: {
        metric: "expense_centavos",
        grain: "month",
        from: month,
        through: today,
      },
      getRelatedEntities: { entityType: "goal", entityId: active.goal },
      getCrossDomainHistory: {
        from: previousMonth,
        through: today,
        metrics: ["expense_centavos", "task_completions"],
      },
      getPatternAssociation: {
        metrics: ["expense_centavos", "task_completions"],
      },
      getGoalLinkedActivity: {
        goalId: active.goal,
        from: month,
        through: today,
      },
      getTimelineEvents: { from: month, through: today },
      runFinancialScenario: scenario,
    };
    for (const { name } of listAnalystTools()) {
      const result = await invokeAnalystTool(name, inputs[name] ?? {});
      expect(
        result.status,
        `${name}: ${result.error?.code ?? result.status}; ${sourceErrors.join("; ")}`,
      ).not.toBe("error");
      expect(result.metadata).toMatchObject({
        modelCalls: 0,
        tokens: 0,
        estimatedCost: 0,
      });
      expect(result.metadata.queries, name).toBeGreaterThan(0);
      if (name === "getRunway" || name === "runFinancialScenario")
        expect(result.status, name).toBe("ready");
    }
    expect(reads).toBeGreaterThan(13);
  }, 60000);

  it("isolates money, Graph links, and Timeline for both authenticated owners", async () => {
    const timelineIds: string[][] = [];
    for (const fixture of fixtures) {
      active = fixture;
      const money = await invokeAnalystTool("getMoneySummary", {
        kind: "expense",
        from: month,
        through: today,
      });
      expect(money.status).toBe("ready");
      expect(money.evidence[0]?.value).toBe(fixture.amount);
      const graph = await invokeAnalystTool("getRelatedEntities", {
        entityType: "goal",
        entityId: fixture.goal,
      });
      expect(graph.status).toBe("ready");
      expect(graph.evidence).toHaveLength(2);
      expect(JSON.stringify(graph.evidence)).toContain(fixture.task);
      expect(JSON.stringify(graph.evidence)).toContain(fixture.debt);
      const other = fixtures.find((item) => item.owner !== fixture.owner)!;
      expect(JSON.stringify(graph.evidence)).not.toContain(other.task);
      const timeline = await invokeAnalystTool("getTimelineEvents", {
        from: month,
        through: today,
        module: "money",
      });
      expect(timeline.status).toBe("ready");
      expect(timeline.evidence.length).toBeGreaterThan(0);
      timelineIds.push(timeline.evidence.map((item) => item.id));
      const outside = await invokeAnalystTool("getTimelineEvents", {
        from: "2000-01-01",
        through: "2000-01-02",
        module: "money",
      });
      expect(outside.evidence).toEqual([]);
      expect(outside.status).not.toBe("error");
    }
    expect(timelineIds[0]!.some((id) => timelineIds[1]!.includes(id))).toBe(
      false,
    );
  }, 60000);

  it("rejects another owner's Graph anchor and debt scenario target", async () => {
    active = fixtures[0]!;
    const other = fixtures[1]!;
    const graph = await invokeAnalystTool("getRelatedEntities", {
      entityType: "goal",
      entityId: other.goal,
    });
    expect(graph.error?.code).toBe("unavailable_source");
    expect(graph.evidence).toEqual([]);
    const result = await invokeAnalystTool("runFinancialScenario", {
      ...scenario,
      extraDebtPayment: { debtId: other.debt, amountCentavos: 100 },
    });
    expect(result.error?.code, sourceErrors.join("; ")).toBe(
      "unavailable_source",
    );
    expect(result.evidence).toEqual([]);
  }, 30000);

  it("executes a validated planner result through owner-scoped tools", async () => {
    const evidenceByOwner: string[][] = [];
    for (const fixture of fixtures) {
      active = fixture;
      const result = await executeAnalystPlan({
        version: "1",
        outcome: "plan",
        clarification: null,
        unsupportedReason: null,
        missingCapabilities: [],
        calls: [
          {
            id: "call_1",
            tool: "getMoneySummary",
            input: { kind: "expense", from: month, through: today },
          },
          {
            id: "call_2",
            tool: "getRelatedEntities",
            input: {
              entityType: "goal",
              entityId: fixture.goal,
              limit: 20,
            },
          },
        ],
      });
      expect(result.status).toBe("ready");
      expect(
        result.evidence.find((item) => item.unit === "centavos")?.value,
      ).toBe(fixture.amount);
      expect(JSON.stringify(result.evidence)).toContain(fixture.task);
      const other = fixtures.find((item) => item.owner !== fixture.owner)!;
      expect(JSON.stringify(result.evidence)).not.toContain(other.task);
      evidenceByOwner.push(result.evidence.map((item) => item.id));
    }
    expect(
      evidenceByOwner[0]!.some((id) => evidenceByOwner[1]!.includes(id)),
    ).toBe(false);
  }, 30000);

  it("keeps dated goal activity within the selected owner's current Graph paths", async () => {
    fixtureWrites = true;
    try {
      for (const fixture of fixtures) {
        const task = await fixture.client
          .from("tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("user_id", fixture.owner)
          .eq("id", fixture.task);
        expect(task.error).toBeNull();
        await insert(fixture.client, "atlas_relationships", {
          user_id: fixture.owner,
          source_type: "transaction",
          source_id: fixture.transaction,
          target_type: "goal",
          target_id: fixture.goal,
          relationship_type: "financially_related",
        });
      }
    } finally {
      fixtureWrites = false;
    }
    for (const fixture of fixtures) {
      active = fixture;
      const result = await invokeAnalystTool("getGoalLinkedActivity", {
        goalId: fixture.goal,
        from: month,
        through: today,
      });
      expect(result.status, sourceErrors.join("; ")).toBe("ready");
      expect(
        result.evidence.some((item) => item.value === fixture.amount),
      ).toBe(true);
      expect(JSON.stringify(result.evidence)).toContain(fixture.task);
      const other = fixtures.find((item) => item.owner !== fixture.owner)!;
      expect(JSON.stringify(result.evidence)).not.toContain(other.task);
      expect(JSON.stringify(result.evidence)).not.toContain(other.transaction);
      const denied = await invokeAnalystTool("getGoalLinkedActivity", {
        goalId: other.goal,
        from: month,
        through: today,
      });
      expect(denied.error?.code).toBe("unavailable_source");
      expect(denied.evidence).toEqual([]);
    }
  }, 30000);
});
