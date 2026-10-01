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

/**
 * The completion circle's ring, its hover wash, and the priority label in a
 * task row. Rings use the 600 shade on light surfaces and the 400 shade on
 * dark ones so each keeps at least 3:1 against the card. Low priority stays
 * neutral: a green ring would read as already done. Rings are drawn with
 * `ring-*` (a box shadow) because the global `* { border-color }` rule in
 * globals.css overrides `border-*` color utilities.
 */
const taskPriorityTones = {
  low: {
    ring: "ring-slate-500",
    wash: "group-hover/check:bg-slate-500/10",
    text: "text-muted-foreground",
  },
  medium: {
    ring: "ring-amber-600 dark:ring-amber-400",
    wash: "group-hover/check:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
  },
  high: {
    ring: "ring-orange-600 dark:ring-orange-400",
    wash: "group-hover/check:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-300",
  },
  critical: {
    ring: "ring-red-600 dark:ring-red-400",
    wash: "group-hover/check:bg-red-500/15",
    text: "text-red-700 dark:text-red-300",
  },
} as const satisfies Record<
  TaskPriority,
  { ring: string; wash: string; text: string }
>;

export function getTaskPriorityTone(priority: string) {
  const normalizedPriority = priority.toLowerCase() as TaskPriority;

  return taskPriorityTones[normalizedPriority] ?? taskPriorityTones.low;
}
