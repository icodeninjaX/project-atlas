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
    <div className="border-border/60 bg-muted/40 mt-5 rounded-xl border p-3.5">
      <div className="flex items-end justify-between gap-3">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
          Progress
        </span>
        <span className="text-foreground font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums">
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
        className="bg-border/70 relative mt-3 h-2 overflow-hidden rounded-full shadow-inner"
      >
        <span
          aria-hidden="true"
          className="from-primary absolute inset-y-0 left-0 rounded-full bg-gradient-to-r to-cyan-400 shadow-[0_0_12px_-2px] shadow-cyan-400/60 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2.5 text-xs">
        {progressDescription}
      </p>
      {nextMilestoneTitle ? (
        <p className="text-muted-foreground border-border/60 mt-2.5 flex gap-1.5 border-t pt-2.5 text-xs leading-5">
          <span className="text-primary font-semibold">Next</span>
          <span className="sr-only">:</span>
          <span className="text-foreground/90">{nextMilestoneTitle}</span>
        </p>
      ) : null}
    </div>
  );
}
