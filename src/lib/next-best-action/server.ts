import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dayline } from "@/lib/dayline/engine";
import { proposeCareerFollowups } from "@/lib/next-best-action/engine";

export async function loadNextBestActions(
  supabase: SupabaseClient,
  dayline: Dayline,
) {
  const ids = dayline.items
    .filter((item) => item.kind === "career")
    .map((item) => item.id);
  if (!ids.length) return [];

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Recommendations are unavailable.");
  const [applications, choices, relationships] = await Promise.all([
    supabase
      .from("job_applications")
      .select("id,company_name,next_action_at,next_action,stage,updated_at")
      .eq("user_id", user.id)
      .in("id", ids),
    supabase
      .from("next_best_action_choices")
      .select("application_id,expected_next_action_at")
      .eq("user_id", user.id)
      .in("application_id", ids),
    supabase
      .from("atlas_relationships")
      .select("source_id,target_id")
      .eq("user_id", user.id)
      .eq("source_type", "job_application")
      .eq("target_type", "goal")
      .in("source_id", ids),
  ]);
  if (applications.error || choices.error || relationships.error)
    throw new Error("Recommendations are unavailable.");

  const goalIds = [
    ...new Set((relationships.data ?? []).map((row) => row.target_id)),
  ];
  const goals = goalIds.length
    ? await supabase
        .from("goals")
        .select("id,title")
        .eq("user_id", user.id)
        .in("id", goalIds)
    : { data: [], error: null };
  if (goals.error) throw new Error("Recommendations are unavailable.");
  const goalTitles = new Map(
    (goals.data ?? []).map((goal) => [goal.id, goal.title]),
  );

  return proposeCareerFollowups(
    dayline,
    (applications.data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company_name,
      nextActionAt: row.next_action_at,
      nextAction: row.next_action,
      stage: row.stage,
      updatedAt: row.updated_at,
    })),
    (choices.data ?? []).map((row) => ({
      applicationId: row.application_id,
      expectedAt: row.expected_next_action_at,
    })),
    (relationships.data ?? []).flatMap((row) => {
      const title = goalTitles.get(row.target_id);
      return title
        ? [
            {
              applicationId: row.source_id,
              goalId: row.target_id,
              goalTitle: title,
            },
          ]
        : [];
    }),
  );
}
