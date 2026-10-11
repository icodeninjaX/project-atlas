export function calculateGoalProgress(
  completedMilestones: number,
  totalMilestones: number,
) {
  if (totalMilestones === 0) return 0;
  return Math.round((completedMilestones / totalMilestones) * 100);
}

// Above this many milestones the segment track gets too dense to read.
const maxSegments = 12;

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
  const complete = totalMilestones > 0 && progressPercent === 100;
  const progressDescription =
    totalMilestones === 0
      ? "Add your first milestone to start tracking progress."
      : completedMilestones === totalMilestones
        ? "All milestones are complete."
        : `${completedMilestones} of ${totalMilestones} milestones completed`;

  return (
    <div className="bg-muted/40 mt-5 flex items-center gap-4 rounded-xl p-3.5 sm:gap-5 sm:p-4">
      <div
        role="progressbar"
        aria-label={`Progress for ${goalTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${progressPercent}% complete, ${progressDescription}`}
        className="relative size-16 shrink-0 sm:size-[4.5rem]"
      >
        <svg
          viewBox="0 0 36 36"
          aria-hidden="true"
          className="size-full -rotate-90"
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
            className="stroke-border"
          />
          {progressPercent > 0 ? (
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${progressPercent} 100`}
              className={`${complete ? "stroke-positive" : "stroke-primary"} transition-[stroke-dasharray] duration-200 ease-out motion-reduce:transition-none`}
            />
          ) : null}
        </svg>
        <span className="text-foreground absolute inset-0 grid place-items-center font-mono text-sm font-semibold tracking-tight tabular-nums sm:text-base">
          {progressPercent}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[0.6875rem] font-semibold">
          Progress
        </p>
        <p className="text-foreground mt-1 text-[0.8125rem] leading-5 font-medium">
          {progressDescription}
        </p>
        {totalMilestones > 0 && totalMilestones <= maxSegments ? (
          <div aria-hidden="true" className="mt-2 flex gap-1">
            {Array.from({ length: totalMilestones }, (_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index < completedMilestones
                    ? complete
                      ? "bg-positive"
                      : "bg-primary"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
        ) : null}
        {nextMilestoneTitle ? (
          <p className="text-muted-foreground mt-2 flex min-w-0 gap-1.5 text-xs leading-5">
            <span className="text-muted-foreground shrink-0 font-medium">
              Up next
            </span>
            <span className="sr-only">:</span>
            <span className="text-foreground/85 line-clamp-2">
              {nextMilestoneTitle}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
