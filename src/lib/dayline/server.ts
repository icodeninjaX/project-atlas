import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_DAYLINE_CAPACITY_MINUTES,
  generateDayline,
  type Dayline,
  type DaylineEnergy,
  type DaylinePriority,
  type DaylineSourceData,
} from "@/lib/dayline/engine";

export class DaylineLoadError extends Error {
  constructor() {
    super("Dayline could not be calculated from the available data.");
    this.name = "DaylineLoadError";
  }
}

function assertSuccessful(
  results: Array<{ error?: { message: string } | null }>,
): void {
  if (results.some((result) => result.error)) throw new DaylineLoadError();
}

function energy(value: unknown): DaylineEnergy {
  return value === "low" || value === "high" ? value : "medium";
}

function priority(value: unknown): DaylinePriority {
  return value === "low" || value === "high" || value === "critical"
    ? value
    : "medium";
}

export async function loadDayline(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<Dayline> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new DaylineLoadError();

  const results = await Promise.all([
    supabase
      .from("user_preferences")
      .select("dayline_capacity_minutes,dayline_energy_level")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(
        "id,title,status,priority,due_at,scheduled_for,estimated_minutes,energy_required,related_goal_id,created_at",
      )
      .eq("user_id", user.id)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .limit(1000),
    supabase
      .from("debts")
      .select("id,creditor_name,status,next_due_date,created_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(500),
    supabase
      .from("job_applications")
      .select("id,company_name,stage,next_action,next_action_at,created_at")
      .eq("user_id", user.id)
      .limit(1000),
    supabase
      .from("goals")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1000),
    supabase
      .from("goal_milestones")
      .select("id,goal_id,title,target_date,completed_at,created_at")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .limit(1000),
  ]);

  assertSuccessful(results);
  const [
    preferencesResult,
    taskResult,
    debtResult,
    applicationResult,
    goalResult,
    milestoneResult,
  ] = results;
  const activeGoalIds = new Set((goalResult.data ?? []).map((goal) => goal.id));
  const preferences = preferencesResult.data;

  const source: DaylineSourceData = {
    capacityMinutes: Number(
      preferences?.dayline_capacity_minutes ?? DEFAULT_DAYLINE_CAPACITY_MINUTES,
    ),
    energyLevel: energy(preferences?.dayline_energy_level),
    tasks: (taskResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: priority(task.priority),
      dueAt: task.due_at,
      scheduledFor: task.scheduled_for,
      estimatedMinutes:
        task.estimated_minutes == null ? null : Number(task.estimated_minutes),
      energyRequired: energy(task.energy_required),
      relatedGoalId: task.related_goal_id,
      createdAt: task.created_at,
    })),
    debts: (debtResult.data ?? []).map((debt) => ({
      id: debt.id,
      creditorName: debt.creditor_name,
      status: debt.status,
      nextDueDate: debt.next_due_date,
      createdAt: debt.created_at,
    })),
    applications: (applicationResult.data ?? []).map((application) => ({
      id: application.id,
      companyName: application.company_name,
      stage: application.stage,
      nextAction: application.next_action,
      nextActionAt: application.next_action_at,
      createdAt: application.created_at,
    })),
    milestones: (milestoneResult.data ?? [])
      .filter((milestone) => activeGoalIds.has(milestone.goal_id))
      .map((milestone) => ({
        id: milestone.id,
        goalId: milestone.goal_id,
        title: milestone.title,
        targetDate: milestone.target_date,
        completedAt: milestone.completed_at,
        createdAt: milestone.created_at,
      })),
  };

  return generateDayline(source, now);
}
