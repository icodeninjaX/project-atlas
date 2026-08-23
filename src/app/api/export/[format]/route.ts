import { createCsv } from "@/lib/export/csv";
import { createClient } from "@/lib/supabase/server";

const csvEntities = {
  transactions: [
    "id",
    "account_id",
    "category_id",
    "transaction_type",
    "amount_centavos",
    "transaction_date",
    "merchant_or_source",
    "description",
    "created_at",
    "updated_at",
  ],
  debts: [
    "id",
    "creditor_name",
    "debt_type",
    "original_balance_centavos",
    "current_balance_centavos",
    "interest_rate_percent",
    "minimum_payment_centavos",
    "due_day",
    "next_due_date",
    "status",
    "priority",
    "notes",
    "created_at",
    "updated_at",
  ],
  debt_payments: [
    "id",
    "debt_id",
    "amount_centavos",
    "payment_date",
    "transaction_id",
    "notes",
    "created_at",
    "updated_at",
  ],
  tasks: [
    "id",
    "title",
    "description",
    "status",
    "priority",
    "due_at",
    "scheduled_for",
    "scheduled_time",
    "estimated_minutes",
    "completed_at",
    "related_goal_id",
    "created_at",
    "updated_at",
  ],
  goals: [
    "id",
    "title",
    "description",
    "area",
    "status",
    "target_date",
    "progress_percent",
    "success_definition",
    "created_at",
    "updated_at",
  ],
  job_applications: [
    "id",
    "company_name",
    "role_title",
    "job_url",
    "location",
    "work_setup",
    "employment_type",
    "salary_min_centavos",
    "salary_max_centavos",
    "stage",
    "applied_at",
    "next_action",
    "next_action_at",
    "resume_version",
    "notes",
    "created_at",
    "updated_at",
  ],
  activity_log: [
    "id",
    "action",
    "entity_type",
    "entity_id",
    "metadata",
    "created_at",
    "updated_at",
  ],
} as const;

const jsonTables = [
  "profiles",
  "user_preferences",
  "financial_accounts",
  "transaction_categories",
  "transactions",
  "account_transfers",
  "account_balance_adjustments",
  "monthly_budgets",
  "budget_items",
  "debts",
  "debt_payments",
  "tasks",
  "goals",
  "goal_milestones",
  "job_applications",
  "job_application_events",
  "weekly_reviews",
  "daily_priority_pins",
  "activity_log",
] as const;

function filename(suffix: string) {
  return `project-atlas-${suffix}-${new Date().toISOString().slice(0, 10)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  const supabase = await createClient();
  if (!supabase)
    return Response.json({ code: "configuration_error" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ code: "authentication_required" }, { status: 401 });

  if (format === "csv") {
    const entity = new URL(request.url).searchParams.get("entity") ?? "";
    if (!(entity in csvEntities)) {
      return Response.json({ code: "invalid_export_entity" }, { status: 400 });
    }

    const columns = csvEntities[entity as keyof typeof csvEntities];
    const { data, error } = await supabase
      .from(entity)
      .select(columns.join(","))
      .order("created_at", { ascending: true })
      .limit(10_000);

    if (error)
      return Response.json({ code: "database_error" }, { status: 500 });

    return new Response(
      createCsv(
        (data ?? []) as unknown as Record<
          string,
          string | number | boolean | null
        >[],
        [...columns],
      ),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename(entity)}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  if (format === "json") {
    const exported: Record<string, unknown[]> = {};

    for (const table of jsonTables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(10_000);
      if (error) {
        return Response.json(
          { code: "database_error", table },
          { status: 500 },
        );
      }
      exported[table] = data ?? [];
    }

    return new Response(
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          format_version: 1,
          data: exported,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename("data")}.json"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return Response.json({ code: "unsupported_export_format" }, { status: 404 });
}
