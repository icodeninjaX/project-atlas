import { AlarmClock, CalendarClock } from "lucide-react";
import type { DueChip as DueChipValue } from "@/lib/career/view";
import { cn } from "@/lib/utils";

// Deeper text than the theme accents: chips often sit on tinted panels.
const tones: Record<Exclude<DueChipValue["tone"], "later">, string> = {
  overdue:
    "bg-destructive/10 text-red-700 ring-destructive/25 dark:text-red-300",
  today: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  soon: "bg-primary/10 text-blue-700 ring-primary/20 dark:text-blue-300",
};

/**
 * When a next action is due: a chip while it is overdue or within a week,
 * with the date beside it; plain text when it is further out.
 */
export function DueChip({
  due,
  showDate = true,
  className,
}: {
  due: DueChipValue;
  showDate?: boolean;
  className?: string;
}) {
  const Icon = due.tone === "overdue" ? AlarmClock : CalendarClock;
  // A date more than a week out is not a status, just a date.
  if (due.tone === "later") {
    return (
      <span
        className={cn(
          "text-muted-foreground inline-flex max-w-full min-w-0 items-center gap-1 font-mono text-xs",
          className,
        )}
      >
        <CalendarClock aria-hidden="true" className="size-3 shrink-0" />
        <span className="truncate">{due.label}</span>
      </span>
    );
  }
  const dateShown = showDate;
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold ring-1",
          tones[due.tone],
        )}
      >
        <Icon aria-hidden="true" className="size-3 shrink-0" />
        {due.label}
      </span>
      {dateShown ? (
        <span className="text-muted-foreground truncate font-mono">
          {due.date}
        </span>
      ) : null}
    </span>
  );
}
