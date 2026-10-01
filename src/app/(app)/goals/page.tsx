import { CheckCheck, Goal, Target, TrendingUp } from "lucide-react";
import { GoalCardHeader } from "@/components/goals/goal-card-header";
import { GoalCreatePanel } from "@/components/goals/goal-create-panel";
import {
  GoalProgress,
  calculateGoalProgress,
} from "@/components/goals/goal-progress";
import { MilestoneList } from "@/components/goals/milestone-list";
import { GoalRelatedSummary } from "@/components/graph/goal-related-summary";
import { Card, CardContent } from "@/components/ui/card";
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
  const milestonesByGoal = new Map<string, typeof milestoneData>();
  for (const milestone of milestoneData) {
    const items = milestonesByGoal.get(milestone.goal_id) ?? [];
    items.push(milestone);
    milestonesByGoal.set(milestone.goal_id, items);
  }
  const totalMilestones = milestoneData.length;
  const doneMilestones = milestoneData.filter((m) => m.completed_at).length;
  const averageProgress = goals.length
    ? Math.round(
        goals.reduce((sum, goal) => {
          const items = milestonesByGoal.get(goal.id) ?? [];
          return (
            sum +
            calculateGoalProgress(
              items.filter((m) => m.completed_at).length,
              items.length,
            )
          );
        }, 0) / goals.length,
      )
    : 0;
  const stats = [
    { label: "Goals", value: String(goals.length), icon: Target },
    {
      label: "Milestones done",
      value: `${doneMilestones}/${totalMilestones}`,
      icon: CheckCheck,
    },
    { label: "Avg. progress", value: `${averageProgress}%`, icon: TrendingUp },
  ];
  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <p className="text-primary mb-3 text-xs font-semibold tracking-[0.1em] uppercase">
        Direction
      </p>
      <GoalCreatePanel
        heading={
          <h1 className="text-[2rem] leading-none font-semibold tracking-[-0.045em] sm:text-[2.4rem]">
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
      {goals.length > 0 ? (
        <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="border-border bg-card/80 rounded-2xl border p-3 shadow-sm backdrop-blur sm:p-4"
            >
              <dt className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase sm:text-[11px]">
                <Icon className="text-primary size-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1.5 font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
            const nextMilestone = milestones.find(
              (milestone) => !milestone.completed_at,
            );

            return (
              <Card
                key={goal.id}
                id={`goal-${goal.id}`}
                className={`group/goal before:from-primary/50 relative overflow-hidden rounded-3xl shadow-sm transition duration-200 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:via-cyan-400/60 before:to-transparent hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                  query.highlight === goal.id
                    ? "ring-primary/60 bg-primary/5 ring-2"
                    : ""
                }`}
              >
                <CardContent className="p-5 sm:p-6">
                  <GoalCardHeader goal={goal} />
                  <GoalProgress
                    goalTitle={goal.title}
                    completedMilestones={completedMilestones}
                    totalMilestones={milestones.length}
                    nextMilestoneTitle={nextMilestone?.title}
                  />
                  <MilestoneList
                    goalId={goal.id}
                    milestones={milestones}
                    highlightMilestoneId={
                      query.highlight === goal.id ? query.milestone : undefined
                    }
                  />
                  <GoalRelatedSummary
                    goalId={goal.id}
                    counts={relationshipCounts.get(goal.id) ?? {}}
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
