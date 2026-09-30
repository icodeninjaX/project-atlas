import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { manilaToday } from "@/lib/analyst/evidence";
import { goalLinkedActivity } from "@/lib/analyst/tools/adapters";
import { ToolFailure } from "@/lib/analyst/tools/contracts";
import {
  compareDecisionHistory,
  decisionComparisonWindow,
  decisionMetricKeys,
} from "@/lib/decisions/decision";
import {
  graphRegistry,
  isGraphEntityType,
  type GraphRecord,
} from "@/lib/graph/registry";
import { getRelatedEntities } from "@/lib/graph/server";
import { loadHistoricalMetrics } from "@/lib/history/server";
import { adaptLegacyCall } from "../legacy-evidence";
import {
  ENTITY_DOMAINS,
  V2_TOOL_LIMITS,
  emptyPayload,
  parseHandle,
  toHandle,
  type EntityCandidate,
  type OwnerLabel,
  type QueryGroup,
  type QueryMeasure,
  type V2EntityType,
  type V2ToolInput,
  type V2ToolPayload,
} from "./contracts";
import {
  entityScope,
  excerpt,
  metric,
  onDay,
  path,
  recordFact,
  snapshot,
  type BuildContext,
} from "./build";

/**
 * Implementations of the Analyst V2 read tools. Every read goes through the
 * owner's RLS client and the bounded tool transport with an explicit owner
 * filter. Existing services are reused: Graph traversal, goal-linked
 * activity, historical metrics and the decision comparison window.
 */

export type ReadContext = {
  client: SupabaseClient;
  owner: string;
  now: Date;
  /** Whether policy allows retrieving sensitive narrative for this request. */
  allowSensitive: boolean;
};

type NameSource = {
  table: string;
  columns: string;
  searchColumns: string[];
  name: (row: Record<string, unknown>) => string;
  href: (row: Record<string, unknown>) => string;
};

const registryHref = (type: V2EntityType, row: Record<string, unknown>) =>
  isGraphEntityType(type)
    ? graphRegistry[type].summarize(row as unknown as GraphRecord).href
    : "/money/transactions";

const nameSources: Record<V2EntityType, NameSource> = {
  goal: {
    table: "goals",
    columns: "id,title",
    searchColumns: ["title"],
    name: (r) => String(r.title),
    href: (r) => registryHref("goal", r),
  },
  task: {
    table: "tasks",
    columns: "id,title",
    searchColumns: ["title"],
    name: (r) => String(r.title),
    href: (r) => registryHref("task", r),
  },
  goal_milestone: {
    table: "goal_milestones",
    columns: "id,goal_id,title",
    searchColumns: ["title"],
    name: (r) => String(r.title),
    href: (r) => registryHref("goal_milestone", r),
  },
  debt: {
    table: "debts",
    columns: "id,creditor_name",
    searchColumns: ["creditor_name"],
    name: (r) => String(r.creditor_name),
    href: (r) => registryHref("debt", r),
  },
  job_application: {
    table: "job_applications",
    columns: "id,company_name,role_title",
    searchColumns: ["company_name", "role_title"],
    name: (r) => `${String(r.company_name)} · ${String(r.role_title)}`,
    href: (r) => registryHref("job_application", r),
  },
  knowledge_concept: {
    table: "knowledge_concepts",
    columns: "id,title",
    searchColumns: ["title"],
    name: (r) => String(r.title),
    href: (r) => registryHref("knowledge_concept", r),
  },
  decision: {
    table: "decisions",
    columns: "id,title",
    searchColumns: ["title"],
    name: (r) => String(r.title),
    href: (r) => registryHref("decision", r),
  },
  weekly_review: {
    table: "weekly_reviews",
    columns: "id,week_start",
    searchColumns: [],
    name: (r) => `Week of ${String(r.week_start)}`,
    href: (r) => registryHref("weekly_review", r),
  },
  category: {
    table: "transaction_categories",
    columns: "id,name",
    searchColumns: ["name"],
    name: (r) => String(r.name),
    href: () => "/money/transactions",
  },
};

const idRow = z.object({ id: z.uuid() }).passthrough();

function rows(result: { data: unknown; error: unknown }) {
  if (result.error) throw new ToolFailure("unavailable_source");
  const parsed = z.array(idRow).safeParse(result.data ?? []);
  if (!parsed.success) throw new ToolFailure("invalid_output");
  return parsed.data as Array<Record<string, unknown> & { id: string }>;
}

const normalize = (value: string) =>
  ` ${value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

function label(
  type: V2EntityType,
  row: Record<string, unknown> & { id: string },
): OwnerLabel {
  const source = nameSources[type];
  return {
    handle: toHandle(type, row.id),
    domain: ENTITY_DOMAINS[type],
    text: source.name(row).slice(0, 160),
    href: source.href(row),
  };
}

const basisRank = { exact: 0, mentioned: 1, contains: 2, words: 3 } as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "about",
  "that",
  "this",
  "was",
  "were",
  "are",
  "our",
  "your",
  "my",
  "its",
  "not",
]);
/** A light English stem, so "studying" and "study" count as one word. */
const stem = (word: string) =>
  word.length > 5 && word.endsWith("ing")
    ? word.slice(0, -3)
    : word.length > 4 && word.endsWith("ed")
      ? word.slice(0, -2)
      : word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word;
/** Significant stemmed words, so "part-time study" matches "Study part-time instead…". */
const significant = (normalized: string) =>
  normalized
    .trim()
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stem);

/** Owner-only name resolution with explicit ambiguity; it never picks for the user. */
export async function resolveEntities(
  input: V2ToolInput<"resolveAnalystEntities">,
  { client, owner }: ReadContext,
): Promise<V2ToolPayload> {
  const phrase = normalize(input.text);
  const phraseWords = significant(phrase);
  const payload = emptyPayload();
  const results = await Promise.all(
    input.types.map(async (type) => {
      const source = nameSources[type];
      const found = rows(
        await client
          .from(source.table)
          .select(source.columns)
          .eq("user_id", owner)
          .order("id")
          .limit(V2_TOOL_LIMITS.namesPerType + 1),
      );
      return { type, found };
    }),
  );
  const candidates: Array<
    EntityCandidate & { label: OwnerLabel; name: string }
  > = [];
  for (const { type, found } of results) {
    if (found.length > V2_TOOL_LIMITS.namesPerType) {
      payload.status = "partial";
      payload.limitations.push(
        `More ${type.replace("_", " ")} records exist than ATLAS compared by name.`,
      );
    }
    for (const row of found.slice(0, V2_TOOL_LIMITS.namesPerType)) {
      const names = [nameSources[type].name(row)];
      if (type === "job_application") names.push(String(row.company_name));
      let basis: EntityCandidate["basis"] | null = null;
      for (const raw of names) {
        const name = normalize(raw);
        if (name.trim().length < 2) continue;
        const next: EntityCandidate["basis"] | null =
          name === phrase
            ? "exact"
            : name.trim().length >= 3 && phrase.includes(name)
              ? "mentioned"
              : name.includes(phrase)
                ? "contains"
                : // Every word of a two-plus-word phrase, in any order.
                  phraseWords.length >= 2 &&
                    phraseWords.every((word) =>
                      significant(name).includes(word),
                    )
                  ? "words"
                  : null;
        if (next && (!basis || basisRank[next] < basisRank[basis]))
          basis = next;
      }
      if (basis)
        candidates.push({
          handle: toHandle(type, row.id),
          type,
          basis,
          label: label(type, row),
          name: normalize(nameSources[type].name(row)),
        });
    }
  }
  // A name inside a longer matched name is the same mention ("Car" in "Car upgrade").
  const kept = candidates.filter(
    (item) =>
      item.basis !== "mentioned" ||
      !candidates.some(
        (other) =>
          other !== item &&
          other.basis === "mentioned" &&
          other.name !== item.name &&
          other.name.includes(item.name),
      ),
  );
  kept.sort(
    (a, b) =>
      basisRank[a.basis] - basisRank[b.basis] ||
      a.handle.localeCompare(b.handle),
  );
  const best = kept.filter((item) => item.basis === kept[0]?.basis);
  payload.ambiguous = best.length !== 1;
  payload.candidates = kept
    .slice(0, V2_TOOL_LIMITS.candidates)
    .map(({ handle, type, basis }) => ({ handle, type, basis }));
  payload.labels = kept
    .slice(0, V2_TOOL_LIMITS.candidates)
    .map((item) => item.label);
  if (kept.length > V2_TOOL_LIMITS.candidates) payload.status = "partial";
  if (kept.length === 0)
    payload.limitations.push(
      "No record of the requested types matches that name.",
    );
  return payload;
}

/** One cursor page of one type's records whose names contain a phrase. */
export async function searchRecords(
  input: V2ToolInput<"searchAnalystRecords">,
  { client, owner }: ReadContext,
): Promise<V2ToolPayload> {
  const source = nameSources[input.type];
  const payload = emptyPayload();
  let query = client
    .from(source.table)
    .select(source.columns)
    .eq("user_id", owner)
    .order("id")
    .limit(input.limit + 1);
  if (input.cursor) query = query.gt("id", input.cursor);
  if (input.type === "weekly_review") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.text.replace(/ /g, "-")))
      return {
        ...payload,
        limitations: ["Search weekly reviews by week start date."],
      };
    query = query.eq("week_start", input.text.replace(/ /g, "-"));
  } else if (source.searchColumns.length === 1) {
    query = query.ilike(source.searchColumns[0]!, `%${input.text}%`);
  } else {
    query = query.or(
      source.searchColumns
        .map((column) => `${column}.ilike.%${input.text}%`)
        .join(","),
    );
  }
  const found = rows(await query);
  const page = found.slice(0, input.limit);
  payload.candidates = page.map((row) => ({
    handle: toHandle(input.type, row.id),
    type: input.type,
    basis: "contains" as const,
  }));
  payload.labels = page.map((row) => label(input.type, row));
  payload.nextCursor = found.length > input.limit ? page.at(-1)!.id : null;
  payload.limitations.push(
    "Search finds records; it is never a complete total or ranking.",
  );
  return payload;
}

const manilaDay = (value: unknown) =>
  typeof value === "string" && value ? manilaToday(new Date(value)) : null;
const isoDay = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : null;

const detailColumns: Record<V2EntityType, string> = {
  goal: "id,title,status,progress_percent,target_date",
  task: "id,title,status,priority,due_at,completed_at,related_goal_id",
  goal_milestone: "id,goal_id,title,completed_at,target_date",
  debt: "id,creditor_name,status,current_balance_centavos",
  job_application: "id,company_name,role_title,stage,applied_at,next_action_at",
  knowledge_concept: "id,title,review_count,last_reviewed_at",
  decision: "id,title,decision_on,review_on",
  weekly_review:
    "id,week_start,overall_score,energy_score,stress_score,completed_at,wins,challenges,lessons,time_wasters,next_week_focus,money_reflection,career_reflection",
  category: "id,name,category_type",
};

const reviewText = [
  "wins",
  "challenges",
  "lessons",
  "time_wasters",
  "next_week_focus",
  "money_reflection",
  "career_reflection",
] as const;

/** Current facts for resolved records; private text only when allowed. */
export async function recordDetails(
  input: V2ToolInput<"getAnalystRecordDetails">,
  { client, owner, now, allowSensitive }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "getAnalystRecordDetails",
    retrievedAt: now.toISOString(),
  };
  const today = manilaToday(now);
  const payload = emptyPayload();
  const grouped = new Map<V2EntityType, string[]>();
  for (const handle of input.handles) {
    const parsed = parseHandle(handle)!;
    grouped.set(parsed.type, [...(grouped.get(parsed.type) ?? []), parsed.id]);
  }
  const sensitive = input.profile === "sensitive_narrative";
  if (sensitive && !allowSensitive)
    payload.limitations.push(
      "Private notes and reflections were not retrieved: consent or the provider route does not allow them.",
    );
  let found = 0;
  for (const [type, ids] of grouped) {
    const loaded = rows(
      await client
        .from(nameSources[type].table)
        .select(detailColumns[type])
        .eq("user_id", owner)
        .in("id", ids)
        .limit(ids.length),
    );
    found += loaded.length;
    const events =
      type === "job_application" && loaded.length > 0
        ? rows(
            await client
              .from("job_application_events")
              .select("id,job_application_id,event_type,occurred_at")
              .eq("user_id", owner)
              .in(
                "job_application_id",
                loaded.map((row) => row.id),
              )
              .order("occurred_at")
              .limit(V2_TOOL_LIMITS.events + 1),
          )
        : [];
    if (events.length > V2_TOOL_LIMITS.events) {
      payload.status = "partial";
      payload.limitations.push("More application events exist than are shown.");
    }
    for (const row of loaded) {
      const handle = toHandle(type, row.id);
      const domain = ENTITY_DOMAINS[type];
      const scope = entityScope(handle, type, `One ${type.replace("_", " ")}`);
      const refs = [{ handle, href: nameSources[type].href(row) }];
      payload.labels.push(label(type, row));
      const text = (
        field: string,
        value: unknown,
        unit: "text" | "stage" | "priority" = "text",
      ) => {
        if (typeof value === "string" && value)
          payload.evidence.push(
            recordFact(ctx, {
              local: `${handle}.${field}`,
              domain,
              metricKey: `record:${type}.${field}`,
              period: snapshot(today),
              scope,
              refs,
              value,
              unit,
            }),
          );
      };
      const date = (field: string, value: string | null) => {
        if (value)
          payload.evidence.push(
            recordFact(ctx, {
              local: `${handle}.${field}`,
              domain,
              metricKey: `record:${type}.${field}`,
              period: onDay(value),
              basis: "event_date",
              scope,
              refs,
              value,
              unit: "event",
            }),
          );
      };
      const number = (
        field: string,
        value: unknown,
        unit: "count" | "percent" | "score" | "centavos",
        key = `record:${type}.${field}`,
      ) => {
        if (typeof value === "number" && Number.isFinite(value))
          payload.evidence.push(
            metric(ctx, {
              local: `${handle}.${field}`,
              domain,
              metricKey: key,
              period: snapshot(today),
              scope,
              refs,
              value,
              unit,
            }),
          );
      };
      switch (type) {
        case "goal":
          text("status", row.status);
          number("progress_percent", row.progress_percent, "percent");
          date("target_date", isoDay(row.target_date));
          break;
        case "task":
          text("status", row.status);
          text("priority", row.priority, "priority");
          date("due_on", manilaDay(row.due_at));
          date("completed_on", manilaDay(row.completed_at));
          if (typeof row.related_goal_id === "string")
            text("linked_goal", toHandle("goal", row.related_goal_id));
          break;
        case "goal_milestone":
          date("completed_on", manilaDay(row.completed_at));
          date("target_date", isoDay(row.target_date));
          break;
        case "debt":
          text("status", row.status);
          number(
            "current_balance",
            Number(row.current_balance_centavos),
            "centavos",
            "debt_balance_centavos",
          );
          break;
        case "job_application":
          text("stage", row.stage, "stage");
          date("applied_on", manilaDay(row.applied_at));
          date("next_action_on", manilaDay(row.next_action_at));
          for (const event of events
            .slice(0, V2_TOOL_LIMITS.events)
            .filter((item) => item.job_application_id === row.id)) {
            const day = manilaDay(event.occurred_at);
            if (day)
              payload.evidence.push(
                recordFact(ctx, {
                  local: `${handle}.event.${event.id}`,
                  domain,
                  metricKey: "record:job_application.event",
                  period: onDay(day),
                  basis: "event_date",
                  scope,
                  refs,
                  value: String(event.event_type),
                  unit: "event",
                }),
              );
          }
          break;
        case "knowledge_concept":
          number("review_count", row.review_count, "count");
          date("last_reviewed_on", manilaDay(row.last_reviewed_at));
          break;
        case "decision":
          date("decided_on", isoDay(row.decision_on));
          date("review_on", isoDay(row.review_on));
          break;
        case "weekly_review": {
          const week = isoDay(row.week_start);
          for (const field of ["overall_score", "energy_score", "stress_score"])
            if (typeof row[field] === "number" && week)
              payload.evidence.push(
                metric(ctx, {
                  local: `${handle}.${field}`,
                  domain,
                  metricKey: `record:weekly_review.${field}`,
                  period: onDay(week),
                  basis: "event_date",
                  scope,
                  refs,
                  value: row[field] as number,
                  unit: "score",
                }),
              );
          if (sensitive && allowSensitive && week)
            for (const field of reviewText)
              if (typeof row[field] === "string" && row[field])
                payload.evidence.push(
                  excerpt(ctx, {
                    local: `${handle}.${field}`,
                    domain,
                    metricKey: `record:weekly_review.${field}`,
                    period: onDay(week),
                    basis: "event_date",
                    scope,
                    refs,
                    text: row[field] as string,
                    limitations: [
                      "The user's own reflection; a stated cause is their belief, not an established fact.",
                    ],
                  }),
                );
          break;
        }
        case "category":
          text("category_type", row.category_type);
          break;
      }
    }
  }
  if (found < input.handles.length) {
    payload.status = found === 0 ? "insufficient" : "partial";
    payload.limitations.push(
      `${input.handles.length - found} requested record(s) are unavailable. ATLAS does not say whether they exist.`,
    );
  }
  return payload;
}

const aggregateRow = z.object({
  month_start: z.string(),
  category_id: z.uuid().nullable(),
  transaction_type: z.string(),
  amount_centavos: z.union([z.number(), z.string().regex(/^-?\d+$/)]),
});

const nextDay = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * Complete category totals from the existing owner-scoped database aggregate
 * (`runway_monthly_totals`). The transport rejects a truncated aggregate, so
 * a partial result never becomes a ranking.
 */
export async function moneyBreakdown(
  input: V2ToolInput<"getMoneyBreakdown">,
  { client, owner, now }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "getMoneyBreakdown",
    retrievedAt: now.toISOString(),
  };
  if (input.through > manilaToday(now)) throw new ToolFailure("invalid_input");
  const result = await client.rpc("runway_monthly_totals", {
    p_start_date: input.from,
    p_end_date: nextDay(input.through),
  });
  if (result.error) throw new ToolFailure("unavailable_source");
  const parsed = z
    .array(aggregateRow)
    .max(V2_TOOL_LIMITS.aggregateGroups)
    .safeParse(result.data ?? []);
  if (!parsed.success) throw new ToolFailure("invalid_output");
  const totals = new Map<string, number>();
  for (const row of parsed.data) {
    if (row.transaction_type !== input.kind) continue;
    const key = row.category_id ?? "uncategorized";
    const next = (totals.get(key) ?? 0) + Number(row.amount_centavos);
    if (!Number.isSafeInteger(next)) throw new ToolFailure("invalid_output");
    totals.set(key, next);
  }
  const ids = [...totals.keys()].filter((key) => key !== "uncategorized");
  const names = ids.length
    ? rows(
        await client
          .from("transaction_categories")
          .select("id,name")
          .eq("user_id", owner)
          .in("id", ids)
          .limit(ids.length),
      )
    : [];
  const payload = emptyPayload();
  payload.labels = names.map((row) => label("category", row));
  const setId = `${input.kind}_by_category`;
  const period = { from: input.from, through: input.through };
  const coverage = { period: "complete" as const };
  let total = 0;
  for (const [key, value] of [...totals].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    total += value;
    const member = key === "uncategorized" ? key : toHandle("category", key);
    payload.evidence.push(
      metric(ctx, {
        local: `${input.kind}.${member}.${input.from}.${input.through}`,
        domain: "money",
        metricKey: `${input.kind}_centavos`,
        period,
        basis: "event_date",
        scope: {
          id: `cohort:${setId}`,
          type: "cohort",
          description: `Recorded ${input.kind}s by category`,
          cohort: { setId, member, setSize: totals.size, setComplete: true },
        },
        coverage,
        refs: [{ handle: member, href: "/money/transactions" }],
        value,
        unit: "centavos",
      }),
    );
  }
  payload.evidence.push(
    metric(ctx, {
      local: `${input.kind}.total.${input.from}.${input.through}`,
      domain: "money",
      metricKey: `${input.kind}_centavos`,
      period,
      basis: "event_date",
      scope: {
        id: `whole_domain:${input.kind}`,
        type: "whole_domain",
        description: `All of the owner's recorded ${input.kind}`,
      },
      coverage,
      value: total,
      unit: "centavos",
      limitations: [
        "Transfers are excluded. Zero recorded activity is not proof of no real activity.",
      ],
    }),
  );
  payload.limitations.push(
    "Totals come from a database aggregate over every matching surviving record. Category names are owner-only labels.",
  );
  return payload;
}

export type QueryRow = {
  transaction_date: string;
  amount_centavos: number;
  category_id: string | null;
};

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** The set members a grouping has over a period, including empty ones. */
function queryMembers(
  group: Exclude<QueryGroup, "none" | "category">,
  from: string,
  through: string,
) {
  if (group === "weekday")
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(
      (day) => `weekday:${day}`,
    );
  if (group === "weekend") return ["day_type:weekday", "day_type:weekend"];
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const last = through.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.push(`month:${key}`);
    if (key >= last) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** The member of a grouping that one transaction belongs to. */
function queryMember(group: QueryGroup, row: QueryRow) {
  // Matches the category breakdown's member for records with no category.
  if (group === "category")
    return row.category_id
      ? toHandle("category", row.category_id)
      : "uncategorized";
  const day =
    WEEKDAYS[new Date(`${row.transaction_date}T00:00:00Z`).getUTCDay()]!;
  if (group === "weekday") return `weekday:${day}`;
  if (group === "weekend")
    return day === "sat" || day === "sun"
      ? "day_type:weekend"
      : "day_type:weekday";
  return `month:${row.transaction_date.slice(0, 7)}`;
}

/** A short stable key for a query's filters, so separate queries never mix. */
function filterKey(input: V2ToolInput<"queryTransactions">) {
  const text = JSON.stringify([
    [...input.categories].sort(),
    input.minAmountPesos,
    input.maxAmountPesos,
  ]);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const filtered =
    input.categories.length > 0 ||
    input.minAmountPesos !== null ||
    input.maxAmountPesos !== null;
  return `${input.kind}_q${filtered ? hash.toString(16).padStart(8, "0") : "all"}`;
}

const QUERY_METRIC: Record<
  QueryMeasure,
  { suffix: string; unit: "centavos" | "count" }
> = {
  total: { suffix: "query_centavos", unit: "centavos" },
  count: { suffix: "query_count", unit: "count" },
  average: { suffix: "query_average_centavos", unit: "centavos" },
};

/** Total and count per member; the average is derived from them exactly. */
export function aggregateTransactions(
  rows: QueryRow[],
  input: Pick<V2ToolInput<"queryTransactions">, "groupBy" | "from" | "through">,
) {
  const groups = new Map<string, { total: number; count: number }>();
  if (input.groupBy !== "none" && input.groupBy !== "category")
    for (const member of queryMembers(input.groupBy, input.from, input.through))
      groups.set(member, { total: 0, count: 0 });
  const all = { total: 0, count: 0 };
  for (const row of rows) {
    all.total += row.amount_centavos;
    all.count += 1;
    if (input.groupBy === "none") continue;
    const member = queryMember(input.groupBy, row);
    const group = groups.get(member) ?? { total: 0, count: 0 };
    group.total += row.amount_centavos;
    group.count += 1;
    groups.set(member, group);
    if (!Number.isSafeInteger(group.total) || !Number.isSafeInteger(all.total))
      throw new ToolFailure("invalid_output");
  }
  return { all, groups };
}

const measured = (
  measure: QueryMeasure,
  value: { total: number; count: number },
) =>
  measure === "total"
    ? value.total
    : measure === "count"
      ? value.count
      : value.count === 0
        ? null
        : Math.round(value.total / value.count);

const queryRow = z
  .object({
    id: z.uuid(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount_centavos: z.union([z.number(), z.string().regex(/^\d+$/)]),
    category_id: z.uuid().nullable(),
  })
  .strict();

/**
 * A bounded, owner-scoped transaction query. It reads every matching record
 * (date, amount and category only; never merchants or notes) in keyset pages
 * through the tool transport, and computes totals, counts and averages per
 * group itself. More records than its window is a failure, never a partial
 * figure. Each query's filters get their own scope, so figures from queries
 * with different filters are never combined.
 */
export async function transactionQuery(
  input: V2ToolInput<"queryTransactions">,
  { client, owner, now }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "queryTransactions",
    retrievedAt: now.toISOString(),
  };
  if (input.through > manilaToday(now)) throw new ToolFailure("invalid_input");
  const categoryIds = input.categories.map((item) => parseHandle(item)!.id);
  const found: QueryRow[] = [];
  let after: string | null = null;
  for (let page = 0; ; page += 1) {
    if (page >= V2_TOOL_LIMITS.queryPages) throw new ToolFailure("partial");
    let query = client
      .from("transactions")
      .select("id,transaction_date,amount_centavos,category_id")
      .eq("user_id", owner)
      .eq("transaction_type", input.kind)
      .gte("transaction_date", input.from)
      .lte("transaction_date", input.through);
    if (categoryIds.length) query = query.in("category_id", categoryIds);
    if (input.minAmountPesos !== null)
      query = query.gte(
        "amount_centavos",
        Math.ceil(input.minAmountPesos * 100),
      );
    if (input.maxAmountPesos !== null)
      query = query.lte(
        "amount_centavos",
        Math.floor(input.maxAmountPesos * 100),
      );
    if (after) query = query.gt("id", after);
    const result = await query.order("id").limit(V2_TOOL_LIMITS.queryPage);
    if (result.error) throw new ToolFailure("unavailable_source");
    const parsed = z.array(queryRow).safeParse(result.data ?? []);
    if (!parsed.success) throw new ToolFailure("invalid_output");
    for (const row of parsed.data)
      found.push({
        transaction_date: row.transaction_date,
        amount_centavos: Number(row.amount_centavos),
        category_id: row.category_id,
      });
    if (parsed.data.length < V2_TOOL_LIMITS.queryPage) break;
    after = parsed.data.at(-1)!.id;
  }
  const { all, groups } = aggregateTransactions(found, input);
  const payload = emptyPayload();
  const ids = [
    ...new Set([
      ...categoryIds,
      ...(input.groupBy === "category"
        ? found.flatMap((row) => (row.category_id ? [row.category_id] : []))
        : []),
    ]),
  ];
  if (ids.length)
    payload.labels = rows(
      await client
        .from("transaction_categories")
        .select("id,name")
        .eq("user_id", owner)
        .in("id", ids)
        .limit(ids.length),
    ).map((row) => label("category", row));
  const key = filterKey(input);
  const period = { from: input.from, through: input.through };
  const coverage = {
    period: "complete" as const,
    recordsConsidered: found.length,
  };
  const filters = [
    input.categories.length
      ? `in ${input.categories.length} chosen categor${input.categories.length === 1 ? "y" : "ies"}`
      : null,
    input.minAmountPesos !== null
      ? `of at least ₱${input.minAmountPesos}`
      : null,
    input.maxAmountPesos !== null
      ? `of at most ₱${input.maxAmountPesos}`
      : null,
  ].filter(Boolean);
  const about = `Recorded ${input.kind} transactions${filters.length ? ` ${filters.join(", ")}` : ""}`;
  const setId = `${key}_by_${input.groupBy}`;
  const members = [...groups].sort(([a], [b]) => a.localeCompare(b));
  for (const measure of input.measures) {
    const { suffix, unit } = QUERY_METRIC[measure];
    const metricKey = `${input.kind}_${suffix}`;
    const definition = `${about}: ${measure === "average" ? "average amount per transaction" : measure === "count" ? "number of transactions" : "total amount"}`;
    const value = measured(measure, all);
    if (value !== null)
      payload.evidence.push(
        metric(ctx, {
          local: `${key}.${measure}.all.${input.from}.${input.through}`,
          domain: "money",
          metricKey,
          definition,
          period,
          basis: "event_date",
          scope: {
            id: `whole_domain:${key}`,
            type: "whole_domain",
            description: about,
          },
          coverage,
          value,
          unit,
        }),
      );
    // An average has no value for an empty group, so it ranks only the
    // groups that have transactions.
    const present = members.filter(
      ([, group]) => measured(measure, group) !== null,
    );
    for (const [member, group] of present)
      payload.evidence.push(
        metric(ctx, {
          local: `${key}.${measure}.${member}.${input.from}.${input.through}`,
          domain: "money",
          metricKey,
          definition,
          period,
          basis: "event_date",
          scope: {
            id: `cohort:${setId}`,
            type: "cohort",
            description: `${about}, by ${input.groupBy}`,
            cohort: {
              setId,
              member,
              setSize: present.length,
              setComplete: true,
            },
          },
          coverage,
          ...(member.startsWith("category:") && {
            refs: [{ handle: member, href: "/money/transactions" }],
          }),
          value: measured(measure, group)!,
          unit,
        }),
      );
  }
  payload.limitations.push(
    "ATLAS computed these figures from every matching recorded transaction (date, amount and category only). Transfers and unrecorded spending are not included.",
  );
  return payload;
}

/** A goal's current state plus the existing goal-linked activity adapter. */
export async function goalContext(
  input: V2ToolInput<"getGoalAnalysisContext">,
  context: ReadContext,
): Promise<V2ToolPayload> {
  const { client, owner, now } = context;
  const ctx: BuildContext = {
    tool: "getGoalAnalysisContext",
    retrievedAt: now.toISOString(),
  };
  const goal = parseHandle(input.goal)!;
  const [goalRows, milestoneRows] = await Promise.all([
    client
      .from("goals")
      .select(detailColumns.goal)
      .eq("user_id", owner)
      .eq("id", goal.id)
      .limit(1),
    client
      .from("goal_milestones")
      .select("id,completed_at")
      .eq("user_id", owner)
      .eq("goal_id", goal.id)
      .order("id")
      .limit(101),
  ]);
  const [row] = rows(goalRows);
  if (!row) throw new ToolFailure("unavailable_source");
  const milestones = rows(milestoneRows);
  const linked = await goalLinkedActivity(
    { goalId: goal.id, from: input.from, through: input.through },
    { client, owner, now },
  );
  const handle = toHandle("goal", goal.id);
  const scope = entityScope(
    handle,
    "goal",
    "The selected goal and its currently linked records",
  );
  const today = manilaToday(now);
  const payload = emptyPayload();
  payload.labels.push(label("goal", row));
  const refs = [{ handle, href: nameSources.goal.href(row) }];
  payload.evidence.push(
    recordFact(ctx, {
      local: `${handle}.status`,
      domain: "goals",
      metricKey: "record:goal.status",
      period: snapshot(today),
      scope,
      refs,
      value: String(row.status),
      unit: "text",
    }),
    metric(ctx, {
      local: `${handle}.progress_percent`,
      domain: "goals",
      metricKey: "record:goal.progress_percent",
      period: snapshot(today),
      scope,
      refs,
      value: Number(row.progress_percent),
      unit: "percent",
      limitations: ["Current progress only; past progress is not stored."],
    }),
    metric(ctx, {
      local: `${handle}.milestones_total`,
      domain: "goals",
      metricKey: "record:goal.milestones_total",
      period: snapshot(today),
      scope,
      refs,
      value: Math.min(milestones.length, 100),
      unit: "count",
      coverage: {
        query: milestones.length > 100 ? "partial" : "complete",
        truncated: milestones.length > 100,
      },
    }),
    metric(ctx, {
      local: `${handle}.milestones_completed.${input.from}.${input.through}`,
      domain: "goals",
      metricKey: "goal_linked_milestone_completion",
      period: { from: input.from, through: input.through },
      basis: "event_date",
      scope,
      refs,
      value: milestones.slice(0, 100).filter((item) => {
        const day = manilaDay(item.completed_at);
        return day !== null && day >= input.from && day <= input.through;
      }).length,
      unit: "count",
      coverage: {
        query: milestones.length > 100 ? "partial" : "complete",
        truncated: milestones.length > 100,
      },
    }),
  );
  if (isoDay(row.target_date))
    payload.evidence.push(
      recordFact(ctx, {
        local: `${handle}.target_date`,
        domain: "goals",
        metricKey: "record:goal.target_date",
        period: onDay(isoDay(row.target_date)!),
        basis: "event_date",
        scope,
        refs,
        value: isoDay(row.target_date)!,
        unit: "event",
      }),
    );
  payload.evidence.push(
    ...adaptLegacyCall({
      tool: "getGoalLinkedActivity",
      input: { goalId: goal.id, from: input.from, through: input.through },
      evidence: linked.evidence,
    }),
  );
  payload.status =
    linked.status === "ready" && milestones.length <= 100 ? "ready" : "partial";
  payload.limitations.push(...linked.limitations);
  return payload;
}

const decisionRow = z
  .object({
    id: z.uuid(),
    title: z.string(),
    decision_on: z.string(),
    review_on: z.string(),
    intent: z.string(),
    expected_outcome: z.string(),
    assumptions: z.string().nullable(),
    metric_key: z.enum(decisionMetricKeys).nullable(),
  })
  .passthrough();

/**
 * A decision's analysis context over the existing decision services: the
 * 14-day comparison windows and eligibility rules are reused, never
 * recomputed. The original plan is read from the earliest revision so a
 * later edit cannot erase it.
 */
export async function decisionContext(
  input: V2ToolInput<"getDecisionAnalysisContext">,
  { client, owner, now, allowSensitive }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "getDecisionAnalysisContext",
    retrievedAt: now.toISOString(),
  };
  const today = manilaToday(now);
  const target = parseHandle(input.decision)!;
  const [decisionResult, revisionResult, observationResult] = await Promise.all(
    [
      client
        .from("decisions")
        .select(
          "id,title,decision_on,review_on,intent,expected_outcome,assumptions,metric_key",
        )
        .eq("user_id", owner)
        .eq("id", target.id)
        .limit(1),
      client
        .from("decision_revisions")
        .select(
          "id,previous_intent,previous_expected_outcome,previous_assumptions,changed_at",
        )
        .eq("user_id", owner)
        .eq("decision_id", target.id)
        .order("changed_at")
        .limit(101),
      client
        .from("decision_observations")
        .select(
          "id,observed_on,note,source_task_id,source_transaction_id,source_application_id",
        )
        .eq("user_id", owner)
        .eq("decision_id", target.id)
        .order("observed_on")
        .limit(V2_TOOL_LIMITS.observations + 1),
    ],
  );
  const [raw] = rows(decisionResult);
  if (!raw) throw new ToolFailure("unavailable_source");
  const decision = decisionRow.safeParse(raw);
  if (!decision.success) throw new ToolFailure("invalid_output");
  const revisions = rows(revisionResult);
  const observations = rows(observationResult);
  const handle = toHandle("decision", target.id);
  const scope = entityScope(handle, "decision", "The selected decision");
  const refs = [{ handle, href: `/decisions/${target.id}` }];
  const payload = emptyPayload();
  payload.labels.push(label("decision", raw));
  const d = decision.data;
  const fact = (
    local: string,
    value: string | number,
    unit: "event" | "text" | "count",
    period = snapshot(today),
  ) =>
    typeof value === "number"
      ? metric(ctx, {
          local: `${handle}.${local}`,
          domain: "decisions",
          metricKey: `record:decision.${local}`,
          period,
          scope,
          refs,
          value,
          unit,
        })
      : recordFact(ctx, {
          local: `${handle}.${local}`,
          domain: "decisions",
          metricKey: `record:decision.${local}`,
          period,
          basis: unit === "event" ? "event_date" : "snapshot",
          scope,
          refs,
          value,
          unit,
        });
  payload.evidence.push(
    fact("decided_on", d.decision_on, "event", onDay(d.decision_on)),
    fact("review_on", d.review_on, "event", onDay(d.review_on)),
    fact("revisions", Math.min(revisions.length, 100), "count"),
    fact(
      "observations",
      Math.min(observations.length, V2_TOOL_LIMITS.observations),
      "count",
    ),
  );

  // Observation sources that can no longer be read are reported, never filled in.
  const sources = observations.flatMap((item) =>
    item.source_task_id
      ? [{ obs: item.id, table: "tasks", id: String(item.source_task_id) }]
      : item.source_transaction_id
        ? [
            {
              obs: item.id,
              table: "transactions",
              id: String(item.source_transaction_id),
            },
          ]
        : item.source_application_id
          ? [
              {
                obs: item.id,
                table: "job_applications",
                id: String(item.source_application_id),
              },
            ]
          : [],
  );
  const readable = new Set<string>();
  for (const table of [...new Set(sources.map((item) => item.table))]) {
    const ids = [
      ...new Set(
        sources.filter((item) => item.table === table).map((item) => item.id),
      ),
    ];
    for (const row of rows(
      await client
        .from(table)
        .select("id")
        .eq("user_id", owner)
        .in("id", ids)
        .limit(ids.length),
    ))
      readable.add(row.id);
  }
  const unavailable = sources.filter((item) => !readable.has(item.id)).length;
  if (unavailable > 0) {
    payload.evidence.push(
      fact("unavailable_observation_sources", unavailable, "count"),
    );
    payload.limitations.push(
      "Some observations cite a record that is no longer available; its content is not shown.",
    );
  }

  // Review state and the existing deterministic comparison.
  let state = "no_metric";
  if (d.review_on > today) state = "review_date_not_reached";
  else if (d.metric_key) {
    const window = decisionComparisonWindow(d.decision_on, today);
    const history = window
      ? await loadHistoricalMetrics(
          {
            from: window.beforeFrom,
            through: window.afterThrough,
            grain: "day",
          },
          client,
        )
      : null;
    const comparison = history
      ? compareDecisionHistory(d, today, history)
      : null;
    state = comparison
      ? "comparison_available"
      : "comparison_insufficient_history";
    if (comparison) {
      const unit = d.metric_key.endsWith("_centavos") ? "centavos" : "count";
      const windowScope = {
        ...scope,
        id: `${handle}:comparison`,
        description: "The decision's before and after windows",
      };
      for (const [side, value, from, through, count] of [
        [
          "before",
          comparison.before,
          comparison.beforeFrom,
          comparison.beforeThrough,
          comparison.beforeCount,
        ],
        [
          "after",
          comparison.after,
          comparison.afterFrom,
          comparison.afterThrough,
          comparison.afterCount,
        ],
      ] as const)
        payload.evidence.push(
          metric(ctx, {
            local: `${handle}.${side}`,
            domain: "decisions",
            metricKey: d.metric_key,
            period: { from, through },
            basis: "window",
            scope: windowScope,
            refs,
            value,
            unit,
            coverage: { period: "complete", recordsConsidered: count },
            limitations: [
              "A before/after difference does not establish that the decision caused it.",
            ],
          }),
        );
    }
  }
  payload.evidence.push(fact("review_state", state, "text"));

  if (input.includeText && allowSensitive) {
    const first = revisions[0];
    const original = first
      ? [
          first.previous_intent,
          first.previous_expected_outcome,
          first.previous_assumptions,
        ]
      : [d.intent, d.expected_outcome, d.assumptions];
    const plan = (label: string, parts: unknown[], day: string) =>
      excerpt(ctx, {
        local: `${handle}.${label}`,
        domain: "decisions",
        metricKey: `record:decision.${label}`,
        period: onDay(day),
        basis: "event_date",
        scope,
        refs,
        text: parts
          .filter((part) => typeof part === "string" && part)
          .join(" — "),
        limitations: ["The user's own plan as written at the time."],
      });
    payload.evidence.push(plan("original_plan", original, d.decision_on));
    if (first)
      payload.evidence.push(
        plan(
          "current_plan",
          [d.intent, d.expected_outcome, d.assumptions],
          today,
        ),
      );
    for (const item of observations.slice(0, V2_TOOL_LIMITS.observations))
      payload.evidence.push(
        excerpt(ctx, {
          local: `${handle}.observation.${item.id}`,
          domain: "decisions",
          metricKey: "record:decision.observation",
          period: onDay(String(item.observed_on)),
          basis: "event_date",
          scope,
          refs,
          text: String(item.note),
          limitations: ["A self-reported observation, not proof of impact."],
        }),
      );
  } else if (input.includeText) {
    payload.limitations.push(
      "Decision text was not retrieved: consent or the provider route does not allow private text.",
    );
  }
  if (
    revisions.length > 100 ||
    observations.length > V2_TOOL_LIMITS.observations
  )
    payload.status = "partial";
  return payload;
}

const expansionPriority = [
  "decision",
  "goal",
  "decision_observation",
  "goal_milestone",
  "task",
];
const expansionOrder = (key: string) => {
  const index = expansionPriority.indexOf(key.split(":")[0]!);
  return index === -1 ? expansionPriority.length : index;
};

/**
 * Bounded traversal over the existing one-hop Graph service: at most two
 * hops, 40 nodes and 80 edges. A link back into the current path is cut and
 * reported. Paths show current links only.
 */
export async function relationshipPaths(
  input: V2ToolInput<"getRelationshipPaths">,
  { client, now }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "getRelationshipPaths",
    retrievedAt: now.toISOString(),
  };
  const start = parseHandle(input.start)!;
  if (!isGraphEntityType(start.type)) throw new ToolFailure("invalid_input");
  const today = manilaToday(now);
  const payload = emptyPayload();
  const startKey = `${start.type}:${start.id}`;
  const pathTo = new Map<string, Array<{ type: string; handle: string }>>([
    [startKey, [{ type: start.type, handle: startKey }]],
  ]);
  const edges = new Set<string>();
  let frontier = [startKey];
  let cycleCut = false;
  let truncated = false;
  let expansions = 0;
  for (let depth = 1; depth <= input.depth; depth += 1) {
    const next: string[] = [];
    // Decisions and goals connect the most records, so they are expanded first.
    const ordered = [...frontier].sort(
      (a, b) => expansionOrder(a) - expansionOrder(b) || a.localeCompare(b),
    );
    const room = V2_TOOL_LIMITS.graphExpansions - expansions;
    if (ordered.length > room) truncated = true;
    for (const node of ordered.slice(0, Math.max(room, 0))) {
      expansions += 1;
      const [type, id] = node.split(":") as [string, string];
      if (!isGraphEntityType(type)) continue;
      let related;
      try {
        related = await getRelatedEntities(
          { entityType: type, entityId: id, limit: 20 },
          client,
        );
      } catch (error) {
        if (error instanceof ToolFailure) throw error;
        // The start record must exist for this owner; later nodes may vanish.
        if (node === startKey) throw new ToolFailure("unavailable_source");
        truncated = true;
        continue;
      }
      if (related.hasMore) truncated = true;
      for (const item of related.items) {
        if (edges.has(item.id)) continue;
        if (edges.size >= V2_TOOL_LIMITS.graphEdges) {
          truncated = true;
          break;
        }
        edges.add(item.id);
        const key = `${item.related.type}:${item.related.id}`;
        const current = pathTo.get(node)!;
        if (current.some((step) => step.handle === key)) {
          if (current.at(-2)?.handle !== key) cycleCut = true;
          continue;
        }
        if (pathTo.has(key)) {
          // Reached again by another route: a cycle through the start or a repeat.
          cycleCut = true;
          continue;
        }
        if (pathTo.size >= V2_TOOL_LIMITS.graphNodes) {
          truncated = true;
          continue;
        }
        const extended = [...current, { type: item.related.type, handle: key }];
        pathTo.set(key, extended);
        next.push(key);
        payload.labels.push({
          handle: key,
          domain: "graph",
          text: item.related.title.slice(0, 160),
          href: item.related.href,
        });
        payload.evidence.push(
          path(ctx, {
            local: `${startKey}.${key}`,
            domain: "graph",
            metricKey: `graph:${item.kind}`,
            definition: `Current ${item.origin} relationship (${item.kind}) at hop ${depth}`,
            period: snapshot(today),
            scope: {
              id: `relationship:${startKey}`,
              type: "relationship",
              description: "Current Graph paths from the selected record",
            },
            coverage: { relationship: "current_only" },
            refs: [{ handle: key, href: item.related.href }],
            nodes: extended,
            origin: item.origin,
          }),
        );
      }
    }
    frontier = next;
  }
  payload.limitations.push(
    "Current links only; they do not show when a link was made or whether it existed earlier.",
  );
  if (cycleCut)
    payload.limitations.push(
      "A relationship loop was found and cut; each record appears once.",
    );
  if (truncated) {
    payload.status = "partial";
    payload.limitations.push(
      "More relationships exist than this bounded result shows.",
    );
  }
  return payload;
}

type InventoryArea = {
  local: string;
  table: string;
  domain:
    "money" | "debts" | "tasks" | "goals" | "career" | "reviews" | "knowledge";
  /** What the count is, in words a planner reads. */
  definition: string;
  /** The date column that spans the counted records. */
  dateColumn: string;
  /** Extra owner-scoped filters: column → PostgREST expression. */
  filters?: Record<string, string>;
};

const INVENTORY: readonly InventoryArea[] = [
  {
    local: "transactions",
    table: "transactions",
    domain: "money",
    definition: "Recorded income and expense transactions",
    dateColumn: "transaction_date",
  },
  {
    local: "active_debts",
    table: "debts",
    domain: "debts",
    definition: "Active debts",
    dateColumn: "created_at",
    filters: { status: "eq.active" },
  },
  {
    local: "debt_payments",
    table: "debt_payments",
    domain: "debts",
    definition: "Recorded debt payments",
    dateColumn: "payment_date",
  },
  {
    local: "open_tasks",
    table: "tasks",
    domain: "tasks",
    definition: "Open tasks",
    dateColumn: "created_at",
    filters: { completed_at: "is.null" },
  },
  {
    local: "completed_tasks",
    table: "tasks",
    domain: "tasks",
    definition: "Completed tasks",
    dateColumn: "completed_at",
    filters: { completed_at: "not.is.null" },
  },
  {
    local: "active_goals",
    table: "goals",
    domain: "goals",
    definition: "Active goals",
    dateColumn: "created_at",
    filters: { status: "eq.active" },
  },
  {
    local: "job_applications",
    table: "job_applications",
    domain: "career",
    definition: "Job applications",
    dateColumn: "created_at",
  },
  {
    local: "weekly_reviews",
    table: "weekly_reviews",
    domain: "reviews",
    definition: "Weekly reviews",
    dateColumn: "week_start",
  },
  {
    local: "knowledge_concepts",
    table: "knowledge_concepts",
    domain: "knowledge",
    definition: "Knowledge concepts being studied",
    dateColumn: "created_at",
    filters: { archived_at: "is.null" },
  },
];

const inventoryRow = z.record(z.string(), z.unknown());

/**
 * What the owner records, area by area: how many records and the dates they
 * span. Each area is two bounded, owner-scoped reads of one date column
 * (earliest and latest), and the exact count comes from the same response.
 * No name, note or amount is read, so every item is an aggregate.
 */
export async function dataInventory(
  _input: V2ToolInput<"getDataInventory">,
  { client, owner, now }: ReadContext,
): Promise<V2ToolPayload> {
  const ctx: BuildContext = {
    tool: "getDataInventory",
    retrievedAt: now.toISOString(),
  };
  const today = manilaToday(now);
  const read = async (area: InventoryArea, ascending: boolean) => {
    let query = client
      .from(area.table)
      .select(area.dateColumn, { count: "exact" })
      .eq("user_id", owner);
    for (const [column, expression] of Object.entries(area.filters ?? {})) {
      const [operator, ...rest] = expression.split(".");
      query = query.filter(column, operator!, rest.join("."));
    }
    const result = await query.order(area.dateColumn, { ascending }).limit(1);
    if (result.error) throw new ToolFailure("unavailable_source");
    const parsed = z
      .array(inventoryRow)
      .max(1)
      .safeParse(result.data ?? []);
    if (!parsed.success || typeof result.count !== "number")
      throw new ToolFailure("invalid_output");
    const value = parsed.data[0]?.[area.dateColumn];
    const day =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
        ? value.slice(0, 10)
        : null;
    return { count: result.count, day };
  };
  const payload = emptyPayload();
  const results = await Promise.all(
    INVENTORY.map(async (area) => {
      const [latest, earliest] = await Promise.all([
        read(area, false),
        read(area, true),
      ]);
      return { area, latest, earliest };
    }),
  );
  for (const { area, latest, earliest } of results) {
    const from = earliest.day && earliest.day <= today ? earliest.day : today;
    const through =
      latest.day && latest.day <= today && latest.day >= from
        ? latest.day
        : from;
    payload.evidence.push(
      metric(ctx, {
        local: `inventory.${area.local}`,
        domain: area.domain,
        metricKey: `inventory_${area.local}`,
        definition: `${area.definition}: how many are stored, and the first and latest dates they span`,
        period: { from, through },
        scope: {
          id: `inventory:${area.local}`,
          type: "whole_domain",
          description: area.definition,
        },
        value: latest.count,
        unit: "count",
      }),
    );
  }
  payload.limitations.push(
    "The inventory counts stored records; it does not show whether everything was recorded.",
  );
  return payload;
}
