import { Goal } from "lucide-react";
import { GoalForm } from "@/components/goals/goal-form";
import { MilestoneList } from "@/components/goals/milestone-list";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateGoalProgressAction } from "@/lib/goals/actions";
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
      <PageHeading
        eyebrow="Direction"
        title="Goals"
        description="Manual progress and milestone completion stay separate, so neither hides the other."
      />
      <div className="mt-8">
        <GoalForm />
      </div>
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-1 text-[10px] capitalize">
                      {goal.area}
                    </span>
                    <h2 className="mt-3 text-base font-semibold">
                      {goal.title}
                    </h2>
                    {goal.success_definition && (
                      <p className="text-muted-foreground mt-2 text-xs leading-5">
                        {goal.success_definition}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-lg font-semibold">
                    {goal.progress_percent}%
                  </span>
                </div>
                <details className="mt-4">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                    Edit goal
                  </summary>
                  <GoalForm goal={goal} />
                </details>
                <div
                  className="bg-muted mt-5 h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label={`${goal.title} progress`}
                  aria-valuenow={goal.progress_percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
                <form
                  action={updateGoalProgressAction}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={goal.progress_percent}
                    aria-label={`Progress for ${goal.title}`}
                    className="border-border bg-background min-h-9 w-20 rounded-lg border px-2 font-mono text-xs"
                  />
                  <select
                    name="status"
                    defaultValue={goal.status}
                    aria-label={`Status for ${goal.title}`}
                    className="border-border bg-background min-h-9 rounded-lg border px-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                  <Button type="submit" size="sm" variant="secondary">
                    Save progress
                  </Button>
                </form>
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
