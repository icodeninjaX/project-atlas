import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSignals } from "@/lib/signals/server";
import {
  manilaToday,
  spendingEvidence,
  spendingPeriods,
  type Evidence,
  type EvidencePackage,
  type QuestionType,
} from "./evidence";

const LIMIT = 1000;
type Period = { from: string; through: string };

function fact(
  id: string,
  metric: string,
  value: Evidence["value"],
  unit: Evidence["unit"],
  period: Period,
  href: string,
  recordIds: string[] = [],
  completeness: Evidence["completeness"] = "complete",
): Evidence {
  return {
    id,
    metric,
    value,
    unit,
    period,
    comparisonBasis: "Current ATLAS records",
    source: { description: metric, recordIds: recordIds.slice(0, 20), href },
    completeness,
  };
}
function packageFor(
  type: QuestionType,
  evidence: Evidence[],
  note: string,
  partial = false,
  partialReason = "The retrieval limit was reached; some records may be omitted.",
): EvidencePackage {
  return {
    type,
    status:
      evidence.length === 0 ? "insufficient" : partial ? "partial" : "ready",
    note: partial ? `${note} ${partialReason}` : note,
    evidence: partial
      ? evidence.map((item) => ({ ...item, completeness: "partial" as const }))
      : evidence,
  };
}
function checked<T>(result: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] {
  if (result.error) throw new Error("Analyst retrieval failed");
  return result.data ?? [];
}

export async function retrieveEvidence(
  supabase: SupabaseClient,
  owner: string,
  type: QuestionType,
  now = new Date(),
): Promise<EvidencePackage> {
  const today = manilaToday(now);
  const current: Period = { from: today, through: today };
  if (type === "spending_change") {
    // Each period is exact and owner-scoped; neither query retrieves unused days.
    const periods = spendingPeriods(now);
    const expenseQuery = (from: string, through: string) =>
      supabase
        .from("transactions")
        .select("id,category_id,amount_centavos,transaction_date", {
          count: "exact",
        })
        .eq("user_id", owner)
        .eq("transaction_type", "expense")
        .gte("transaction_date", from)
        .lte("transaction_date", through)
        .limit(LIMIT);
    const [currentResult, previousResult, categories] = await Promise.all([
      expenseQuery(periods.current.from, periods.current.through),
      expenseQuery(periods.previous.from, periods.previous.through),
      supabase
        .from("transaction_categories")
        .select("id,name", { count: "exact" })
        .eq("user_id", owner)
        .eq("category_type", "expense")
        .limit(501),
    ]);
    const rows = [...checked(currentResult), ...checked(previousResult)];
    const names = checked(categories);
    const evidence = spendingEvidence(
      rows
        .slice(0, LIMIT)
        .map((r) => ({ ...r, amount_centavos: Number(r.amount_centavos) })),
      new Map(names.slice(0, 500).map((r) => [r.id, r.name])),
      now,
      (currentResult.count ?? 0) + (previousResult.count ?? 0) > LIMIT ||
        (categories.count ?? 0) > 500,
    );
    return evidence;
  }
  if (type === "debt_progress") {
    const debtsResult = await supabase
      .from("debts")
      .select(
        "id,original_balance_centavos,current_balance_centavos,status,created_at",
        {
          count: "exact",
        },
      )
      .eq("user_id", owner)
      .limit(501);
    const debts = checked(debtsResult);
    if (!debts.length) return packageFor(type, [], "No debts are recorded.");
    const partial = (debtsResult.count ?? 0) > 500;
    const selected = debts.slice(0, 500);
    const sum = (
      key: "original_balance_centavos" | "current_balance_centavos",
    ) =>
      selected.reduce((s, d) => {
        const amount = Number(d[key]);
        const next = s + amount;
        if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(next))
          throw new Error("Debt exceeds safe centavo range");
        return next;
      }, 0);
    const original = sum("original_balance_centavos"),
      balance = sum("current_balance_centavos");
    const period = {
      from:
        selected.map((d) => manilaToday(new Date(d.created_at))).sort()[0] ??
        today,
      through: today,
    };
    const ids = selected.map((d) => d.id);
    const debtHref = selected[0] ? `/debts/${selected[0].id}` : "/debts";
    return packageFor(
      type,
      [
        fact(
          "debt.original",
          "Original recorded principal",
          original,
          "centavos",
          period,
          debtHref,
          ids,
        ),
        fact(
          "debt.balance",
          "Current recorded balance",
          balance,
          "centavos",
          current,
          debtHref,
          ids,
        ),
        fact(
          "debt.reduction",
          "Reduction from original principal",
          original - balance,
          "centavos",
          period,
          debtHref,
          ids,
        ),
        fact(
          "debt.paid",
          "Debts marked paid",
          selected.filter((d) => d.status === "paid").length,
          "count",
          current,
          "/debts",
          ids,
        ),
      ],
      "Current debt balances are authoritative. Reduction from original principal is not a historical month-by-month balance or payoff forecast.",
      partial,
    );
  }
  if (type === "task_focus") {
    const result = await supabase
      .from("tasks")
      .select("id,priority,due_at,scheduled_for", { count: "exact" })
      .eq("user_id", owner)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .limit(LIMIT + 1);
    const rows = checked(result);
    if (!rows.length)
      return packageFor(type, [], "No open tasks are recorded.");
    const partial = (result.count ?? 0) > LIMIT;
    const selected = rows.slice(0, LIMIT);
    const nextWeek = new Date(`${today}T00:00:00+08:00`);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const weekEnd = manilaToday(nextWeek);
    const due = selected.filter(
      (r) =>
        (r.due_at && manilaToday(new Date(r.due_at)) <= weekEnd) ||
        (r.scheduled_for && r.scheduled_for <= weekEnd),
    );
    const high = selected.filter(
      (r) => r.priority === "high" || r.priority === "critical",
    );
    const priorityRank: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const taskDate = (task: (typeof selected)[number]) =>
      task.scheduled_for ??
      (task.due_at ? manilaToday(new Date(task.due_at)) : null);
    const top = [...selected]
      .sort((a, b) => {
        const aDate = taskDate(a),
          bDate = taskDate(b);
        const aUrgent = aDate && aDate <= weekEnd ? 0 : 1;
        const bUrgent = bDate && bDate <= weekEnd ? 0 : 1;
        return (
          aUrgent - bUrgent ||
          (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4) ||
          (aDate ?? "9999").localeCompare(bDate ?? "9999")
        );
      })
      .slice(0, 3);
    const evidence = [
      fact(
        "tasks.open",
        "Open tasks",
        selected.length,
        "count",
        current,
        "/tasks",
        selected.map((r) => r.id),
      ),
      fact(
        "tasks.due",
        "Tasks due or scheduled within seven days",
        due.length,
        "count",
        { from: today, through: weekEnd },
        "/tasks",
        due.map((r) => r.id),
      ),
      fact(
        "tasks.high",
        "High or critical priority tasks",
        high.length,
        "count",
        current,
        "/tasks",
        high.map((r) => r.id),
      ),
      ...top.map((task, index) =>
        fact(
          `tasks.focus.${index + 1}`,
          `Suggested focus task ${index + 1}`,
          task.priority,
          "priority",
          { from: today, through: weekEnd },
          `/tasks?highlight=${task.id}`,
          [task.id],
        ),
      ),
    ];
    return packageFor(
      type,
      evidence,
      "Focus is ranked by recorded priority, then scheduled or due date. Task titles and notes are not sent to the model.",
      partial,
    );
  }
  if (type === "career_pipeline") {
    const result = await supabase
      .from("job_applications")
      .select("id,stage,next_action_at", { count: "exact" })
      .eq("user_id", owner)
      .limit(LIMIT + 1);
    const rows = checked(result);
    if (!rows.length)
      return packageFor(type, [], "No career applications are recorded.");
    const selected = rows.slice(0, LIMIT);
    const stages = [
      "interested",
      "preparing",
      "applied",
      "assessment",
      "interview",
      "final_interview",
      "offer",
      "rejected",
      "withdrawn",
      "accepted",
    ];
    const evidence = stages.map((stage) => {
      const matches = selected.filter((r) => r.stage === stage);
      return fact(
        `career.${stage}`,
        `${stage.replaceAll("_", " ")} applications`,
        matches.length,
        "count",
        current,
        matches[0] ? `/career?highlight=${matches[0].id}` : "/career",
        matches.map((r) => r.id),
      );
    });
    evidence.push(
      fact(
        "career.followup",
        "Applications with overdue next action",
        selected.filter(
          (r) =>
            r.next_action_at && manilaToday(new Date(r.next_action_at)) < today,
        ).length,
        "count",
        current,
        "/career",
      ),
    );
    return packageFor(
      type,
      evidence,
      "Stage counts are a snapshot; they do not measure conversion rates without complete event history.",
      (result.count ?? 0) > LIMIT,
    );
  }
  if (type === "goal_progress") {
    const [goalsResult, milestoneResult] = await Promise.all([
      supabase
        .from("goals")
        .select("id,progress_percent,target_date", { count: "exact" })
        .eq("user_id", owner)
        .eq("status", "active")
        .limit(501),
      supabase
        .from("goal_milestones")
        .select("id,goal_id,completed_at", { count: "exact" })
        .eq("user_id", owner)
        .limit(LIMIT + 1),
    ]);
    const goals = checked(goalsResult),
      milestones = checked(milestoneResult);
    if (!goals.length)
      return packageFor(type, [], "No active goals are recorded.");
    const selected = goals.slice(0, 500),
      ids = new Set(selected.map((g) => g.id));
    const related = milestones
      .slice(0, LIMIT)
      .filter((m) => ids.has(m.goal_id));
    return packageFor(
      type,
      [
        fact(
          "goals.active",
          "Active goals",
          selected.length,
          "count",
          current,
          selected[0] ? `/goals?highlight=${selected[0].id}` : "/goals",
          selected.map((g) => g.id),
        ),
        fact(
          "goals.overdue",
          "Active goals past target date",
          selected.filter((g) => g.target_date && g.target_date < today).length,
          "count",
          current,
          "/goals",
        ),
        fact(
          "goals.milestones",
          "Completed milestones",
          related.filter((m) => m.completed_at).length,
          "count",
          current,
          "/goals",
          related.filter((m) => m.completed_at).map((m) => m.id),
        ),
        fact(
          "goals.progress",
          "Average displayed goal progress",
          Math.round(
            selected.reduce((s, g) => s + g.progress_percent, 0) /
              selected.length,
          ),
          "percent",
          current,
          "/goals",
        ),
      ],
      "Goal progress is the current ATLAS value derived from milestones; no historical trend is inferred.",
      (goalsResult.count ?? 0) > 500 || (milestoneResult.count ?? 0) > LIMIT,
    );
  }
  if (type === "weekly_review_trends") {
    const result = await supabase
      .from("weekly_reviews")
      .select("id,week_start,energy_score,stress_score,overall_score")
      .eq("user_id", owner)
      .not("completed_at", "is", null)
      .lte("week_start", today)
      .order("week_start", { ascending: false })
      .limit(12);
    const rows = checked(result);
    if (rows.length < 2)
      return packageFor(
        type,
        [],
        "At least two completed weekly reviews are needed for a score pattern.",
      );
    const period = {
      from: rows.at(-1)!.week_start,
      through: rows[0]!.week_start,
    };
    const evidence: Evidence[] = [
      fact(
        "reviews.count",
        "Completed reviews analyzed",
        rows.length,
        "count",
        period,
        "/reviews",
        rows.map((r) => r.id),
      ),
    ];
    for (const key of [
      "energy_score",
      "stress_score",
      "overall_score",
    ] as const) {
      const scored = rows.filter((r) => r[key] !== null);
      if (scored.length)
        evidence.push(
          fact(
            `reviews.${key}`,
            `Average ${key.replace("_score", "")} score`,
            Math.round(
              (scored.reduce((s, r) => s + (r[key] ?? 0), 0) / scored.length) *
                10,
            ) / 10,
            "score",
            period,
            "/reviews",
            scored.map((r) => r.id),
            scored.length < rows.length ? "partial" : "complete",
          ),
        );
    }
    const half = Math.floor(rows.length / 2);
    const recentScores = rows
      .slice(0, half)
      .filter((row) => row.overall_score !== null);
    const olderScores = rows
      .slice(half)
      .filter((row) => row.overall_score !== null);
    if (recentScores.length && olderScores.length) {
      const average = (items: typeof rows) =>
        items.reduce((sum, row) => sum + (row.overall_score ?? 0), 0) /
        items.length;
      const trend = fact(
        "reviews.overall_change",
        "Recent versus earlier overall score",
        Math.round((average(recentScores) - average(olderScores)) * 10) / 10,
        "score",
        period,
        "/reviews",
        rows.map((row) => row.id),
        recentScores.length + olderScores.length < rows.length
          ? "partial"
          : "complete",
      );
      trend.comparisonBasis =
        "Most recent half versus earlier half of completed reviews";
      evidence.push(trend);
    }
    return packageFor(
      type,
      evidence,
      "Only numeric scores from up to 12 completed reviews are analyzed. Written reflections are not interpreted.",
      rows.length < 12,
      "Fewer than 12 completed reviews are available.",
    );
  }
  const signals = await loadSignals(supabase, now);
  if (!signals.length)
    return packageFor(type, [], "No current Signals are available.");
  const evidence = signals
    .slice(0, 12)
    .map((signal, index) =>
      fact(
        `signal.${index}`,
        `${signal.category} ${signal.type}`,
        signal.severity,
        "severity",
        current,
        signal.href,
      ),
    );
  return packageFor(
    type,
    evidence,
    "Signals come from ATLAS's deterministic engine. Only signal type and severity are sent to the model.",
    signals.length > 12,
    "Only the first 12 current signals are shown.",
  );
}
