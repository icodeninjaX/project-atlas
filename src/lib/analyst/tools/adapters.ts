import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  manilaToday,
  type Evidence,
  type QuestionType,
} from "@/lib/analyst/evidence";
import { retrieveEvidence } from "@/lib/analyst/server";
import { getRelatedEntities } from "@/lib/graph/server";
import { calculateScenario } from "@/lib/runway/engine";
import { loadRunwayWorkspace } from "@/lib/runway/server";
import { loadTimelinePage } from "@/lib/timeline/server";
import {
  ToolFailure,
  type ToolEvidence,
  type ToolInput,
  type ToolName,
  type ToolPayload,
} from "./contracts";

type Context = { client: SupabaseClient; owner: string; now: Date };
type FactInput = Omit<ToolEvidence, "id" | "provenance" | "claimType"> & {
  id: string;
  claimType?: ToolEvidence["claimType"];
};

export function makeFact(
  tool: ToolName,
  now: Date,
  input: FactInput,
): ToolEvidence {
  // Different dates, source sets, values and scenario assumptions cannot share a citation.
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
  return {
    ...input,
    id: `${tool}.${input.id}.${digest}`,
    claimType: input.claimType ?? "FACT",
    provenance: {
      tool,
      calculationVersion: "1",
      retrievedAt: now.toISOString(),
      textTrust: "untrusted_data",
    },
  };
}

const existingQuestions: Partial<Record<ToolName, QuestionType>> = {
  getSpendingChange: "spending_change",
  getDebtProgress: "debt_progress",
  getTaskFocus: "task_focus",
  getGoalProgress: "goal_progress",
  getCareerPipeline: "career_pipeline",
  getWeeklyReviewMetrics: "weekly_review_trends",
  getSignals: "signals_summary",
};

export async function existingEvidence(
  tool: ToolName,
  context: Context,
): Promise<ToolPayload> {
  const type = existingQuestions[tool];
  if (!type) throw new ToolFailure("invalid_input");
  const result = await retrieveEvidence(
    context.client,
    context.owner,
    type,
    context.now,
  );
  return {
    status: result.status,
    limitations: [
      result.note,
      "Current surviving records only; edits, deletion and missing entries limit historical claims. Source IDs are a bounded sample, not the complete contributing set.",
    ],
    evidence: result.evidence.map((item) => {
      // Category names are private untrusted prose. The category ID remains in the evidence key.
      const safeItem: Evidence = item.id.startsWith("spending.category.")
        ? { ...item, metric: "Recorded category spending change" }
        : item;
      return makeFact(tool, context.now, {
        ...safeItem,
        claimType: item.id.startsWith("tasks.focus.")
          ? "RECOMMENDATION"
          : item.id.includes("change")
            ? "TREND"
            : "FACT",
      });
    }),
  };
}

export async function paymentSummary(
  tool: "getMoneySummary" | "getDebtPayments",
  input: ToolInput<"getMoneySummary"> | ToolInput<"getDebtPayments">,
  { client, owner, now }: Context,
): Promise<ToolPayload> {
  const payments = tool === "getDebtPayments";
  const table = payments ? "debt_payments" : "transactions";
  const date = payments ? "payment_date" : "transaction_date";
  if (input.through > manilaToday(now)) throw new ToolFailure("invalid_input");
  if ("debtId" in input && input.debtId) {
    const target = await client
      .from("debts")
      .select("id")
      .eq("user_id", owner)
      .eq("id", input.debtId)
      .limit(1);
    if (target.error) throw new ToolFailure("unavailable_source");
    if (!target.data?.length) throw new ToolFailure("unavailable_source");
  }
  if ("categoryId" in input && input.categoryId) {
    const target = await client
      .from("transaction_categories")
      .select("id")
      .eq("user_id", owner)
      .eq("id", input.categoryId)
      .eq("category_type", input.kind)
      .limit(1);
    if (target.error || !target.data?.length)
      throw new ToolFailure("unavailable_source");
  }
  let query = client
    .from(table)
    .select(`id,amount_centavos,${date}`)
    .eq("user_id", owner)
    .gte(date, input.from)
    .lte(date, input.through)
    .order(date)
    .order("id");
  if ("kind" in input) query = query.eq("transaction_type", input.kind);
  if ("categoryId" in input && input.categoryId)
    query = query.eq("category_id", input.categoryId);
  if ("debtId" in input && input.debtId)
    query = query.eq("debt_id", input.debtId);
  const { data, error } = await query;
  if (error) throw new ToolFailure("unavailable_source");
  const rows = (data ?? []) as unknown as {
    id: string;
    amount_centavos: number | string;
  }[];
  let total = 0;
  for (const row of rows) {
    const value = Number(row.amount_centavos);
    total += value;
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      !Number.isSafeInteger(total)
    )
      throw new ToolFailure("invalid_output");
  }
  const period = { from: input.from, through: input.through };
  const metric = payments
    ? "Recorded debt payments"
    : `Recorded ${"kind" in input ? input.kind : ""}`;
  const source = {
    description: metric,
    href: payments ? "/debts" : "/money/transactions",
    recordIds: rows.slice(0, 20).map((row) => row.id),
  };
  const comparisonBasis = `Current surviving records; filters ${JSON.stringify(input)}`;
  return {
    status: "ready",
    limitations: [
      "No records means zero recorded activity, not proof of no real activity. Deleted or unrecorded entries are unavailable. Source IDs show at most 20 contributors.",
      ...(payments
        ? [
            "Payments are recorded amounts, not reconstructed historical debt balances.",
          ]
        : ["Transfers are excluded."]),
    ],
    evidence: [
      makeFact(tool, now, {
        id: "total",
        metric,
        value: total,
        unit: "centavos",
        period,
        source,
        comparisonBasis,
        completeness: "complete",
      }),
      makeFact(tool, now, {
        id: "count",
        metric: "Contributing records",
        value: rows.length,
        unit: "count",
        period,
        source,
        comparisonBasis,
        completeness: "complete",
      }),
    ],
  };
}

export async function related(
  input: ToolInput<"getRelatedEntities">,
  { client, now }: Context,
): Promise<ToolPayload> {
  const result = await getRelatedEntities(input, client);
  const today = manilaToday(now);
  return {
    status: result.hasMore ? "partial" : "ready",
    limitations: [
      "One hop only. Missing links do not prove that entities are unrelated.",
      ...(result.hasMore
        ? ["More relationships exist than this bounded result shows."]
        : []),
    ],
    evidence: result.items.map((item) =>
      makeFact("getRelatedEntities", now, {
        id: item.id,
        metric: "Recorded relationship",
        value: item.kind,
        unit: "relationship",
        period: { from: today, through: today },
        comparisonBasis: "Current native and user-controlled manual links",
        source: {
          description: "Graph relationship endpoints",
          recordIds: [item.source.id, item.target.id],
          href: item.related.href,
        },
        completeness: result.hasMore ? "partial" : "complete",
        relationship: {
          source: { type: item.source.type, id: item.source.id },
          target: { type: item.target.type, id: item.target.id },
          origin: item.origin,
        },
      }),
    ),
  };
}

export async function timeline(
  input: ToolInput<"getTimelineEvents">,
  { client, now }: Context,
): Promise<ToolPayload> {
  if (input.through > manilaToday(now)) throw new ToolFailure("invalid_input");
  const result = await loadTimelinePage(
    {
      query: "",
      module: input.module ?? null,
      from: input.from,
      to: input.through,
    },
    null,
    client,
  );
  if (!result) throw new ToolFailure("unavailable_source");
  return {
    status: result.nextCursor ? "partial" : "ready",
    limitations: [
      "One page of at most 30 recorded events; older deleted records may be absent. Events are not continuous historical measurements. Private titles, descriptions and metric text are excluded.",
      ...(result.nextCursor
        ? [
            "More events exist in this period; this is not a complete event count.",
          ]
        : []),
    ],
    evidence: result.events.map((event) =>
      makeFact("getTimelineEvents", now, {
        id: event.eventId,
        metric: `${event.module} event`,
        value: event.eventType,
        unit: "event",
        period: { from: event.occurredOn, through: event.occurredOn },
        comparisonBasis: `Recorded ${event.occurredPrecision}; ${event.occurredAt}`,
        source: {
          description: "Life Timeline event",
          recordIds: [event.eventId],
          href:
            event.sourceAvailable && event.sourceHref
              ? event.sourceHref
              : "/timeline",
        },
        completeness:
          result.nextCursor || !event.sourceAvailable ? "partial" : "complete",
        note: event.sourceAvailable
          ? "Source is available."
          : "Source record is no longer available.",
      }),
    ),
  };
}

export async function runway(
  tool: "getRunway" | "runFinancialScenario",
  input: ToolInput<"runFinancialScenario"> | null,
  { client, now }: Context,
): Promise<ToolPayload> {
  const workspace = await loadRunwayWorkspace(now, client);
  if (!workspace) throw new ToolFailure("unavailable_source");
  const analysis = workspace.analysis;
  if (analysis.status !== "ready")
    throw new ToolFailure("insufficient_history");
  // An old fallback budget is a stale assumption, not a current observation.
  if (
    analysis.baselineSource === "budget" &&
    workspace.source.budget &&
    workspace.source.budget.monthStart < workspace.monthStart
  )
    throw new ToolFailure("stale_data");
  if (
    input?.extraDebtPayment &&
    !analysis.debts.some((debt) => debt.id === input.extraDebtPayment!.debtId)
  )
    throw new ToolFailure("unavailable_source");
  const values = input ? calculateScenario(analysis, input) : analysis;
  const today = manilaToday(now);
  const months = [...analysis.includedMonths].sort();
  const period = {
    from: months[0] ?? workspace.source.budget?.monthStart ?? today,
    through: today,
  };
  const basis = `Current accounts and debts. Essential baseline: ${analysis.baselineSource}; income: ${analysis.incomeSource}; included months: ${months.join(", ") || "none"}.${input ? ` Scenario assumptions: ${JSON.stringify(input)}` : ""}`;
  const ids = [
    ...analysis.selectedAccounts.map((a) => a.id),
    ...analysis.selectedCategories.map((c) => c.id),
    ...analysis.debts.map((d) => d.id),
  ].slice(0, 20);
  const metrics = [
    ["availableLiquidCentavos", "Available liquid balance", "centavos"],
    ["monthlyEssentialCentavos", "Monthly essential expenses", "centavos"],
    ["monthlyNeedCentavos", "Monthly financial need", "centavos"],
    ["monthlyIncomeCentavos", "Monthly baseline income", "centavos"],
    ["monthlyFreeCashFlowCentavos", "Monthly free cash flow", "centavos"],
    ["runwayMonths", "Runway under recorded assumptions", "months"],
    ["targetMonths", "Target reserve months", "months"],
    ["targetReserveCentavos", "Target reserve", "centavos"],
    ["targetGapCentavos", "Gap to target reserve", "centavos"],
  ] as const;
  return {
    status: "ready",
    limitations: [
      "Uses the existing runway/scenario engine, not a forecast or historical account balance. Source IDs are a bounded sample. No records are changed.",
      "Monthly estimates depend on recorded category coverage and the disclosed historical, budget or profile fallback. Debt payoff projections are outside this initial tool's output.",
    ],
    evidence: metrics.flatMap(([key, metric, unit]) =>
      values[key] === null
        ? []
        : [
            makeFact(tool, now, {
              id: key,
              metric,
              value: values[key]!,
              unit,
              period,
              claimType: input ? "SCENARIO" : "FACT",
              comparisonBasis: basis,
              source: {
                description: "Runway accounts, categories, debts and baseline",
                recordIds: ids,
                href: "/money/runway",
              },
              completeness: "complete",
            }),
          ],
    ),
  };
}
