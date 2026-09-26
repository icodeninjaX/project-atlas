export const graphEntityTypes = [
  "goal",
  "task",
  "goal_milestone",
  "knowledge_concept",
  "debt",
  "job_application",
  "weekly_review",
  "transaction",
  "decision",
  "decision_observation",
] as const;

export type GraphEntityType = (typeof graphEntityTypes)[number];
export type GraphRelationshipType =
  | "supports_goal"
  | "tracks_goal"
  | "reflects_goal"
  | "financially_related"
  | "related_knowledge"
  | "task_goal"
  | "milestone_goal"
  | "decision_goal"
  | "decision_action"
  | "observation_decision"
  | "observation_source";

type GraphRecord = {
  id: string;
  title?: string;
  status?: string;
  creditor_name?: string;
  company_name?: string;
  role_title?: string;
  stage?: string;
  week_start?: string;
  merchant_or_source?: string | null;
  description?: string | null;
  transaction_type?: string;
  transaction_date?: string;
  goal_id?: string;
  decision_on?: string;
  decision_id?: string;
  observed_on?: string;
  note?: string;
};

export type GraphEntitySummary = {
  type: GraphEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

type EntityDefinition = {
  label: string;
  table: string;
  columns: string;
  summarize: (record: GraphRecord) => GraphEntitySummary;
};

const summary = (
  type: GraphEntityType,
  record: GraphRecord,
  title: string,
  subtitle: string | null,
  href: string,
): GraphEntitySummary => ({ type, id: record.id, title, subtitle, href });

export const graphRegistry: Record<GraphEntityType, EntityDefinition> = {
  goal: {
    label: "Goals",
    table: "goals",
    columns: "id,title,status",
    summarize: (r) =>
      summary(
        "goal",
        r,
        r.title ?? "Goal",
        r.status ?? null,
        `/goals?highlight=${r.id}`,
      ),
  },
  task: {
    label: "Tasks",
    table: "tasks",
    columns: "id,title,status",
    summarize: (r) =>
      summary(
        "task",
        r,
        r.title ?? "Task",
        r.status ?? null,
        `/tasks?highlight=${r.id}`,
      ),
  },
  goal_milestone: {
    label: "Milestones",
    table: "goal_milestones",
    columns: "id,goal_id,title",
    summarize: (r) =>
      summary(
        "goal_milestone",
        r,
        r.title ?? "Milestone",
        null,
        `/goals?highlight=${r.goal_id}&milestone=${r.id}`,
      ),
  },
  knowledge_concept: {
    label: "Knowledge",
    table: "knowledge_concepts",
    columns: "id,title",
    summarize: (r) =>
      summary(
        "knowledge_concept",
        r,
        r.title ?? "Knowledge",
        null,
        `/knowledge?highlight=${r.id}`,
      ),
  },
  debt: {
    label: "Debts",
    table: "debts",
    columns: "id,creditor_name,status",
    summarize: (r) =>
      summary(
        "debt",
        r,
        r.creditor_name ?? "Debt",
        r.status ?? null,
        `/debts/${r.id}`,
      ),
  },
  job_application: {
    label: "Career applications",
    table: "job_applications",
    columns: "id,company_name,role_title,stage",
    summarize: (r) =>
      summary(
        "job_application",
        r,
        `${r.company_name ?? "Company"} · ${r.role_title ?? "Role"}`,
        r.stage ?? null,
        `/career?highlight=${r.id}`,
      ),
  },
  weekly_review: {
    label: "Weekly reviews",
    table: "weekly_reviews",
    columns: "id,week_start",
    summarize: (r) =>
      summary(
        "weekly_review",
        r,
        `Week of ${r.week_start ?? "unknown"}`,
        null,
        `/reviews?highlight=${r.id}`,
      ),
  },
  transaction: {
    label: "Transactions",
    table: "transactions",
    columns:
      "id,merchant_or_source,description,transaction_type,transaction_date",
    summarize: (r) =>
      summary(
        "transaction",
        r,
        r.merchant_or_source || r.description || "Transaction",
        `${r.transaction_type ?? "Transaction"} · ${r.transaction_date ?? ""}`,
        `/money/transactions?highlight=${r.id}`,
      ),
  },
  decision: {
    label: "Decisions",
    table: "decisions",
    columns: "id,title,decision_on",
    summarize: (r) =>
      summary(
        "decision",
        r,
        r.title ?? "Decision",
        r.decision_on ?? null,
        `/decisions/${r.id}`,
      ),
  },
  decision_observation: {
    label: "Decision observations",
    table: "decision_observations",
    columns: "id,decision_id,observed_on,note",
    summarize: (r) =>
      summary(
        "decision_observation",
        r,
        (r.note ?? "Observation").slice(0, 100),
        r.observed_on ?? null,
        `/decisions/${r.decision_id}#observation-${r.id}`,
      ),
  },
};

export const explicitGraphPairs = [
  {
    source: "knowledge_concept",
    target: "goal",
    kind: "supports_goal",
    label: "Supports this goal",
  },
  {
    source: "debt",
    target: "goal",
    kind: "tracks_goal",
    label: "Tracks this goal",
  },
  {
    source: "job_application",
    target: "goal",
    kind: "supports_goal",
    label: "Supports this goal",
  },
  {
    source: "weekly_review",
    target: "goal",
    kind: "reflects_goal",
    label: "Reflects on this goal",
  },
  {
    source: "transaction",
    target: "goal",
    kind: "financially_related",
    label: "Financially related",
  },
  {
    source: "goal_milestone",
    target: "knowledge_concept",
    kind: "related_knowledge",
    label: "Related knowledge",
  },
] as const;

export function isGraphEntityType(value: unknown): value is GraphEntityType {
  return (
    typeof value === "string" &&
    graphEntityTypes.includes(value as GraphEntityType)
  );
}

export function findExplicitPair(
  source: unknown,
  target: unknown,
  kind: unknown,
) {
  return explicitGraphPairs.find(
    (pair) =>
      pair.source === source && pair.target === target && pair.kind === kind,
  );
}

export function graphRelationshipLabel(kind: GraphRelationshipType): string {
  if (kind === "decision_goal") return "Intended goal";
  if (kind === "decision_action") return "Planned action";
  if (kind === "observation_decision") return "Observed after decision";
  if (kind === "observation_source") return "Supporting record";
  if (kind === "task_goal") return "Supports goal";
  if (kind === "milestone_goal") return "Milestone of goal";
  return (
    explicitGraphPairs.find((pair) => pair.kind === kind)?.label ?? "Related"
  );
}

export type { GraphRecord };
