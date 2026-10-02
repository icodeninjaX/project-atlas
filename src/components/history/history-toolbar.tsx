import Link from "next/link";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import type { MetricGrain } from "@/lib/history/metrics";
import {
  historyGrains,
  historyHref,
  historyLookbacks,
  type HistoryLookback,
} from "@/lib/history/view";
import { cn } from "@/lib/utils";

const stripClass =
  "bg-muted/50 ring-border/80 flex min-w-0 gap-1 rounded-full p-1 ring-1";

const pillClass =
  "focus-visible:ring-ring inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8 sm:flex-none sm:px-3.5";

function pillState(active: boolean) {
  return active
    ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)] dark:bg-white/[0.11]"
    : "text-muted-foreground hover:bg-card/60 hover:text-foreground";
}

const grainLabels: Record<MetricGrain, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** "1M" on phones, "1 month" from `sm`. */
function LookbackLabel({ months }: { months: HistoryLookback }) {
  return (
    <>
      <span className="sm:hidden">{months}M</span>
      <span className="max-sm:hidden">
        {months} {months === 1 ? "month" : "months"}
      </span>
    </>
  );
}

function Strip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
    >
      <p
        aria-hidden="true"
        className="text-muted-foreground px-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase sm:px-0"
      >
        {label}
      </p>
      <ul className={stripClass}>{children}</ul>
    </nav>
  );
}

/**
 * Grouping and lookback as one glass bar of links, so each applies in one
 * tap and the address always says what is in view.
 */
export function HistoryToolbar({
  grain,
  months,
}: {
  grain: MetricGrain;
  months: HistoryLookback;
}) {
  return (
    <div
      className={cn(
        surfaceClass,
        "bg-card/85 relative mt-6 flex flex-col gap-3 rounded-[1.5rem] p-3 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] backdrop-blur sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:p-3.5 sm:pl-5",
      )}
    >
      <Strip label="Group by">
        {historyGrains.map((item) => {
          const current = item === grain;
          return (
            <li key={item} className="flex min-w-0 flex-1 sm:flex-none">
              <Link
                href={historyHref({ grain: item, months }) as never}
                aria-current={current ? "page" : undefined}
                className={cn(pillClass, pillState(current))}
              >
                {grainLabels[item]}
              </Link>
            </li>
          );
        })}
      </Strip>
      <Strip label="Look back">
        {grain === "day" ? (
          <li className="flex min-w-0 flex-1 sm:flex-none">
            <span
              aria-current="page"
              className={cn(pillClass, pillState(true), "cursor-default")}
            >
              30 days
            </span>
          </li>
        ) : (
          historyLookbacks.map((item) => {
            const current = item === months;
            return (
              <li key={item} className="flex min-w-0 flex-1 sm:flex-none">
                <Link
                  href={historyHref({ grain, months: item }) as never}
                  aria-current={current ? "page" : undefined}
                  title={`Last ${item === 1 ? "month" : `${item} months`}`}
                  className={cn(pillClass, pillState(current))}
                >
                  <LookbackLabel months={item} />
                </Link>
              </li>
            );
          })
        )}
      </Strip>
    </div>
  );
}
