const taskPriorityBadgeClasses = {
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium:
    "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300",
} as const;

type TaskPriority = keyof typeof taskPriorityBadgeClasses;

export function getTaskPriorityBadgeClass(priority: string) {
  const normalizedPriority = priority.toLowerCase() as TaskPriority;

  return (
    taskPriorityBadgeClasses[normalizedPriority] ??
    "border-border bg-muted/60 text-muted-foreground"
  );
}
