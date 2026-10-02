import { ArrowRight, CalendarClock, Check } from "lucide-react";
import Link from "next/link";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/** Where today sits in the review week, and whether the week is reviewed. */
export function WeekPosition({
  dayIndex,
  reviewComplete,
  className,
}: {
  /** 0 for Monday through 6 for Sunday. */
  dayIndex: number;
  reviewComplete: boolean;
  className?: string;
}) {
  const daysLeft = 6 - dayIndex;

  return (
    <section
      aria-labelledby="week-position"
      className={cn(dashboardCardClass, "flex flex-col", className)}
    >
      <DashboardCardHeading
        id="week-position"
        icon={CalendarClock}
        title="Week position"
        description={`Day ${dayIndex + 1} of 7`}
      />

      <ol aria-hidden="true" className="mt-5 grid grid-cols-7 gap-1.5">
        {DAY_INITIALS.map((initial, index) => (
          <li
            key={index}
            className={cn(
              "grid h-9 place-items-center rounded-lg text-[11px] font-semibold",
              index < dayIndex && "bg-primary/15 text-primary",
              index === dayIndex &&
                "bg-primary-solid text-primary-solid-foreground shadow-[0_6px_16px_-8px_var(--primary-solid)]",
              index > dayIndex && "bg-muted/70 text-muted-foreground",
            )}
          >
            {initial}
          </li>
        ))}
      </ol>

      <div className="mt-5 flex min-w-0 items-start gap-2.5">
        {reviewComplete ? (
          <span className="bg-positive/12 text-positive mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-base leading-6 font-semibold">
            {reviewComplete
              ? "This week is reviewed"
              : "Review when the week closes"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {reviewComplete
              ? "The facts stay beside your reflection, without interrupting today."
              : daysLeft === 0
                ? "The week closes today."
                : `It closes on Sunday, in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <Link
          href="/reviews"
          className="text-primary hover:bg-primary/10 focus-visible:ring-ring -ml-3 inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          Open weekly reviews{" "}
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>
    </section>
  );
}
