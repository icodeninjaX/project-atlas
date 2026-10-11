import { ChevronRight, Scale } from "lucide-react";
import Link from "next/link";
import todayStyles from "@/components/dashboard/today.module.css";
import { DecisionCreateButton } from "@/components/decisions/decision-sheet";
import { reviewTones } from "@/components/decisions/decision-tone";
import {
  DecisionHeroShell,
  ReviewChip,
  eyebrowClass,
  tileClass,
} from "@/components/decisions/decision-visuals";
import styles from "@/components/decisions/decisions.module.css";
import { TonePill } from "@/components/money/money-hero";
import {
  journalSentence,
  journalStatus,
  reviewStatuses,
  shortDecisionDate,
  type JournalSummary,
  type ReviewStatus,
} from "@/lib/decisions/view";
import { cn } from "@/lib/utils";

const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
});

const monthLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const monthYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

function monthDate(month: string) {
  return new Date(`${month}-01T12:00:00Z`);
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

const statusWords: Record<ReviewStatus, string> = {
  ready: "Ready to review",
  waiting: "Waiting",
  reviewed: "Reviewed",
};

/** What to return to first: ready reviews, then the soonest upcoming. */
function UpNext({
  summary,
  todayIso,
}: {
  summary: JournalSummary;
  todayIso: string;
}) {
  return (
    <div className={cn(tileClass, "p-3.5 min-[360px]:p-4 sm:p-5")}>
      <h3 className={eyebrowClass}>Up next</h3>
      {summary.upNext.length ? (
        <>
          <ol className="mt-2.5 space-y-0.5">
            {summary.upNext.map(({ decision, review }) => (
              <li key={decision.id}>
                <Link
                  href={`/decisions/${decision.id}` as never}
                  className="group hover:bg-card/80 focus-visible:ring-ring -mx-2 flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-[0.4375rem] size-2 shrink-0 rounded-full",
                      reviewTones[review.status].dot,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-5 font-semibold break-words">
                      {decision.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <ReviewChip review={review} />
                      <span className="text-muted-foreground text-xs leading-4">
                        {review.status === "ready"
                          ? review.detail
                          : `Decided ${shortDecisionDate(decision.decision_on, todayIso)}`}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="text-muted-foreground group-hover:text-foreground mt-0.5 size-4 shrink-0 transition-colors"
                  />
                </Link>
              </li>
            ))}
          </ol>
          {summary.readyBeyond > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {summary.readyBeyond === 1
                ? "1 more is ready to review in your journal below."
                : `${summary.readyBeyond} more are ready to review in your journal below.`}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Nothing is waiting. Every decision has a note written since its review
          date.
        </p>
      )}
    </div>
  );
}

/** Decisions by review state as one bar, each state named beneath. */
function StateMix({ counts }: { counts: JournalSummary["counts"] }) {
  const filled = reviewStatuses.filter((status) => counts[status] > 0);
  return (
    <div className="min-w-0">
      <h3 className={cn(eyebrowClass, "mb-3")}>Where they stand</h3>
      <div
        aria-hidden="true"
        className="bg-muted/70 ring-border/60 flex h-2.5 overflow-hidden rounded-full ring-1"
      >
        {filled.length ? (
          <div className={cn("flex w-full gap-1", todayStyles.fill)}>
            {filled.map((status) => (
              <span
                key={status}
                style={{ flexGrow: counts[status] }}
                className={cn(
                  "h-full min-w-2 basis-0 rounded-full",
                  reviewTones[status].dot,
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ul
        aria-label="Decisions by review state"
        className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] gap-x-4 gap-y-2.5"
      >
        {reviewStatuses.map((status) => (
          <li
            key={status}
            className={cn(
              "flex min-w-0 items-center gap-2",
              counts[status] === 0 && "opacity-60",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                reviewTones[status].dot,
              )}
            />
            <span className="text-muted-foreground min-w-0 text-xs">
              {statusWords[status]}
            </span>
            <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
              {counts[status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Decisions recorded in each of the last six months. */
function MonthRhythm({
  months,
  todayIso,
}: {
  months: JournalSummary["months"];
  todayIso: string;
}) {
  const max = Math.max(1, ...months.map((month) => month.count));
  const thisMonth = todayIso.slice(0, 7);
  return (
    <div className="min-w-0">
      <h3 className={cn(eyebrowClass, "mb-3")}>Recorded per month</h3>
      <ol
        aria-label="Decisions recorded in the last six months"
        className="grid grid-cols-6 items-end gap-1.5 sm:gap-2.5"
      >
        {months.map((month) => {
          const current = month.month === thisMonth;
          return (
            <li
              key={month.month}
              className="flex min-w-0 flex-col items-center gap-1.5"
            >
              <span className="font-mono text-xs font-semibold tabular-nums">
                {month.count}
                <span className="sr-only">
                  {" "}
                  in {monthLong.format(monthDate(month.month))}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="border-border/70 flex h-12 w-full items-end border-b pb-px sm:h-14"
              >
                {month.count ? (
                  <span
                    style={{
                      height: `${Math.max(10, (month.count / max) * 100)}%`,
                    }}
                    className={cn(
                      "w-full rounded-t-[5px] rounded-b-[2px]",
                      current ? "bg-primary" : "bg-primary/35",
                      styles.rise,
                    )}
                  />
                ) : (
                  <span className="bg-muted h-[3px] w-full rounded-full" />
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono text-[0.6875rem]",
                  current
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {monthShort.format(monthDate(month.month))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The journal's lead: how many decisions, where each stands, what is next. */
export function DecisionsHero({
  summary,
  todayIso,
}: {
  summary: JournalSummary;
  todayIso: string;
}) {
  const status = journalStatus(summary);
  const sentence = journalSentence(summary.counts);
  const partial = summary.counted < summary.total;
  const facts = [
    !partial && summary.firstDecidedOn
      ? `Since ${monthYear.format(new Date(`${summary.firstDecidedOn}T12:00:00Z`))}`
      : null,
    plural(summary.notes, "note") + " written",
    `${summary.measured} with a recorded measure`,
  ].filter(Boolean);

  return (
    <DecisionHeroShell labelledBy="decisions-summary-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="decisions-summary-heading"
          className="text-muted-foreground text-[0.8125rem] font-medium"
        >
          Review loop
        </h2>
        <TonePill tone={status.tone}>{status.label}</TonePill>
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-9">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-foreground font-mono text-[clamp(2.5rem,10vw,3.25rem)] leading-[0.92] font-semibold tracking-[-0.03em]">
              {summary.total}
            </span>
            <span className="text-muted-foreground text-base font-medium">
              {summary.total === 1 ? "decision" : "decisions"}
            </span>
          </p>
          {sentence ? (
            <p className="mt-4 max-w-xl text-sm leading-6 font-medium sm:text-[0.9375rem]">
              {sentence}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5">
            {facts.join(" · ")}
          </p>
          {partial ? (
            <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5">
              The states count your {summary.counted.toLocaleString("en-PH")}{" "}
              most recent decisions.
            </p>
          ) : null}
        </div>

        <UpNext summary={summary} todayIso={todayIso} />
        <StateMix counts={summary.counts} />
        <MonthRhythm months={summary.months} todayIso={todayIso} />
      </div>
    </DecisionHeroShell>
  );
}

const steps: { title: string; body: string }[] = [
  {
    title: "Record",
    body: "the choice, what you will do, and what you expect to happen.",
  },
  {
    title: "Wait",
    body: "until the review date you pick.",
  },
  {
    title: "Review",
    body: "what actually happened. With a recorded measure, compare 14 days of records before and after.",
  },
];

/** The hero before anything is recorded: how the journal works. */
export function DecisionsEmptyHero({
  goals,
  today,
}: {
  goals: { id: string; title: string }[];
  today: string;
}) {
  return (
    <DecisionHeroShell labelledBy="decisions-summary-heading">
      <h2
        id="decisions-summary-heading"
        className="text-muted-foreground text-[0.8125rem] font-medium"
      >
        Your journal
      </h2>
      <div className="mt-5 flex max-w-2xl gap-3">
        <span className="bg-muted/60 text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg max-sm:hidden">
          <Scale aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-base leading-6 font-semibold">No decisions yet</p>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Record a choice you want to revisit, then check it on a date you
            pick.
          </p>
          <ol
            aria-label="How the journal works"
            className="text-muted-foreground mt-3 space-y-1 text-sm leading-6"
          >
            {steps.map((step) => (
              <li key={step.title}>
                <span className="text-foreground font-medium">
                  {step.title}
                </span>{" "}
                {step.body}
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <DecisionCreateButton goals={goals} today={today} />
          </div>
        </div>
      </div>
    </DecisionHeroShell>
  );
}
