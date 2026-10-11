import { CalendarClock, Check } from "lucide-react";
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
              "grid h-9 place-items-center rounded-lg text-[0.6875rem] font-semibold",
              index < dayIndex && "bg-muted text-foreground/80",
              index === dayIndex &&
                "bg-primary-solid text-primary-solid-foreground",
              index > dayIndex && "bg-muted/40 text-muted-foreground",
            )}
          >
            {initial}
          </li>
        ))}
      </ol>

      <div className="mt-5 flex min-w-0 items-start gap-2.5">
        {reviewComplete ? (
          <Check
            aria-hidden="true"
            className="text-positive mt-1 size-4 shrink-0"
            strokeWidth={2.5}
          />
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
          className="text-primary focus-visible:ring-ring -ml-1 inline-flex min-h-11 w-fit items-center rounded-md px-1 text-xs font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          Open weekly reviews
        </Link>
      </div>
    </section>
  );
}
