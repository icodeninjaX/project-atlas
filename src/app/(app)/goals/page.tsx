import { Goal } from "lucide-react";
import { GoalCardHeader } from "@/components/goals/goal-card-header";
import { GoalCreatePanel } from "@/components/goals/goal-create-panel";
import { GoalProgress } from "@/components/goals/goal-progress";
import { MilestoneList } from "@/components/goals/milestone-list";
import { Card, CardContent } from "@/components/ui/card";
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
    .select("id,title,description,area,status,target_date,success_definition")
    .order("target_date", { nullsFirst: false });
  if (goalResult.error) {
    throw new Error(`Could not load goals: ${goalResult.error.message}`);
  }
  const goals = goalResult.data ?? [];

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
  const milestonesByGoal = new Map<string, typeof milestoneData>();
  for (const milestone of milestoneData) {
    const items = milestonesByGoal.get(milestone.goal_id) ?? [];
    items.push(milestone);
    milestonesByGoal.set(milestone.goal_id, items);
  }
  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <p className="text-primary mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        Direction
      </p>
      <GoalCreatePanel
        heading={
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Goals
          </h1>
        }
        description={
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
            Progress updates automatically as you complete, reopen, or add
            milestones.
          </p>
        }
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {goals.length === 0 ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed text-center lg:col-span-2">
            <div>
              <Goal className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                Name the outcome you want.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                A clear success definition makes daily tasks easier to choose.
              </p>
            </div>
          </div>
        ) : (
          goals.map((goal) => {
            const milestones = milestonesByGoal.get(goal.id) ?? [];
            const completedMilestones = milestones.filter(
              (milestone) => milestone.completed_at,
            ).length;

            return (
              <Card
                key={goal.id}
                id={`goal-${goal.id}`}
                className={
                  query.highlight === goal.id
                    ? "ring-primary/60 bg-primary/5 ring-2"
                    : undefined
                }
              >
                <CardContent>
                  <GoalCardHeader goal={goal} />
                  <GoalProgress
                    goalTitle={goal.title}
                    completedMilestones={completedMilestones}
                    totalMilestones={milestones.length}
                  />
                  <MilestoneList
                    goalId={goal.id}
                    milestones={milestones}
                    highlightMilestoneId={
                      query.highlight === goal.id ? query.milestone : undefined
                    }
                  />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
