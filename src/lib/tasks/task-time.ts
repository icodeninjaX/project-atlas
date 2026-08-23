const TASK_TIME_PATTERN = /^(\d{2}):(\d{2})/;

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
