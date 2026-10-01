import {
  AlarmClock,
  CalendarDays,
  CircleCheck,
  Inbox,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ScrollStrip } from "@/components/shared/scroll-strip";
import type { TaskView } from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";

const views: ReadonlyArray<{
  value: TaskView;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "today", label: "Today", icon: Sun },
  { value: "overdue", label: "Overdue", icon: AlarmClock },
  { value: "upcoming", label: "Upcoming", icon: CalendarDays },
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "completed", label: "Completed", icon: CircleCheck },
];

/** Task views as pills; each open view carries how many tasks it holds. */
export function TaskViewNav({
  selected,
  counts,
}: {
  selected: TaskView;
  counts: Partial<Record<TaskView, number>>;
}) {
  return (
    <ScrollStrip
      aria-label="Task views"
      activeKey={selected}
      // `relative` keeps each pill's screen-reader count inside the strip;
      // otherwise those absolutely placed spans widen the whole page.
      className="border-border bg-muted/50 relative mt-5 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-full border p-1 sm:mt-6 [&::-webkit-scrollbar]:hidden"
    >
      {views.map(({ value, label, icon: Icon }) => {
        const active = selected === value;
        const count = counts[value];
        const urgent = value === "overdue" && Boolean(count);
        return (
          <Link
            key={value}
            href={`/tasks?view=${value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10",
              active
                ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0",
                active && (urgent ? "text-destructive" : "text-primary"),
              )}
            />
            {label}
            {count ? (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none font-semibold",
                    urgent
                      ? "bg-destructive text-white dark:bg-red-500/20 dark:text-red-300"
                      : active
                        ? "bg-primary/12 text-primary"
                        : "bg-foreground/[0.07] text-muted-foreground",
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
                <span className="sr-only">
                  , {count} {count === 1 ? "task" : "tasks"}
                </span>
              </>
            ) : null}
          </Link>
        );
      })}
    </ScrollStrip>
  );
}
