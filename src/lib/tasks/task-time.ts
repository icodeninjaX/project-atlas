const TASK_TIME_PATTERN = /^(\d{2}):(\d{2})/;
const MINUTES_PER_DAY = 24 * 60;
const RECOMMENDATION_STEP_MINUTES = 30;

export const DEFAULT_TASK_DURATION_MINUTES = 30;

export type ScheduledTaskSlot = {
  id: string;
  title: string;
  scheduled_for: string | null;
  scheduled_time: string | null;
  estimated_minutes: number | null;
};

export const EMPTY_SCHEDULED_TASKS: ScheduledTaskSlot[] = [];

export type TaskTimeAvailability = {
  conflicts: ScheduledTaskSlot[];
  recommendations: string[];
  durationMinutes: number;
};

function timeToMinutes(value: string | null): number | null {
  const match = value?.match(TASK_TIME_PATTERN);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function minutesToTaskTime(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function taskDuration(value: number | null | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_TASK_DURATION_MINUTES;
  }
  return Math.min(Math.floor(value), MINUTES_PER_DAY);
}

function intervalsOverlap(
  firstStart: number,
  firstDuration: number,
  secondStart: number,
  secondDuration: number,
) {
  return (
    firstStart < secondStart + secondDuration &&
    secondStart < firstStart + firstDuration
  );
}

export function getTaskTimeAvailability({
  scheduledTasks,
  scheduledFor,
  scheduledTime,
  estimatedMinutes,
  excludeTaskId,
  recommendationCount = 4,
}: {
  scheduledTasks: ScheduledTaskSlot[];
  scheduledFor: string;
  scheduledTime: string;
  estimatedMinutes: number | null;
  excludeTaskId?: string;
  recommendationCount?: number;
}): TaskTimeAvailability {
  const durationMinutes = taskDuration(estimatedMinutes);
  const requestedStart = timeToMinutes(scheduledTime);
  if (!scheduledFor || requestedStart === null) {
    return { conflicts: [], recommendations: [], durationMinutes };
  }

  const tasksForDay = scheduledTasks.filter(
    (task) =>
      task.id !== excludeTaskId &&
      task.scheduled_for === scheduledFor &&
      timeToMinutes(task.scheduled_time) !== null,
  );
  const conflicts = tasksForDay.filter((task) => {
    const taskStart = timeToMinutes(task.scheduled_time);
    return (
      taskStart !== null &&
      intervalsOverlap(
        requestedStart,
        durationMinutes,
        taskStart,
        taskDuration(task.estimated_minutes),
      )
    );
  });

  if (conflicts.length === 0) {
    return { conflicts, recommendations: [], durationMinutes };
  }

  const latestStart = MINUTES_PER_DAY - durationMinutes;
  const candidateStarts = new Set<number>();
  for (
    let candidate = 0;
    candidate <= latestStart;
    candidate += RECOMMENDATION_STEP_MINUTES
  ) {
    candidateStarts.add(candidate);
  }
  for (const task of tasksForDay) {
    const taskStart = timeToMinutes(task.scheduled_time);
    if (taskStart === null) continue;
    const taskEnd = taskStart + taskDuration(task.estimated_minutes);
    if (taskEnd <= latestStart) candidateStarts.add(taskEnd);
    const startBeforeTask = taskStart - durationMinutes;
    if (startBeforeTask >= 0) candidateStarts.add(startBeforeTask);
  }

  const availableStarts: number[] = [];
  for (const candidate of candidateStarts) {
    const available = tasksForDay.every((task) => {
      const taskStart = timeToMinutes(task.scheduled_time);
      return (
        taskStart === null ||
        !intervalsOverlap(
          candidate,
          durationMinutes,
          taskStart,
          taskDuration(task.estimated_minutes),
        )
      );
    });
    if (available) availableStarts.push(candidate);
  }

  availableStarts.sort((first, second) => {
    const firstDistance = Math.abs(first - requestedStart);
    const secondDistance = Math.abs(second - requestedStart);
    if (firstDistance !== secondDistance) return firstDistance - secondDistance;

    const firstIsLater = first >= requestedStart;
    const secondIsLater = second >= requestedStart;
    if (firstIsLater !== secondIsLater) return firstIsLater ? -1 : 1;
    return first - second;
  });

  return {
    conflicts,
    recommendations: availableStarts
      .slice(0, Math.max(0, recommendationCount))
      .map(minutesToTaskTime),
    durationMinutes,
  };
}

export function taskTimeInputValue(value: string | null): string {
  const match = value?.match(TASK_TIME_PATTERN);
  return match ? `${match[1]}:${match[2]}` : "";
}

export function formatTaskTime(value: string): string {
  const match = value.match(TASK_TIME_PATTERN);
  if (!match) return value;

  const hour = Number(match[1]);
  const minute = match[2];
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}
