import type { CSSProperties } from "react";
import { Goal } from "lucide-react";
import { goalAreaTheme } from "@/components/goals/goal-area";
import { GoalCardHeader } from "@/components/goals/goal-card-header";
import { GoalCreatePanel } from "@/components/goals/goal-create-panel";
import {
  GoalProgress,
  calculateGoalProgress,
} from "@/components/goals/goal-progress";
import { MilestoneList } from "@/components/goals/milestone-list";
import { GoalRelatedSummary } from "@/components/graph/goal-related-summary";
import { Card, CardContent } from "@/components/ui/card";
import {
  calendarDaysBetween,
  formatCalendarDate,
  manilaTodayIsoDate,
} from "@/lib/dates/dates";
import { PageShell } from "@/components/shared/page-shell";

export type GoalsBoardGoal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  status: string;
  target_date: string | null;
  success_definition: string | null;
  target_amount_centavos: number | null;
  saved_amount_centavos: number | null;
};

export type GoalsBoardMilestone = {
  id: string;
  goal_id: string;
  title: string;
  description: unknown;
  target_date: string | null;
  completed_at: string | null;
};

const openStatuses = new Set(["active", "paused"]);

function SummaryStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-card min-w-0 p-3.5 sm:p-4">
      <dt className="text-muted-foreground truncate text-xs font-medium">
        {label}
      </dt>
      <dd className="mt-2">
        <span className="block truncate font-mono text-xl leading-none font-semibold tracking-tight tabular-nums sm:text-[1.75rem]">
          {value}
        </span>
        <span className="text-muted-foreground mt-1.5 block truncate text-[0.6875rem] sm:text-xs">
          {detail}
        </span>
      </dd>
    </div>
  );
}

export function GoalsBoard({
  goals,
  milestones: milestoneData,
  relationshipCounts,
  highlightGoalId,
  highlightMilestoneId,
  today = manilaTodayIsoDate(),
}: {
  goals: GoalsBoardGoal[];
  milestones: GoalsBoardMilestone[];
  relationshipCounts: Map<string, Record<string, number>>;
  highlightGoalId?: string;
  highlightMilestoneId?: string;
  /** Today's `YYYY-MM-DD` date; defaults to today in Asia/Manila. */
  today?: string;
}) {
  const milestonesByGoal = new Map<string, GoalsBoardMilestone[]>();
  for (const milestone of milestoneData) {
    const items = milestonesByGoal.get(milestone.goal_id) ?? [];
    items.push(milestone);
    milestonesByGoal.set(milestone.goal_id, items);
  }

  // Goals still in play come first; finished or dropped ones sink to the end
  // while keeping the server's target-date order within each group.
  const orderedGoals = [
    ...goals.filter((goal) => openStatuses.has(goal.status)),
    ...goals.filter((goal) => !openStatuses.has(goal.status)),
  ];

  const activeGoalList = goals.filter((goal) => goal.status === "active");
  const activeGoals = activeGoalList.length;
  const totalMilestones = milestoneData.length;
  const doneMilestones = milestoneData.filter((m) => m.completed_at).length;
  // Only goals still being worked on: a finished goal would inflate the
  // average and an abandoned one would drag it down.
  const averageProgress = activeGoals
    ? Math.round(
        activeGoalList.reduce((sum, goal) => {
          const items = milestonesByGoal.get(goal.id) ?? [];
          return (
            sum +
            calculateGoalProgress(
              items.filter((m) => m.completed_at).length,
              items.length,
            )
          );
        }, 0) / activeGoals,
      )
    : undefined;
  const nextDeadline = goals
    .filter(
      (goal) =>
        goal.status === "active" &&
        goal.target_date &&
        goal.target_date >= today,
    )
    .sort((a, b) => a.target_date!.localeCompare(b.target_date!))[0];
  const daysToNextDeadline = nextDeadline
    ? calendarDaysBetween(today, nextDeadline.target_date!)
    : undefined;

  return (
    <PageShell>
      <GoalCreatePanel
        title="Goals"
        description="Progress updates automatically as you complete, reopen, or add milestones."
        summary={
          goals.length > 0 ? (
            <dl className="bg-border border-border mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:mt-8 lg:grid-cols-4">
              <SummaryStat
                label="Active goals"
                value={String(activeGoals)}
                detail={`of ${goals.length} total`}
              />
              <SummaryStat
                label="Milestones"
                value={`${doneMilestones}/${totalMilestones}`}
                detail={
                  totalMilestones
                    ? `${calculateGoalProgress(doneMilestones, totalMilestones)}% complete`
                    : "None added yet"
                }
              />
              <SummaryStat
                label="Avg. progress"
                value={
                  averageProgress === undefined ? "—" : `${averageProgress}%`
                }
                detail={
                  averageProgress === undefined
                    ? "No active goals"
                    : "Across active goals"
                }
              />
              <SummaryStat
                label="Next deadline"
                value={
                  nextDeadline
                    ? formatCalendarDate(nextDeadline.target_date!).replace(
                        /, \d{4}$/,
                        "",
                      )
                    : "—"
                }
                detail={
                  nextDeadline
                    ? daysToNextDeadline === 0
                      ? `Today · ${nextDeadline.title}`
                      : `${daysToNextDeadline}d · ${nextDeadline.title}`
                    : "No upcoming dates"
                }
              />
            </dl>
          ) : null
        }
      />
      <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
        {goals.length === 0 ? (
          <div className="border-border relative isolate grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-dashed px-6 py-12 text-center lg:col-span-2">
            <div>
              <span className="bg-muted/60 text-foreground/75 mx-auto grid size-12 place-items-center rounded-lg">
                <Goal className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-base font-semibold tracking-tight">
                Name the outcome you want.
              </p>
              <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm leading-6">
                A clear success definition makes daily tasks easier to choose.
                Use{" "}
                <span className="text-foreground font-medium">Create goal</span>{" "}
                above to start.
              </p>
            </div>
          </div>
        ) : (
          orderedGoals.map((goal) => {
            const milestones = milestonesByGoal.get(goal.id) ?? [];
            const completedMilestones = milestones.filter(
              (milestone) => milestone.completed_at,
            ).length;
            const nextMilestone = milestones.find(
              (milestone) => !milestone.completed_at,
            );
            const highlighted = highlightGoalId === goal.id;

            return (
              <Card
                key={goal.id}
                id={`goal-${goal.id}`}
                style={
                  {
                    "--goal-accent": goalAreaTheme(goal.area).accent,
                  } as CSSProperties
                }
                className={`relative rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)] transition duration-200 motion-reduce:transition-none dark:shadow-none [@media(hover:hover)]:hover:border-[color-mix(in_srgb,var(--goal-accent)_35%,var(--border))] ${
                  highlighted ? "ring-primary/60 ring-2" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-6">
                  <GoalCardHeader goal={goal} today={today} />
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
                      highlighted ? highlightMilestoneId : undefined
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
    </PageShell>
  );
}
