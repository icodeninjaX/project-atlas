import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  graphRegistry,
  type GraphEntitySummary,
  type GraphRecord,
} from "@/lib/graph/registry";
import type {
  Decision,
  DecisionObservation,
  DecisionRevision,
  ObservationSourceType,
} from "./decision";

const decisionsPageSize = 20;

export async function loadDecisionList(page = 1): Promise<{
  decisions: Decision[];
  hasMore: boolean;
}> {
  const db = await createClient();
  if (!db) return { decisions: [], hasMore: false };
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { decisions: [], hasMore: false };
  const from = (page - 1) * decisionsPageSize;
  const { data, error } = await db
    .from("decisions")
    .select(
      "id,title,decision_on,intent,expected_outcome,rationale,assumptions,review_on,goal_id,action_task_id,metric_key,created_at,updated_at",
    )
    .eq("user_id", auth.user.id)
    .order("decision_on", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + decisionsPageSize);
  if (error) throw new Error("Decisions could not be loaded.");
  const rows = (data ?? []) as Decision[];
  return {
    decisions: rows.slice(0, decisionsPageSize),
    hasMore: rows.length > decisionsPageSize,
  };
}

export async function loadDecision(id: string): Promise<{
  decision: Decision;
  observations: DecisionObservation[];
  revisions: DecisionRevision[];
  goal: { id: string; title: string } | null;
  relatedRecords: Record<string, GraphEntitySummary>;
} | null> {
  const db = await createClient();
  if (!db) return null;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: decision, error } = await db
    .from("decisions")
    .select(
      "id,title,decision_on,intent,expected_outcome,rationale,assumptions,review_on,goal_id,action_task_id,metric_key,created_at,updated_at",
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error("Decision could not be loaded.");
  if (!decision) return null;
  const [observationsResult, goalResult, revisionsResult] = await Promise.all([
    db
      .from("decision_observations")
      .select(
        "id,decision_id,observed_on,note,source_task_id,source_transaction_id,source_application_id,created_at",
      )
      .eq("user_id", auth.user.id)
      .eq("decision_id", id)
      .order("observed_on", { ascending: false })
      .limit(100),
    decision.goal_id
      ? db
          .from("goals")
          .select("id,title")
          .eq("id", decision.goal_id)
          .eq("user_id", auth.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("decision_revisions")
      .select(
        "id,previous_title,previous_decision_on,previous_intent,previous_expected_outcome,previous_rationale,previous_assumptions,previous_review_on,previous_goal_id,previous_action_task_id,previous_metric_key,changed_at",
      )
      .eq("user_id", auth.user.id)
      .eq("decision_id", id)
      .order("changed_at", { ascending: false })
      .limit(100),
  ]);
  if (observationsResult.error || goalResult.error || revisionsResult.error)
    throw new Error("Decision details could not be loaded.");
  const observations = (observationsResult.data ?? []) as DecisionObservation[];
  const references: Array<{ type: ObservationSourceType; id: string }> = [];
  if (decision.action_task_id)
    references.push({ type: "task", id: decision.action_task_id });
  for (const observation of observations) {
    if (observation.source_task_id)
      references.push({ type: "task", id: observation.source_task_id });
    if (observation.source_transaction_id)
      references.push({
        type: "transaction",
        id: observation.source_transaction_id,
      });
    if (observation.source_application_id)
      references.push({
        type: "job_application",
        id: observation.source_application_id,
      });
  }
  const groups = new Map<ObservationSourceType, Set<string>>();
  for (const reference of references) {
    const ids = groups.get(reference.type) ?? new Set<string>();
    ids.add(reference.id);
    groups.set(reference.type, ids);
  }
  const summaries = await Promise.all(
    [...groups].map(async ([type, ids]) => {
      const definition = graphRegistry[type];
      const { data, error } = await db
        .from(definition.table)
        .select(definition.columns)
        .eq("user_id", auth.user!.id)
        .in("id", [...ids])
        .limit(ids.size);
      if (error)
        throw new Error("Related decision records could not be loaded.");
      return (data ?? []).map((row) =>
        definition.summarize(row as unknown as GraphRecord),
      );
    }),
  );
  const relatedRecords = Object.fromEntries(
    summaries.flat().map((record) => [`${record.type}:${record.id}`, record]),
  );
  return {
    decision: decision as Decision,
    observations,
    revisions: (revisionsResult.data ?? []) as DecisionRevision[],
    goal: goalResult.data,
    relatedRecords,
  };
}

const sourceRow = z.object({
  source_type: z.enum([
    "transaction",
    "debt_payment",
    "task",
    "knowledge_review",
  ]),
  source_id: z.uuid(),
  occurred_on: z.iso.date(),
  title: z.string().min(1).max(160),
  amount_centavos: z.union([z.number(), z.string()]).nullable(),
  source_href: z
    .string()
    .regex(/^\/(?!\/)[a-z][a-zA-Z0-9/?=&-]*$/)
    .max(250),
});

export type DecisionMetricSource = {
  type: z.infer<typeof sourceRow>["source_type"];
  id: string;
  occurredOn: string;
  title: string;
  amountCentavos: number | null;
  href: string;
};

export async function loadDecisionMetricSources(input: {
  metric: string;
  from: string;
  through: string;
}): Promise<{ items: DecisionMetricSource[]; hasMore: boolean }> {
  const db = await createClient();
  if (!db) throw new Error("Decision sources are unavailable.");
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Your session expired.");
  const { data, error } = await db.rpc("decision_metric_sources", {
    p_metric: input.metric,
    p_from: input.from,
    p_through: input.through,
    p_limit: 51,
  });
  if (error) throw new Error("Decision sources could not be loaded.");
  const rows = z
    .array(sourceRow)
    .max(51)
    .parse(data ?? []);
  return {
    items: rows.slice(0, 50).map((row) => {
      const amount =
        row.amount_centavos === null ? null : Number(row.amount_centavos);
      if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0))
        throw new Error("Invalid decision source amount.");
      return {
        type: row.source_type,
        id: row.source_id,
        occurredOn: row.occurred_on,
        title: row.title,
        amountCentavos: amount,
        href: row.source_href,
      };
    }),
    hasMore: rows.length > 50,
  };
}

export async function loadDecisionGoals() {
  const db = await createClient();
  if (!db) return [];
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await db
    .from("goals")
    .select("id,title")
    .eq("user_id", auth.user.id)
    .order("title")
    .limit(100);
  if (error) throw new Error("Goals could not be loaded.");
  return data ?? [];
}
