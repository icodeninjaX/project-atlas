import Link from "next/link";
import { cardClass } from "@/components/history/history-chrome";
import type { MetricGrain } from "@/lib/history/metrics";
import {
  historyGrains,
  historyHref,
  historyLookbacks,
  type HistoryLookback,
} from "@/lib/history/view";
import { cn } from "@/lib/utils";

const stripClass = "bg-muted/60 flex min-w-0 gap-1 rounded-xl p-1";

const pillClass =
  "focus-visible:ring-ring inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8 sm:flex-none sm:px-3.5";

function pillState(active: boolean) {
  return active
    ? "bg-background text-foreground shadow-sm"
    : "text-muted-foreground hover:text-foreground";
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
        className="text-muted-foreground px-1 text-xs font-semibold sm:px-0"
      >
        {label}
      </p>
      <ul className={stripClass}>{children}</ul>
    </nav>
  );
}

/**
 * Grouping and lookback as one bar of links, so each applies in one tap and
 * the address always says what is in view.
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
        cardClass,
        "mt-6 flex flex-col gap-3 p-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:p-3.5 sm:pl-5",
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
