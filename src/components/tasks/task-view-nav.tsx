import Link from "next/link";
import { ScrollStrip } from "@/components/shared/scroll-strip";
import type { TaskView } from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";

const views: ReadonlyArray<{ value: TaskView; label: string }> = [
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "inbox", label: "Inbox" },
  { value: "completed", label: "Completed" },
];

/** Task views as tabs; each open view carries how many tasks it holds. */
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
      // `relative` keeps each tab's screen-reader count inside the strip;
      // otherwise those absolutely placed spans widen the whole page.
      className="relative mt-6 flex [scrollbar-width:none] gap-6 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [&::-webkit-scrollbar]:hidden"
    >
      {views.map(({ value, label }) => {
        const active = selected === value;
        const count = counts[value];
        const urgent = value === "overdue" && Boolean(count);
        return (
          <Link
            key={value}
            href={`/tasks?view=${value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring relative inline-flex min-h-11 shrink-0 items-center gap-2 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10",
              active
                ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {count ? (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "font-mono text-xs",
                    urgent ? "text-destructive" : "text-muted-foreground",
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
