export const taskReminderLookbackMinutes = 10;

export type ScheduledTaskReminder = {
  id: string;
  user_id: string;
  title: string;
  scheduled_for: string;
  scheduled_time: string;
  estimated_minutes: number | null;
};

export function manilaClock(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function taskScheduledAt(task: ScheduledTaskReminder) {
  const time = task.scheduled_time.slice(0, 8);
  return new Date(`${task.scheduled_for}T${time}+08:00`);
}

export function isTaskReminderDue(
  task: ScheduledTaskReminder,
  now: Date,
  lookbackMinutes = taskReminderLookbackMinutes,
) {
  const scheduledAt = taskScheduledAt(task).getTime();
  const nowTime = now.getTime();
  const windowStart = nowTime - lookbackMinutes * 60_000;
  return scheduledAt >= windowStart && scheduledAt <= nowTime;
}

export function taskReminderDeliveryKey(task: ScheduledTaskReminder) {
  return `task:${task.id}:${task.scheduled_for}:${task.scheduled_time}`;
}

export function buildTaskReminderPayload(task: ScheduledTaskReminder) {
  return {
    title: "Time to focus",
    body: task.estimated_minutes
      ? `${task.title} · ${task.estimated_minutes} min`
      : task.title,
    url: "/tasks?view=today",
    tag: `atlas-task-${task.id}`,
  };
}
