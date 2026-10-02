import { GoalsBoard } from "@/components/goals/goals-board";
import { getGoalRelationshipCounts } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Goals" };

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string; milestone?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const goalResult = await supabase
    .from("goals")
    .select(
      "id,title,description,area,status,target_date,success_definition,target_amount_centavos,saved_amount_centavos",
    )
    .order("target_date", { nullsFirst: false });
  if (goalResult.error) {
    throw new Error(`Could not load goals: ${goalResult.error.message}`);
  }
  const goals = goalResult.data ?? [];
  const relationshipCounts = await getGoalRelationshipCounts(
    goals.map((goal) => goal.id),
  );

  const milestoneResult = goals.length
    ? await supabase
        .from("goal_milestones")
        .select("id,goal_id,title,description,target_date,completed_at")
        .in(
          "goal_id",
          goals.map((goal) => goal.id),
        )
        .order("sort_order")
    : { data: [], error: null };
  if (milestoneResult.error) {
    throw new Error(
      `Could not load goal milestones: ${milestoneResult.error.message}`,
    );
  }
  const milestoneData = milestoneResult.data ?? [];
  return (
    <GoalsBoard
      goals={goals}
      milestones={milestoneData}
      relationshipCounts={relationshipCounts}
      highlightGoalId={query.highlight}
      highlightMilestoneId={query.milestone}
    />
  );
}
