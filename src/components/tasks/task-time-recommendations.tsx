"use client";

import { CalendarClock } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_SCHEDULED_TASKS,
  formatTaskTime,
  getTaskTimeAvailability,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";
import { cn } from "@/lib/utils";

export function TaskTimeRecommendations({
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  scheduledFor,
  scheduledTime,
  estimatedMinutes,
  excludeTaskId,
  onSelectTime,
  className,
}: {
  scheduledTasks?: ScheduledTaskSlot[];
  scheduledFor: string;
  scheduledTime: string;
  estimatedMinutes: number | null;
  excludeTaskId?: string;
  onSelectTime: (time: string) => void;
  className?: string;
}) {
  const availability = useMemo(
    () =>
      getTaskTimeAvailability({
        scheduledTasks,
        scheduledFor,
        scheduledTime,
        estimatedMinutes,
        excludeTaskId,
      }),
    [
      estimatedMinutes,
      excludeTaskId,
      scheduledFor,
      scheduledTasks,
      scheduledTime,
    ],
  );

  if (availability.conflicts.length === 0) return null;

  const conflictingTitles = availability.conflicts
    .slice(0, 2)
    .map((task) => `“${task.title}”`)
    .join(" and ");
  const extraConflictCount = availability.conflicts.length - 2;

  return (
    <div className={cn("bg-muted/40 rounded-xl p-3.5 sm:p-4", className)}>
      <div className="flex items-start gap-2.5">
        <CalendarClock
          className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <span className="text-amber-700 dark:text-amber-300">
              Schedule conflict
            </span>{" "}
            <span className="text-muted-foreground font-mono text-xs font-medium">
              · {formatTaskTime(scheduledTime)}
            </span>
          </p>
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground mt-0.5 text-xs leading-5"
          >
            <span className="sr-only">{formatTaskTime(scheduledTime)}</span>{" "}
            Overlaps {conflictingTitles}
            {extraConflictCount > 0
              ? ` and ${extraConflictCount} more task${extraConflictCount === 1 ? "" : "s"}`
              : ""}
            .
          </p>
        </div>
      </div>

      {availability.recommendations.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">Available times</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            Nearest openings that fit this task ·{" "}
            <span className="font-mono">
              {availability.durationMinutes} min
            </span>
          </p>
          <div
            className="-mx-3.5 mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 md:grid-cols-4 [&::-webkit-scrollbar]:hidden"
            aria-label="Recommended available times"
          >
            {availability.recommendations.map((time) => (
              <Button
                key={time}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSelectTime(time)}
                aria-label={`Use ${formatTaskTime(time)}`}
                className="min-w-[6.5rem] snap-start font-mono sm:min-w-0"
              >
                {formatTaskTime(time)}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm font-semibold">No open slot found</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            No other {availability.durationMinutes}-minute opening fits on this
            day. Try a different date or shorten the estimate.
          </p>
        </div>
      )}
    </div>
  );
}
