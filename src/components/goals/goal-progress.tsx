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
}: {
  goalTitle: string;
  completedMilestones: number;
  totalMilestones: number;
}) {
  const progressPercent = calculateGoalProgress(
    completedMilestones,
    totalMilestones,
  );
  const progressDescription = totalMilestones
    ? `${completedMilestones} of ${totalMilestones} milestones completed`
    : "Add your first milestone to start tracking progress.";

  return (
    <div className="mt-5">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Progress
        </span>
        <span className="text-muted-foreground font-mono text-[10px]">
          {totalMilestones
            ? `${completedMilestones} / ${totalMilestones} milestones`
            : "No milestones yet"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progress for ${goalTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${progressPercent}% complete — ${progressDescription}`}
        className="bg-muted relative h-10 overflow-hidden rounded-xl shadow-inner"
      >
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-0 left-0 rounded-xl transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 flex -translate-x-1/2 items-center transition-[left] duration-300 ease-out motion-reduce:transition-none"
          style={{
            left: `clamp(1.75rem, ${progressPercent}%, calc(100% - 1.75rem))`,
          }}
        >
          <span className="bg-background/90 text-primary border-primary/15 min-w-11 rounded-full border px-2 py-1 text-center font-mono text-xs font-bold shadow-sm backdrop-blur-sm">
            {progressPercent}%
          </span>
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {progressDescription}
      </p>
    </div>
  );
}
