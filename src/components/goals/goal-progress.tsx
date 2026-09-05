export function calculateGoalProgress(
  completedMilestones: number,
  totalMilestones: number,
) {
  if (totalMilestones === 0) return 0;
  return Math.round((completedMilestones / totalMilestones) * 100);
}

export function GoalProgress({
  goalTitle,
  completedMilestones,
  totalMilestones,
  nextMilestoneTitle,
}: {
  goalTitle: string;
  completedMilestones: number;
  totalMilestones: number;
  nextMilestoneTitle?: string;
}) {
  const progressPercent = calculateGoalProgress(
    completedMilestones,
    totalMilestones,
  );
  const progressDescription =
    totalMilestones === 0
      ? "Add your first milestone to start tracking progress."
      : completedMilestones === totalMilestones
        ? "All milestones are complete."
        : `${completedMilestones} of ${totalMilestones} milestones completed`;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Progress
        </span>
        <span className="text-primary font-mono text-xs font-semibold">
          {progressPercent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progress for ${goalTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${progressPercent}% complete — ${progressDescription}`}
        className="bg-muted relative h-2 overflow-hidden rounded-full"
      >
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {progressDescription}
      </p>
      {nextMilestoneTitle ? (
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          <span className="text-foreground font-semibold">Next:</span>{" "}
          {nextMilestoneTitle}
        </p>
      ) : null}
    </div>
  );
}
