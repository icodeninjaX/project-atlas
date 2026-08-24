import { Goal } from "lucide-react";
import { GoalCardHeader } from "@/components/goals/goal-card-header";
import { GoalCreatePanel } from "@/components/goals/goal-create-panel";
import { GoalProgressSlider } from "@/components/goals/goal-progress-slider";
import { MilestoneList } from "@/components/goals/milestone-list";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("goals")
        .select(
          "id,title,description,area,status,target_date,progress_percent,success_definition",
        )
        .order("target_date", { nullsFirst: false })
    : { data: [] };
  const goals = data ?? [];
  const { data: milestoneData } =
    supabase && goals.length
      ? await supabase
          .from("goal_milestones")
          .select("id,goal_id,title,target_date,completed_at")
          .in(
            "goal_id",
            goals.map((goal) => goal.id),
          )
          .order("sort_order")
      : { data: [] };
  const milestonesByGoal = new Map<string, typeof milestoneData>();
  for (const milestone of milestoneData ?? []) {
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
            Manual progress and milestone completion stay separate, so neither
            hides the other.
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
          goals.map((goal) => (
            <Card key={goal.id}>
              <CardContent>
                <GoalCardHeader goal={goal} />
                <GoalProgressSlider
                  key={`${goal.id}-${goal.progress_percent}`}
                  goalId={goal.id}
                  goalTitle={goal.title}
                  progressPercent={goal.progress_percent}
                  status={goal.status}
                />
                <MilestoneList
                  goalId={goal.id}
                  milestones={milestonesByGoal.get(goal.id) ?? []}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
