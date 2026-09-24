import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  materializeRelationships,
  type GraphEdge,
  type RelatedEntity,
} from "@/lib/graph/model";
import {
  graphRegistry,
  isGraphEntityType,
  type GraphEntitySummary,
  type GraphEntityType,
  type GraphRecord,
  type GraphRelationshipType,
} from "@/lib/graph/registry";
import { createClient } from "@/lib/supabase/server";

type ExplicitRow = {
  id: string;
  source_type: GraphEntityType;
  source_id: string;
  target_type: GraphEntityType;
  target_id: string;
  relationship_type: GraphRelationshipType;
  created_at: string;
};

export type { RelatedEntity } from "@/lib/graph/model";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorizedClient(providedClient?: SupabaseClient) {
  const client = providedClient ?? (await createClient());
  if (!client) throw new Error("Graph is unavailable.");
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Your session expired.");
  return { client, ownerId: user.id };
}

async function resolveEntities(
  client: SupabaseClient,
  ownerId: string,
  references: Array<{ type: GraphEntityType; id: string }>,
) {
  const grouped = new Map<GraphEntityType, Set<string>>();
  for (const reference of references) {
    const ids = grouped.get(reference.type) ?? new Set<string>();
    ids.add(reference.id);
    grouped.set(reference.type, ids);
  }
  const entries = await Promise.all(
    [...grouped].map(async ([type, ids]) => {
      const definition = graphRegistry[type];
      const { data, error } = await client
        .from(definition.table)
        .select(definition.columns)
        .eq("user_id", ownerId)
        .in("id", [...ids])
        .limit(ids.size);
      if (error) throw new Error("Related items could not be loaded.");
      return (data ?? []).map((record) =>
        definition.summarize(record as unknown as GraphRecord),
      );
    }),
  );
  return new Map(
    entries.flat().map((entity) => [`${entity.type}:${entity.id}`, entity]),
  );
}

/** One-hop, owner-scoped Graph read helper for product UI and future Analyst retrieval. */
export async function getRelatedEntities(
  {
    entityType,
    entityId,
    limit = 40,
  }: {
    entityType: GraphEntityType;
    entityId: string;
    limit?: number;
  },
  clientOverride?: SupabaseClient,
): Promise<{ items: RelatedEntity[]; hasMore: boolean }> {
  if (!isGraphEntityType(entityType) || !uuidPattern.test(entityId))
    throw new Error("Unsupported Graph entity.");
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const { client, ownerId } = await authorizedClient(clientOverride);
  const endpoint = await resolveEntities(client, ownerId, [
    { type: entityType, id: entityId },
  ]);
  if (!endpoint.has(`${entityType}:${entityId}`))
    throw new Error("Graph entity unavailable.");

  const explicitQuery = client
    .from("atlas_relationships")
    .select(
      "id,source_type,source_id,target_type,target_id,relationship_type,created_at",
    )
    .eq("user_id", ownerId)
    .or(
      `and(source_type.eq.${entityType},source_id.eq.${entityId}),and(target_type.eq.${entityType},target_id.eq.${entityId})`,
    )
    .order("created_at", { ascending: false })
    .limit(boundedLimit + 1);
  const nativeQueries = [];
  if (entityType === "goal") {
    nativeQueries.push(
      client
        .from("tasks")
        .select("id,related_goal_id")
        .eq("user_id", ownerId)
        .eq("related_goal_id", entityId)
        .order("created_at", { ascending: false })
        .limit(boundedLimit + 1),
      client
        .from("goal_milestones")
        .select("id,goal_id")
        .eq("user_id", ownerId)
        .eq("goal_id", entityId)
        .order("sort_order")
        .limit(boundedLimit + 1),
    );
  } else if (entityType === "task") {
    nativeQueries.push(
      client
        .from("tasks")
        .select("id,related_goal_id")
        .eq("user_id", ownerId)
        .eq("id", entityId)
        .not("related_goal_id", "is", null)
        .limit(1),
    );
  } else if (entityType === "goal_milestone") {
    nativeQueries.push(
      client
        .from("goal_milestones")
        .select("id,goal_id")
        .eq("user_id", ownerId)
        .eq("id", entityId)
        .limit(1),
    );
  }
  const [explicitResult, ...nativeResults] = await Promise.all([
    explicitQuery,
    ...nativeQueries,
  ]);
  if (explicitResult.error || nativeResults.some((result) => result.error))
    throw new Error("Related items could not be loaded.");

  const edges: GraphEdge[] = [];
  for (const row of (explicitResult.data ?? []) as ExplicitRow[]) {
    if (
      !isGraphEntityType(row.source_type) ||
      !isGraphEntityType(row.target_type)
    )
      continue;
    edges.push({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      targetType: row.target_type,
      targetId: row.target_id,
      kind: row.relationship_type,
      origin: "manual",
    });
  }
  for (const [index, result] of nativeResults.entries()) {
    const kind =
      (entityType === "goal" && index === 1) || entityType === "goal_milestone"
        ? "milestone_goal"
        : "task_goal";
    const sourceType = kind === "milestone_goal" ? "goal_milestone" : "task";
    for (const row of (result.data ?? []) as Array<{
      id: string;
      related_goal_id?: string | null;
      goal_id?: string;
    }>) {
      const goalId = row.goal_id ?? row.related_goal_id;
      if (!goalId) continue;
      edges.push({
        id: `native:${sourceType}:${row.id}`,
        sourceType,
        sourceId: row.id,
        targetType: "goal",
        targetId: goalId,
        kind,
        origin: "native",
      });
    }
  }

  const summaries = await resolveEntities(
    client,
    ownerId,
    edges.flatMap((edge) => [
      { type: edge.sourceType, id: edge.sourceId },
      { type: edge.targetType, id: edge.targetId },
    ]),
  );
  return materializeRelationships(
    edges,
    summaries,
    { type: entityType, id: entityId },
    boundedLimit,
  );
}

export async function getGoalRelationshipCounts(goalIds: string[]) {
  if (goalIds.length === 0) return new Map<string, Record<string, number>>();
  const { client } = await authorizedClient();
  const batches = [];
  for (let index = 0; index < goalIds.length; index += 200) {
    batches.push(
      client.rpc("atlas_goal_relationship_counts", {
        p_goal_ids: goalIds.slice(index, index + 200),
      }),
    );
  }
  const results = await Promise.all(batches);
  if (results.some((result) => result.error))
    throw new Error("Related counts could not be loaded.");
  const counts = new Map<string, Record<string, number>>();
  for (const result of results) {
    for (const row of result.data ?? []) {
      const record = counts.get(row.goal_id) ?? {};
      record[row.entity_type] = Number(row.relationship_count);
      counts.set(row.goal_id, record);
    }
  }
  return counts;
}

export async function searchGraphCandidates(
  type: GraphEntityType,
  query: string,
): Promise<GraphEntitySummary[]> {
  if (!isGraphEntityType(type)) return [];
  const definition = graphRegistry[type];
  const { client, ownerId } = await authorizedClient();
  const search = query
    .trim()
    .slice(0, 80)
    .replace(/[%,_\\]/g, "");
  const searchColumn =
    type === "debt"
      ? "creditor_name"
      : type === "job_application"
        ? "company_name"
        : type === "weekly_review"
          ? "week_start"
          : type === "transaction"
            ? "merchant_or_source"
            : "title";
  let request = client
    .from(definition.table)
    .select(definition.columns)
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (search.length >= 2) {
    if (type === "weekly_review") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(search)) return [];
      request = request.eq("week_start", search);
    } else {
      request = request.ilike(searchColumn, `%${search}%`);
    }
  }
  const { data, error } = await request;
  if (error) throw new Error("Search could not be completed.");
  return (data ?? []).map((record) =>
    definition.summarize(record as unknown as GraphRecord),
  );
}

const searchGraphTypes: Record<string, GraphEntityType | undefined> = {
  Tasks: "task",
  Knowledge: "knowledge_concept",
  Debts: "debt",
  Career: "job_application",
  Reviews: "weekly_review",
  Transactions: "transaction",
};

/** Batches direct goal context for a bounded search page; no per-result queries. */
export async function getSearchGoalContext(
  results: Array<{ entity_type: string; entity_id: string }>,
) {
  const relevant = results.slice(0, 60).flatMap((item) => {
    const type = searchGraphTypes[item.entity_type];
    return type ? [{ type, id: item.entity_id }] : [];
  });
  if (relevant.length === 0)
    return new Map<string, { title: string; href: string }>();
  const { client, ownerId } = await authorizedClient();
  const taskIds = relevant
    .filter((item) => item.type === "task")
    .map((item) => item.id);
  const [native, manual] = await Promise.all([
    taskIds.length
      ? client
          .from("tasks")
          .select("id,related_goal_id")
          .eq("user_id", ownerId)
          .in("id", taskIds)
          .not("related_goal_id", "is", null)
          .limit(60)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("atlas_relationships")
      .select("source_type,source_id,target_id")
      .eq("user_id", ownerId)
      .eq("target_type", "goal")
      .in(
        "source_id",
        relevant.map((item) => item.id),
      )
      .limit(100),
  ]);
  if (native.error || manual.error)
    return new Map<string, { title: string; href: string }>();
  const goalByEntity = new Map<string, string>();
  for (const row of manual.data ?? [])
    goalByEntity.set(`${row.source_type}:${row.source_id}`, row.target_id);
  for (const row of native.data ?? [])
    if (row.related_goal_id)
      goalByEntity.set(`task:${row.id}`, row.related_goal_id);
  const goalIds = [...new Set(goalByEntity.values())];
  if (goalIds.length === 0)
    return new Map<string, { title: string; href: string }>();
  const { data: goals, error } = await client
    .from("goals")
    .select("id,title")
    .eq("user_id", ownerId)
    .in("id", goalIds)
    .limit(100);
  if (error) return new Map<string, { title: string; href: string }>();
  const titles = new Map((goals ?? []).map((goal) => [goal.id, goal.title]));
  const context = new Map<string, { title: string; href: string }>();
  for (const [entity, goalId] of goalByEntity) {
    const title = titles.get(goalId);
    if (title) context.set(entity, { title, href: `/goals/${goalId}` });
  }
  return context;
}

export function searchResultGraphKey(entityType: string, entityId: string) {
  const type = searchGraphTypes[entityType];
  return type ? `${type}:${entityId}` : null;
}
