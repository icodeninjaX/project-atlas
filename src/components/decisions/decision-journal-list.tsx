import {
  ArrowLeft,
  ArrowRight,
  ChartColumn,
  ChevronRight,
  Goal,
  NotebookPen,
  Target,
} from "lucide-react";
import Link from "next/link";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import {
  DateLeaf,
  FactChip,
  ReviewChip,
} from "@/components/decisions/decision-visuals";
import { formatCalendarDate } from "@/lib/dates/dates";
import { decisionMetricLabel, type Decision } from "@/lib/decisions/decision";
import { groupDecisionMonths, type DecisionReview } from "@/lib/decisions/view";
import { cn } from "@/lib/utils";

export type JournalEntry = {
  decision: Decision;
  review: DecisionReview;
  notes: number;
  goal: string | null;
};

const monthHeading = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const pillLinkClass =
  "bg-card/60 text-foreground ring-border/80 hover:bg-card focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold ring-1 backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9";

function DecisionRow({ entry }: { entry: JournalEntry }) {
  const { decision, review, notes, goal } = entry;
  return (
    <li className="group hover:bg-foreground/[0.025] relative transition-colors first:rounded-t-[inherit] last:rounded-b-[inherit]">
      <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 p-4 min-[360px]:px-5 sm:gap-x-4">
        <DateLeaf
          iso={decision.decision_on}
          highlight={review.status === "ready"}
          className="max-[339px]:hidden"
        />
        <div className="min-w-0 max-[339px]:col-span-2">
          <h4 className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words">
            {/* The title's link covers the whole row. */}
            <Link
              href={`/decisions/${decision.id}` as never}
              className="focus-visible:after:ring-ring after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset"
            >
              {decision.title}
            </Link>
          </h4>
          <p className="text-muted-foreground text-xs leading-5">
            Decided {formatCalendarDate(decision.decision_on)}
          </p>
          <p className="text-muted-foreground mt-1.5 flex min-w-0 gap-1.5 text-[0.8125rem] leading-5">
            <Target
              aria-hidden="true"
              className="text-primary mt-[0.1875rem] size-3.5 shrink-0"
            />
            <span className="line-clamp-2 min-w-0 break-words">
              <span className="sr-only">Expected outcome: </span>
              {decision.expected_outcome}
            </span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <ReviewChip review={review} />
            {decision.metric_key ? (
              <FactChip icon={ChartColumn}>
                {decisionMetricLabel(decision.metric_key)}
              </FactChip>
            ) : null}
            {notes > 0 ? (
              <FactChip icon={NotebookPen}>
                {notes === 1 ? "1 note" : `${notes} notes`}
              </FactChip>
            ) : null}
            {goal ? <FactChip icon={Goal}>{goal}</FactChip> : null}
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-foreground mt-1 size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </article>
    </li>
  );
}

/**
 * A page of the journal, newest first, in chapters by the month decided,
 * with links to newer and older pages.
 */
export function DecisionJournalList({
  entries,
  page,
  hasMore,
}: {
  entries: JournalEntry[];
  page: number;
  hasMore: boolean;
}) {
  const months = groupDecisionMonths(
    entries.map((entry) => ({
      ...entry,
      decision_on: entry.decision.decision_on,
    })),
  );
  return (
    <section aria-labelledby="past-decisions" className="mt-10 sm:mt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
        <h2
          id="past-decisions"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          Your decisions
        </h2>
        <p className="text-muted-foreground text-xs">
          {page > 1 ? `Page ${page} · newest first` : "Newest first"}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 grid place-items-center gap-3 rounded-[1.5rem] border border-dashed p-8 text-center">
          <p className="text-sm font-semibold">No decisions on page {page}</p>
          <Link href="/decisions" className={pillLinkClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to the newest
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-7">
          {months.map((month) => {
            const headingId = `decisions-${month.month}`;
            return (
              <section key={month.month} aria-labelledby={headingId}>
                <h3
                  id={headingId}
                  className="text-muted-foreground px-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase"
                >
                  {monthHeading.format(new Date(`${month.month}-01T12:00:00Z`))}
                </h3>
                <ul
                  className={cn(
                    surfaceClass,
                    "bg-card/90 divide-border/70 relative mt-2.5 divide-y overflow-hidden rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
                  )}
                >
                  {month.decisions.map((entry) => (
                    <DecisionRow key={entry.decision.id} entry={entry} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {page > 1 || hasMore ? (
        <nav
          aria-label="Decision pages"
          className="mt-8 flex flex-wrap items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={
                (page === 2
                  ? "/decisions"
                  : `/decisions?page=${page - 1}`) as never
              }
              className={pillLinkClass}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Newer decisions
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground font-mono text-xs">
            Page {page}
          </span>
          {hasMore ? (
            <Link
              href={`/decisions?page=${page + 1}` as never}
              className={pillLinkClass}
            >
              Older decisions
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
