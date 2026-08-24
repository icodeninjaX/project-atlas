"use client";

import { CalendarClock, Clock3 } from "lucide-react";
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
    <div
      className={cn(
        "border-primary/25 bg-card overflow-hidden rounded-2xl border shadow-[0_12px_32px_-24px_rgba(40,103,232,0.7)]",
        className,
      )}
    >
      <div className="bg-primary/[0.06] border-primary/15 flex items-start justify-between gap-3 border-b px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
            <CalendarClock className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase">
              Schedule conflict
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
        <span className="border-primary/20 bg-background text-primary shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold">
          {formatTaskTime(scheduledTime)}
        </span>
      </div>

      {availability.recommendations.length > 0 ? (
        <div className="px-3.5 py-3.5 sm:px-4 sm:py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Available times</p>
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-4">
                Nearest openings that fit this task.
              </p>
            </div>
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium">
              {availability.durationMinutes} min
            </span>
          </div>
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
                className="hover:border-primary/35 hover:bg-primary/10 min-w-[7.75rem] snap-start justify-start gap-2.5 px-3 sm:min-w-0"
              >
                <Clock3
                  className="text-primary size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{formatTaskTime(time)}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-3.5 sm:px-4 sm:py-4">
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
