import { createHash } from "node:crypto";
import {
  FIXTURE_DATASETS,
  OWNER_A,
  OWNER_B,
  type FixtureDataset,
  type FixtureOwner,
  type FixtureVariant,
} from "./fixtures";
import { RUNWAY_SUPPLEMENTS, runwayBudgetItems } from "./runway-fixtures";

/**
 * A small in-memory PostgREST used by tests to run the real Analyst tools and
 * the real bounded transport against the synthetic fixtures. It filters the
 * way the tools ask it to (eq, in, ilike, or, gt, is) and computes the
 * `runway_monthly_totals` aggregate for the signed-in owner only, like the
 * security-invoker function it stands in for. It is test support, not a
 * database: row-level security is modelled only by that aggregate and by the
 * transport's required owner filter.
 */

/** Fixture IDs are readable names; tools require UUIDs. */
export function fixtureUuid(id: string) {
  if (/^[0-9a-f-]{36}$/.test(id)) return id;
  const hex = createHash("sha256").update(id).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

const at = (day: string | null) => (day ? `${day}T04:00:00.000Z` : null);

function rowsFor(data: FixtureDataset, owner: FixtureOwner): Tables {
  const u = fixtureUuid;
  const user_id = owner;
  return {
    goals: data.goals.map((g) => ({
      id: u(g.id),
      user_id,
      title: g.title,
      status: g.status,
      progress_percent: g.progressPercent,
      target_date: g.targetDate,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
      area: "career",
      description: null,
    })),
    tasks: data.tasks.map((t) => ({
      id: u(t.id),
      user_id,
      title: t.title,
      status: t.completedOn ? "completed" : "todo",
      priority: t.priority,
      due_at: at(t.dueOn),
      completed_at: at(t.completedOn),
      related_goal_id: t.goalId ? u(t.goalId) : null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    })),
    goal_milestones: data.milestones.map((m, index) => ({
      id: u(m.id),
      user_id,
      goal_id: u(m.goalId),
      title: m.title,
      completed_at: at(m.completedOn),
      target_date: null,
      sort_order: index,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: at(m.completedOn) ?? "2026-07-01T00:00:00Z",
    })),
    transaction_categories: data.categories.map((c) => ({
      id: u(c.id),
      user_id,
      name: c.name,
      category_type: c.kind,
    })),
    transactions: data.transactions.map((t) => ({
      id: u(t.id),
      user_id,
      category_id: t.categoryId ? u(t.categoryId) : null,
      transaction_type: t.kind,
      amount_centavos: t.amountCentavos,
      transaction_date: t.date,
      merchant_or_source: t.merchant,
      description: null,
    })),
    debts: data.debts.map((d) => ({
      id: u(d.id),
      user_id,
      creditor_name: d.name,
      status: d.status,
      current_balance_centavos: d.balanceCentavos,
      // NOT NULL in the schema; the signals engine reads them.
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    })),
    job_applications: data.applications.map((a) => ({
      id: u(a.id),
      user_id,
      company_name: a.company,
      role_title: a.role,
      stage: a.stage,
      applied_at: null,
      next_action_at: at(a.followUpOn),
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    })),
    job_application_events: [],
    knowledge_concepts: data.concepts.map((k) => ({
      id: u(k.id),
      user_id,
      title: k.title,
      review_count: k.reviewDates.length,
      last_reviewed_at: at(k.reviewDates.at(-1) ?? null),
    })),
    weekly_reviews: data.reviews.map((r) => ({
      id: u(r.id),
      user_id,
      week_start: r.weekStart,
      overall_score: r.overallScore,
      energy_score: null,
      stress_score: null,
      completed_at: at(r.weekStart),
      wins: r.reflection,
      challenges: null,
      lessons: null,
      time_wasters: null,
      next_week_focus: null,
      money_reflection: null,
      career_reflection: null,
    })),
    decisions: data.decisions.map((d) => ({
      id: u(d.id),
      user_id,
      title: d.title,
      decision_on: d.decidedOn,
      review_on: d.reviewOn,
      intent: d.revisions.at(-1)?.plan ?? d.originalPlan,
      expected_outcome: "Synthetic expected outcome",
      assumptions: null,
      goal_id: d.goalId ? u(d.goalId) : null,
      action_task_id: d.id === "decision-a-study" ? u("task-a-site") : null,
      metric_key: null,
    })),
    decision_revisions: data.decisions.flatMap((d) =>
      d.revisions.map((r, index) => ({
        id: u(`${d.id}-rev-${index}`),
        user_id,
        decision_id: u(d.id),
        previous_intent:
          index === 0 ? d.originalPlan : d.revisions[index - 1]!.plan,
        previous_expected_outcome: "Synthetic expected outcome",
        previous_assumptions: null,
        changed_at: at(r.revisedOn),
      })),
    ),
    decision_observations: data.observations.map((o) => {
      const source = o.sourceId ?? "";
      const task = source.startsWith("task-");
      return {
        id: u(o.id),
        user_id,
        decision_id: u(o.decisionId),
        observed_on: o.observedOn,
        note: o.note,
        source_task_id: task && source ? u(source) : null,
        // A deleted source is modelled as a reference that no longer resolves.
        source_transaction_id: !task && source ? u(source) : null,
        source_application_id: null,
      };
    }),
    atlas_relationships: data.edges
      .filter(
        (e) =>
          e.kind === "related_knowledge" && e.source.startsWith("concept-"),
      )
      .map((e) => ({
        id: u(`${e.source}-${e.target}`),
        user_id,
        source_type: "knowledge_concept",
        source_id: u(e.source),
        target_type: "goal",
        target_id: u(e.target),
        relationship_type: "supports_goal",
        created_at: "2026-09-01T00:00:00Z",
      })),
  };
}

/**
 * Adds the versioned runway supplement (`runway-fixtures.ts`) for the rich
 * dataset: account balances, essential flags, debt terms, profile income,
 * the runway target and the budget. Other rows get the schema's defaults.
 */
function withRunway(
  tables: Tables,
  owner: FixtureOwner,
  variant: FixtureVariant,
): Tables {
  const supplement = variant === "rich" ? RUNWAY_SUPPLEMENTS[owner] : undefined;
  const u = fixtureUuid;
  const essential = new Set(
    (supplement?.essentialCategoryIds ?? []).map((id) => u(id)),
  );
  const terms = Object.fromEntries(
    Object.entries(supplement?.debtTerms ?? {}).map(([id, value]) => [
      u(id),
      value,
    ]),
  );
  return {
    ...tables,
    transaction_categories: (tables.transaction_categories ?? []).map(
      (row) => ({
        ...row,
        is_essential: essential.has(String(row.id)),
        is_system: false,
      }),
    ),
    debts: (tables.debts ?? []).map((row) => ({
      ...row,
      interest_rate_percent: terms[String(row.id)]?.interestRatePercent ?? 0,
      minimum_payment_centavos:
        terms[String(row.id)]?.minimumPaymentCentavos ?? 0,
    })),
    financial_account_balances: (supplement?.accounts ?? []).map((item) => ({
      id: u(item.id),
      user_id: owner,
      name: item.name,
      account_type: item.accountType,
      current_balance_centavos: item.balanceCentavos,
      include_in_runway: item.includeInRunway,
      is_archived: false,
    })),
    profiles: supplement
      ? [
          {
            id: owner,
            monthly_net_income_centavos: supplement.monthlyNetIncomeCentavos,
          },
        ]
      : [],
    user_preferences: supplement
      ? [{ user_id: owner, runway_target_months: supplement.targetMonths }]
      : [],
    monthly_budgets: supplement
      ? [
          {
            id: u(supplement.budget.id),
            user_id: owner,
            month_start: supplement.budget.monthStart,
            expected_income_centavos: supplement.budget.expectedIncomeCentavos,
          },
        ]
      : [],
    budget_items: supplement
      ? runwayBudgetItems(owner).map((item) => ({
          id: u(`${supplement.budget.id}:${item.categoryId}`),
          user_id: owner,
          monthly_budget_id: u(supplement.budget.id),
          category_id: u(item.categoryId),
          planned_centavos: item.plannedCentavos,
        }))
      : [],
  };
}

export function fixtureTables(variant: FixtureVariant = "rich"): Tables {
  const a = withRunway(
    rowsFor(FIXTURE_DATASETS[variant][OWNER_A], OWNER_A),
    OWNER_A,
    variant,
  );
  const b = withRunway(
    rowsFor(FIXTURE_DATASETS[variant][OWNER_B], OWNER_B),
    OWNER_B,
    variant,
  );
  return Object.fromEntries(
    Object.keys(a).map((table) => [table, [...a[table]!, ...(b[table] ?? [])]]),
  );
}

/** Splits on top-level commas, keeping nested parentheses together. */
function split(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function test(row: Row, column: string, expression: string): boolean {
  const value = row[column];
  const text = value === null || value === undefined ? null : String(value);
  const [op, ...rest] = expression.split(".");
  const operand = rest.join(".");
  switch (op) {
    case "eq":
      return text === operand;
    case "neq":
      return text !== operand;
    case "gt":
      return text !== null && text > operand;
    case "gte":
      return text !== null && text >= operand;
    case "lt":
      return text !== null && text < operand;
    case "lte":
      return text !== null && text <= operand;
    case "in":
      return operand
        .slice(1, -1)
        .split(",")
        .includes(text ?? "");
    case "is":
      return operand === "null" ? text === null : false;
    case "not":
      return !test(row, column, operand);
    case "ilike": {
      const needle = operand.replace(/[%*]/g, "").toLowerCase();
      return text !== null && text.toLowerCase().includes(needle);
    }
    default:
      throw new Error(`Unsupported filter ${expression}`);
  }
}

function orMatches(row: Row, clause: string): boolean {
  return split(clause.slice(1, -1)).some((part) => {
    if (part.startsWith("and("))
      return split(part.slice(4, -1)).every((item) => condition(row, item));
    return condition(row, part);
  });
}

function condition(row: Row, item: string) {
  const [column, ...rest] = item.split(".");
  return test(row, column!, rest.join("."));
}

const reserved = new Set(["select", "order", "limit", "offset", "or"]);

export type Emulator = {
  owner: FixtureOwner;
  tables: Tables;
  requests: URL[];
  /** Forces the aggregate to exceed its bound. */
  oversizedAggregate: boolean;
  fetch: typeof globalThis.fetch;
};

export function createEmulator(
  tables: Tables,
  owner: FixtureOwner = OWNER_A,
): Emulator {
  const emulator: Emulator = {
    owner,
    tables,
    requests: [],
    oversizedAggregate: false,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/auth/v1/user"))
        return Response.json({ id: emulator.owner, aud: "authenticated" });
      emulator.requests.push(url);
      const rpc = url.pathname.match(/\/rpc\/([a-z_]+)$/)?.[1];
      if (rpc === "runway_monthly_totals") {
        const body = (await request.json()) as {
          p_start_date: string;
          p_end_date: string;
        };
        const groups = new Map<string, Row>();
        for (const row of emulator.tables.transactions ?? []) {
          if (row.user_id !== emulator.owner) continue;
          const date = String(row.transaction_date);
          if (date < body.p_start_date || date >= body.p_end_date) continue;
          const key = `${date.slice(0, 7)}|${row.category_id}|${row.transaction_type}`;
          const group = groups.get(key) ?? {
            month_start: `${date.slice(0, 7)}-01`,
            category_id: row.category_id,
            transaction_type: row.transaction_type,
            amount_centavos: 0,
          };
          group.amount_centavos =
            Number(group.amount_centavos) + Number(row.amount_centavos);
          groups.set(key, group);
        }
        let data = [...groups.values()];
        if (emulator.oversizedAggregate)
          data = Array.from({ length: 600 }, (_, index) => ({
            month_start: "2026-09-01",
            category_id: fixtureUuid(`overflow-${index}`),
            transaction_type: "expense",
            amount_centavos: 100,
          }));
        const limit = Number(url.searchParams.get("limit") ?? data.length);
        const page = data.slice(0, limit);
        return Response.json(page, {
          headers: {
            "content-range": `0-${Math.max(0, page.length - 1)}/${data.length}`,
          },
        });
      }
      if (rpc)
        return Response.json(
          { code: "PGRST202", message: "missing" },
          { status: 404 },
        );
      const table = url.pathname.split("/").at(-1)!;
      let rows = (emulator.tables[table] ?? []).filter((row) =>
        [...url.searchParams].every(([key, value]) =>
          key === "or"
            ? orMatches(row, value)
            : reserved.has(key)
              ? true
              : test(row, key, value),
        ),
      );
      const order = url.searchParams.get("order");
      if (order) {
        const [column, direction] = order.split(",")[0]!.split(".");
        rows = [...rows].sort((a, b) => {
          const x = String(a[column!] ?? "");
          const y = String(b[column!] ?? "");
          return direction === "desc" ? y.localeCompare(x) : x.localeCompare(y);
        });
      }
      const total = rows.length;
      const limit = Number(url.searchParams.get("limit") ?? rows.length);
      const selected = url.searchParams.get("select")?.split(",");
      const page = rows
        .slice(0, limit)
        .map((row) =>
          selected && selected[0] !== "*"
            ? Object.fromEntries(selected.map((key) => [key, row[key] ?? null]))
            : row,
        );
      return Response.json(page, {
        headers: {
          "content-range": `0-${Math.max(0, page.length - 1)}/${total}`,
        },
      });
    },
  };
  return emulator;
}

export { OWNER_A, OWNER_B };
