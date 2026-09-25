import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  manilaToday,
  type Evidence,
  type QuestionType,
} from "@/lib/analyst/evidence";
import { retrieveEvidence } from "@/lib/analyst/server";
import { getRelatedEntities } from "@/lib/graph/server";
import { calculateScenario } from "@/lib/runway/engine";
import {
  formatCentavos,
  pesoInputToCentavos,
  signedPesoInputToCentavos,
} from "@/lib/money/money";
import { loadRunwayWorkspace } from "@/lib/runway/server";
import { loadTimelinePage } from "@/lib/timeline/server";
import {
  metricDefinitions,
  parseHistoricalMetrics,
} from "@/lib/history/metrics";
import {
  ASSOCIATION_TESTS,
  associationWindow,
  discoverAssociation,
} from "@/lib/history/associations";
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

export async function historicalSeries(
  input: ToolInput<"getHistoricalMetricSeries">,
  { client, now }: Context,
): Promise<ToolPayload> {
  const today = manilaToday(now);
  const earliest = new Date(Date.parse(today) - 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (input.through > today || input.from < earliest)
    throw new ToolFailure("invalid_input");
  const { data, error } = await client.rpc("atlas_historical_metrics", {
    p_from: input.from,
    p_through: input.through,
    p_grain: input.grain,
  });
  if (error) throw new ToolFailure("unavailable_source");
  let rows;
  try {
    rows = parseHistoricalMetrics(data, input).filter(
      (row) => row.metric === input.metric,
    );
  } catch {
    throw new ToolFailure("invalid_output");
  }
  if (rows.length === 0) throw new ToolFailure("invalid_output");
  if (rows.length > 12) throw new ToolFailure("budget_exceeded");
  const definition = metricDefinitions[input.metric];
  const available = rows.filter((row) => row.coverage !== "insufficient");
  return {
    status:
      available.length === 0
        ? "insufficient"
        : available.length < rows.length
          ? "partial"
          : "ready",
    limitations: [
      definition.source,
      "Request-time aggregation uses surviving owner records. Deleted, unrecorded and pre-first-record activity cannot be reconstructed. A zero means zero recorded events in a covered period, not proof of no real activity.",
      ...(available.length < rows.length
        ? ["One or more periods have insufficient history and were omitted."]
        : []),
    ],
    evidence: available.map((row) => {
      const countedFrom = [row.period.from, input.from, row.firstRecordedOn!]
        .sort()
        .at(-1)!;
      const countedThrough =
        row.period.through < input.through ? row.period.through : input.through;
      return makeFact("getHistoricalMetricSeries", now, {
        id: `${input.metric}.${row.period.from}`,
        metric: definition.label,
        value: row.value!,
        unit: definition.unit,
        period: { from: countedFrom, through: countedThrough },
        comparisonBasis: `Calendar bucket ${row.period.from} through ${row.period.through}; version 1 ${input.grain} aggregation; ${row.sourceCount} contributing surviving records; first recorded ${row.firstRecordedOn}; coverage ${row.coverage}.`,
        source: {
          description: definition.source,
          recordIds: [],
          href: definition.href,
        },
        completeness: row.coverage === "recorded" ? "complete" : "partial",
      });
    }),
  };
}

/** Compare only like-for-like, fully recorded calendar months. */
export async function crossDomainHistory(
  input: ToolInput<"getCrossDomainHistory">,
  { client, now }: Context,
): Promise<ToolPayload> {
  const today = manilaToday(now);
  const earliest = new Date(Date.parse(today) - 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (input.through > today || input.from < earliest)
    throw new ToolFailure("invalid_input");
  const { data, error } = await client.rpc("atlas_historical_metrics", {
    p_from: input.from,
    p_through: input.through,
    p_grain: "month",
  });
  if (error) throw new ToolFailure("unavailable_source");
  let rows;
  try {
    rows = parseHistoricalMetrics(data, {
      from: input.from,
      through: input.through,
      grain: "month",
    }).filter((row) => input.metrics.includes(row.metric));
  } catch {
    throw new ToolFailure("invalid_output");
  }
  const months = [...new Set(rows.map((row) => row.period.from))].sort();
  if (months.length < 2 || rows.length !== months.length * 2)
    throw new ToolFailure("invalid_output");
  const evidence: ToolEvidence[] = [];
  let comparable = true;
  for (const row of rows) {
    const definition = metricDefinitions[row.metric];
    const from = [
      row.period.from,
      input.from,
      row.firstRecordedOn ?? input.from,
    ]
      .sort()
      .at(-1)!;
    const through =
      row.period.through < input.through ? row.period.through : input.through;
    const complete =
      row.coverage === "recorded" &&
      from === row.period.from &&
      through === row.period.through;
    if (!complete) comparable = false;
    if (row.value === null) continue;
    evidence.push(
      makeFact("getCrossDomainHistory", now, {
        id: `${row.metric}.${row.period.from}`,
        metric: definition.label,
        value: row.value,
        unit: definition.unit,
        period: { from, through },
        comparisonBasis: `Calendar month ${row.period.from} through ${row.period.through}; version 1; ${row.sourceCount} contributing surviving records; coverage ${row.coverage}.`,
        source: {
          description: definition.source,
          recordIds: [],
          href: definition.href,
        },
        completeness: complete ? "complete" : "partial",
      }),
    );
  }
  const first = months[0]!;
  const last = months.at(-1)!;
  for (const metric of input.metrics) {
    const before = rows.find(
      (row) => row.metric === metric && row.period.from === first,
    )!;
    const after = rows.find(
      (row) => row.metric === metric && row.period.from === last,
    )!;
    if (before.sourceCount < 2 || after.sourceCount < 2) comparable = false;
  }
  if (comparable) {
    for (const metric of input.metrics) {
      const before = rows.find(
        (row) => row.metric === metric && row.period.from === first,
      )!;
      const after = rows.find(
        (row) => row.metric === metric && row.period.from === last,
      )!;
      const definition = metricDefinitions[metric];
      const difference =
        definition.unit === "score"
          ? (Math.round(after.value! * 100) - Math.round(before.value! * 100)) /
            100
          : after.value! - before.value!;
      if (
        !Number.isFinite(difference) ||
        (definition.unit !== "score" && !Number.isSafeInteger(difference))
      )
        throw new ToolFailure("invalid_output");
      evidence.push(
        makeFact("getCrossDomainHistory", now, {
          id: `${metric}.change.${first}.${last}`,
          metric: `${definition.label} change: first to last month`,
          value: difference,
          unit: definition.unit,
          period: { from: before.period.from, through: after.period.through },
          comparisonBasis: `Difference between complete calendar months ${first} and ${last}; version 1; ${before.sourceCount} and ${after.sourceCount} contributing surviving records. This is an observation, not an association or cause.`,
          source: {
            description: definition.source,
            recordIds: [],
            href: definition.href,
          },
          completeness: "complete",
          claimType: "TREND",
        }),
      );
    }
  }
  return {
    status: comparable ? "ready" : "partial",
    evidence,
    limitations: [
      "Whole-domain records are not attributed to a goal. These parallel observations do not establish association or causation.",
      "Only surviving recorded sources are counted; absent or deleted history is not zero-filled.",
      ...(!comparable
        ? [
            "A change claim needs complete first and last calendar months with at least two contributing records for each metric in each endpoint month.",
          ]
        : []),
    ],
  };
}

export async function patternAssociation(
  input: ToolInput<"getPatternAssociation">,
  { client, now }: Context,
): Promise<ToolPayload> {
  const window = associationWindow(manilaToday(now));
  const { data, error } = await client.rpc("atlas_historical_metrics", {
    p_from: window.from,
    p_through: window.through,
    p_grain: "month",
  });
  if (error) throw new ToolFailure("unavailable_source");
  let result;
  try {
    const rows = parseHistoricalMetrics(data, { ...window, grain: "month" });
    result = discoverAssociation(rows, input.metrics);
  } catch {
    throw new ToolFailure("invalid_output");
  }
  const limitations = [
    "Association is not causation. Shared trends, seasonality and unmeasured factors can explain a finding.",
    "Only surviving records are measured; edits, deletions, unrecorded activity and future months can change the result.",
    `Method version 1 uses eleven complete months, ten monthly changes, a leave-one-month-out stability check, and a permutation test adjusted for all ${ASSOCIATION_TESTS} supported metric pairs.`,
  ];
  if (result.status === "withheld")
    return {
      status: "insufficient",
      evidence: [],
      limitations: [
        ...limitations,
        `No reliable association finding: ${result.reason.replaceAll("_", " ")}. Weak or incomplete observations are withheld.`,
      ],
    };
  const [first, second] = input.metrics;
  return {
    status: "ready",
    limitations,
    evidence: [
      makeFact("getPatternAssociation", now, {
        id: `${first}.${second}.${result.from}`,
        metric: `${metricDefinitions[first].label} and ${metricDefinitions[second].label}: association of monthly changes`,
        value: result.correlation,
        unit: "correlation",
        period: { from: result.from, through: result.through },
        comparisonBasis: `Pearson correlation of ${result.changes} aligned month-to-month changes across ${result.months} fully recorded months; ${ASSOCIATION_TESTS} pair Bonferroni-adjusted permutation p=${result.adjustedP.toFixed(4)}; leave-one-month-out stability passed. ${result.direction === "together" ? "Same" : "Opposite"} direction.`,
        source: {
          description:
            "Version 1 historical metrics; both source series and monthly values are shown on the Patterns page",
          recordIds: [],
          href: "/history/patterns",
        },
        completeness: "complete",
        claimType: "TREND",
        note: "An association does not establish cause.",
      }),
    ],
  };
}

const linkedTask = z.object({
  id: z.uuid(),
  status: z.string(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
});
const linkedMilestone = z.object({
  id: z.uuid(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
});
const linkedTransaction = z.object({
  id: z.uuid(),
  transaction_type: z.enum(["income", "expense", "transfer"]),
  transaction_date: z.iso.date(),
  amount_centavos: z
    .union([z.number(), z.string().regex(/^\d+$/)])
    .transform(Number)
    .pipe(z.number().int().nonnegative().safe()),
});

/** Dated activity of today's one-hop goal links; never historical goal progress. */
export async function goalLinkedActivity(
  input: ToolInput<"getGoalLinkedActivity">,
  { client, now, owner }: Context,
): Promise<ToolPayload> {
  const today = manilaToday(now);
  const earliest = new Date(Date.parse(today) - 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (input.through > today || input.from < earliest)
    throw new ToolFailure("invalid_input");
  const graph = await getRelatedEntities(
    { entityType: "goal", entityId: input.goalId, limit: 12 },
    client,
  );
  const taskIds = graph.items
    .filter((item) => item.related.type === "task")
    .map((item) => item.related.id);
  const milestoneIds = graph.items
    .filter((item) => item.related.type === "goal_milestone")
    .map((item) => item.related.id);
  const transactionIds = graph.items
    .filter((item) => item.related.type === "transaction")
    .map((item) => item.related.id);
  const [taskResult, milestoneResult, transactionResult] = await Promise.all([
    taskIds.length
      ? client
          .from("tasks")
          .select("id,status,completed_at")
          .eq("user_id", owner)
          .in("id", taskIds)
          .limit(taskIds.length)
      : Promise.resolve({ data: [], error: null }),
    milestoneIds.length
      ? client
          .from("goal_milestones")
          .select("id,completed_at")
          .eq("user_id", owner)
          .in("id", milestoneIds)
          .limit(milestoneIds.length)
      : Promise.resolve({ data: [], error: null }),
    transactionIds.length
      ? client
          .from("transactions")
          .select("id,transaction_type,transaction_date,amount_centavos")
          .eq("user_id", owner)
          .in("id", transactionIds)
          .limit(transactionIds.length)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (taskResult.error || milestoneResult.error || transactionResult.error)
    throw new ToolFailure("unavailable_source");
  const tasks = z.array(linkedTask).safeParse(taskResult.data);
  const milestones = z.array(linkedMilestone).safeParse(milestoneResult.data);
  const transactions = z
    .array(linkedTransaction)
    .safeParse(transactionResult.data);
  if (!tasks.success || !milestones.success || !transactions.success)
    throw new ToolFailure("invalid_output");
  const byTask = new Map(tasks.data.map((task) => [task.id, task]));
  const byMilestone = new Map(
    milestones.data.map((milestone) => [milestone.id, milestone]),
  );
  const byTransaction = new Map(
    transactions.data.map((transaction) => [transaction.id, transaction]),
  );
  const evidence = graph.items.flatMap((item): ToolEvidence[] => {
    const relationship = {
      source: { type: item.source.type, id: item.source.id },
      target: { type: item.target.type, id: item.target.id },
      origin: item.origin,
    } as const;
    const base = {
      source: {
        description: "Current Graph path to a surviving linked source",
        recordIds: [item.source.id, item.target.id],
        href: item.related.href,
      },
      relationship,
    };
    const task = byTask.get(item.related.id);
    const completedOn =
      task?.status === "completed" && task.completed_at
        ? manilaToday(new Date(task.completed_at))
        : null;
    if (
      item.related.type === "task" &&
      completedOn &&
      completedOn >= input.from &&
      completedOn <= input.through
    )
      return [
        makeFact("getGoalLinkedActivity", now, {
          ...base,
          id: `task.${task!.id}`,
          metric: "Currently linked task completed",
          value: 1,
          unit: "count",
          period: { from: completedOn, through: completedOn },
          comparisonBasis: `Task completion timestamp in Asia/Manila; ${item.origin} Graph path currently exists. Link existence during this period is unknown.`,
          completeness: "complete",
        }),
      ];
    const milestone = byMilestone.get(item.related.id);
    const milestoneCompletedOn = milestone?.completed_at
      ? manilaToday(new Date(milestone.completed_at))
      : null;
    if (
      item.related.type === "goal_milestone" &&
      milestoneCompletedOn &&
      milestoneCompletedOn >= input.from &&
      milestoneCompletedOn <= input.through
    )
      return [
        makeFact("getGoalLinkedActivity", now, {
          ...base,
          id: `milestone.${milestone!.id}`,
          metric: "Currently linked milestone completed",
          value: 1,
          unit: "count",
          period: {
            from: milestoneCompletedOn,
            through: milestoneCompletedOn,
          },
          comparisonBasis: `Milestone completion timestamp in Asia/Manila; ${item.origin} Graph path currently exists. This is a dated event, not reconstructed past goal progress.`,
          completeness: "complete",
        }),
      ];
    const transaction = byTransaction.get(item.related.id);
    if (
      item.related.type === "transaction" &&
      transaction &&
      transaction.transaction_date >= input.from &&
      transaction.transaction_date <= input.through &&
      transaction.transaction_type !== "transfer"
    )
      return [
        makeFact("getGoalLinkedActivity", now, {
          ...base,
          id: `transaction.${transaction.id}`,
          metric: `Currently linked recorded ${transaction.transaction_type}`,
          value: transaction.amount_centavos,
          unit: "centavos",
          period: {
            from: transaction.transaction_date,
            through: transaction.transaction_date,
          },
          comparisonBasis: `Transaction date; ${item.origin} Graph path currently exists. Link existence during this period is unknown.`,
          completeness: "complete",
        }),
      ];
    const sourceDisappeared =
      (item.related.type === "task" && !task) ||
      (item.related.type === "goal_milestone" && !milestone) ||
      (item.related.type === "transaction" && !transaction);
    return [
      makeFact("getGoalLinkedActivity", now, {
        ...base,
        id: `link.${item.id}`,
        metric: "Current goal relationship",
        value: item.kind,
        unit: "relationship",
        period: { from: today, through: today },
        comparisonBasis: sourceDisappeared
          ? "A current Graph path was observed, but its source could not be reloaded. The source may have changed or been deleted."
          : "Current Graph path only; this tool returned no supported dated activity for this link in the requested period.",
        completeness: sourceDisappeared ? "partial" : "complete",
      }),
    ];
  });
  const dated = evidence.some((item) => item.unit !== "relationship");
  const incomplete = evidence.some((item) => item.completeness !== "complete");
  return {
    status:
      graph.items.length === 0
        ? "insufficient"
        : graph.hasMore || !dated || incomplete
          ? "partial"
          : "ready",
    evidence,
    limitations: [
      "Graph paths are current. They do not prove when a link was created or that it existed during an activity.",
      "Only surviving linked task and milestone completions and income/expense transactions in the requested period are shown. No historical goal progress or stall is inferred.",
      "Missing links and unrecorded or deleted activity do not prove inactivity.",
      ...(graph.hasMore
        ? ["More links exist than the bounded result shows."]
        : []),
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

/** One source snapshot for the baseline and every alternative. No writes. */
export async function compareFinancialScenarios(
  input: ToolInput<"compareFinancialScenarios">,
  { client, now }: Context,
): Promise<ToolPayload> {
  const workspace = await loadRunwayWorkspace(now, client);
  if (!workspace) throw new ToolFailure("unavailable_source");
  const baseline = workspace.analysis;
  if (baseline.status !== "ready")
    throw new ToolFailure("insufficient_history");
  if (
    baseline.baselineSource === "budget" &&
    workspace.source.budget &&
    workspace.source.budget.monthStart < workspace.monthStart
  )
    throw new ToolFailure("stale_data");

  const alternatives = input.alternatives.map((option) => {
    if (
      option.extraDebtPayment &&
      !baseline.debts.some(
        (debt) => debt.id === option.extraDebtPayment?.debtId,
      )
    )
      throw new ToolFailure("unavailable_source");
    const monthlyExpenseChangeCentavos = signedPesoInputToCentavos(
      option.monthlyExpenseChangePesos ?? "0",
    );
    const oneTimePurchaseCentavos = pesoInputToCentavos(
      option.oneTimePurchasePesos ?? "0",
    );
    const extraDebtPayment = option.extraDebtPayment
      ? {
          debtId: option.extraDebtPayment.debtId,
          amountCentavos: pesoInputToCentavos(
            option.extraDebtPayment.amountPesos,
          ),
        }
      : null;
    if (baseline.monthlyEssentialCentavos + monthlyExpenseChangeCentavos < 0)
      throw new ToolFailure("invalid_input");
    const monthlyIncomeCentavos =
      option.monthlyIncomeChangePercent === undefined
        ? option.monthlyIncomePesos === null
          ? null
          : pesoInputToCentavos(option.monthlyIncomePesos)
        : Math.round(
            baseline.monthlyIncomeCentavos *
              (1 + option.monthlyIncomeChangePercent / 100),
          );
    if (
      monthlyIncomeCentavos !== null &&
      (!Number.isSafeInteger(monthlyIncomeCentavos) ||
        monthlyIncomeCentavos > 1_000_000_000_000)
    )
      throw new ToolFailure("invalid_input");
    const resolved = {
      monthlyIncomeCentavos,
      monthlyExpenseChangeCentavos,
      oneTimePurchaseCentavos,
      extraDebtPayment,
      targetMonths: option.targetMonths ?? baseline.targetMonths,
    };
    if (
      resolved.monthlyIncomeCentavos === null &&
      resolved.monthlyExpenseChangeCentavos === 0 &&
      resolved.oneTimePurchaseCentavos === 0 &&
      resolved.extraDebtPayment === null &&
      resolved.targetMonths === baseline.targetMonths
    )
      throw new ToolFailure("invalid_input");
    return { option, resolved, result: calculateScenario(baseline, resolved) };
  });
  const months = [...baseline.includedMonths].sort();
  const period = {
    from: months[0] ?? workspace.source.budget?.monthStart ?? manilaToday(now),
    through: manilaToday(now),
  };
  const recordIds = [
    ...baseline.selectedAccounts.map((item) => item.id),
    ...baseline.selectedCategories.map((item) => item.id),
    ...baseline.debts.map((item) => item.id),
  ].slice(0, 20);
  const source = {
    description: "Current runway accounts, categories, debts and baseline",
    recordIds,
    href: "/money/runway",
  };
  const metrics = [
    ["availableLiquidCentavos", "Available liquid balance", "centavos"],
    ["monthlyNeedCentavos", "Monthly financial need", "centavos"],
    ["monthlyIncomeCentavos", "Monthly income", "centavos"],
    ["monthlyFreeCashFlowCentavos", "Monthly free cash flow", "centavos"],
    ["runwayMonths", "Runway estimate", "months"],
  ] as const;
  const commonBasis = `Runway engine version 1. Current accounts and active debts; essential baseline: ${baseline.baselineSource}; income source: ${baseline.incomeSource}; included months: ${months.join(", ") || "none"}; target: ${baseline.targetMonths} months.`;
  const rows = [
    { label: "Current", result: baseline, assumptions: "No changes" },
    ...alternatives.map(({ option, resolved, result }, index) => ({
      label: `Option ${index + 1}`,
      result,
      assumptions: `Monthly income ${option.monthlyIncomeChangePercent === undefined ? (resolved.monthlyIncomeCentavos === null ? "unchanged" : `set to ${formatCentavos(resolved.monthlyIncomeCentavos)}`) : `${option.monthlyIncomeChangePercent}% change`}; monthly essential expense change ${formatCentavos(resolved.monthlyExpenseChangeCentavos)}; one-time purchase ${formatCentavos(resolved.oneTimePurchaseCentavos)}; extra monthly debt payment ${formatCentavos(resolved.extraDebtPayment?.amountCentavos ?? 0)}; target ${resolved.targetMonths} months.`,
    })),
  ];
  return {
    status: "ready",
    limitations: [
      "These are estimates under stated assumptions, not guaranteed outcomes or advice to move money. No records were changed.",
      "The same current owner-scoped baseline was used for every option. Recorded history, current budget or profile fallback may be incomplete; review the linked runway source before a financial decision.",
      "Extra debt payments mean an extra amount every month. One-time debt payoff and payoff dates are not modeled here.",
    ],
    evidence: rows.flatMap(({ label, result, assumptions }) =>
      metrics.flatMap(([key, metric, unit]) =>
        result[key] === null
          ? []
          : [
              makeFact("compareFinancialScenarios", now, {
                id: `${label}.${key}`,
                metric: `${label} · ${metric}`,
                value: result[key]!,
                unit,
                period,
                claimType: label === "Current" ? "FACT" : "SCENARIO",
                comparisonBasis: `${commonBasis} ${label}: ${assumptions}`,
                source,
                completeness: "complete",
              }),
            ],
      ),
    ),
  };
}
