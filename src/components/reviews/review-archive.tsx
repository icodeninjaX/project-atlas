"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Compass,
  Flame,
  LineChart,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import {
  HeroShell,
  ScoreMeter,
  ScoreRing,
  StatusPill,
  eyebrowClass,
  glassCardClass,
  promptMeta,
  scoreTones,
  tileClass,
  type ScoreKind,
} from "@/components/reviews/review-visuals";
import {
  compactReviewWeekLabel,
  manilaDateLabel,
  reviewWeekLabel,
} from "@/lib/dates/dates";
import {
  archiveSentence,
  archiveSummary,
  formatAverage,
  promptKeys,
  reviewHeadline,
  reviewSummary,
  type ArchiveSummary,
  type ReviewArchiveItem,
} from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

const ReviewTrend = dynamic(
  () =>
    import("@/components/reviews/review-trend").then(
      (module) => module.ReviewTrend,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/40 h-64 animate-pulse rounded-2xl" />
    ),
  },
);

const archiveEntryDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
});

const scoreKinds: ScoreKind[] = ["overall", "energy", "stress"];

function scoreOf(review: ReviewArchiveItem, kind: ScoreKind) {
  return kind === "energy"
    ? review.energyScore
    : kind === "stress"
      ? review.stressScore
      : review.overallScore;
}

function ArchiveHero({
  summary,
  streak,
}: {
  summary: ArchiveSummary;
  streak: string | null;
}) {
  const averages: Array<[ScoreKind, number | null]> = [
    ["overall", summary.averages.overall],
    ["energy", summary.averages.energy],
    ["stress", summary.averages.stress],
  ];
  return (
    <HeroShell labelledBy="archive-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="archive-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Your weeks, remembered
        </h2>
        {streak ? (
          <StatusPill tone="positive" icon={Flame}>
            {streak}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral">
            {summary.submitted} of {summary.weeks} submitted
          </StatusPill>
        )}
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-x-12">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
              {summary.weeks}
            </span>
            <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              {summary.weeks === 1 ? "week reflected" : "weeks reflected"}
            </span>
          </p>
          <p className="text-foreground mt-4 max-w-xl text-sm leading-6 font-semibold sm:text-[0.9375rem]">
            {archiveSentence(summary)}
          </p>
          <p className="text-muted-foreground mt-1.5 max-w-xl text-sm leading-6">
            Return to the honest parts—not only the scores—and notice how your
            focus, energy, and choices have changed.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3 @max-[18rem]:grid-cols-1">
          {averages.map(([kind, value]) => (
            <div key={kind} className={cn(tileClass, "p-3 sm:p-4")}>
              <dt className="text-muted-foreground flex items-center gap-1.5 text-xs leading-4 font-medium">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    scoreTones[kind].dot,
                  )}
                />
                <span className="min-w-0 truncate">
                  {scoreTones[kind].label}
                </span>
              </dt>
              <dd className="mt-2 text-2xl leading-none font-semibold tracking-[-0.03em] sm:text-[1.75rem]">
                {formatAverage(value)}
                <span className="sr-only"> average out of 10</span>
              </dd>
              <dd className="mt-3">
                <ScoreMeter
                  kind={kind}
                  score={value === null ? null : Math.round(value)}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </HeroShell>
  );
}

function WeekCard({
  review,
  selected,
  onSelect,
  buttonRef,
}: {
  review: ReviewArchiveItem;
  selected: boolean;
  onSelect: () => void;
  buttonRef: (button: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      id={`review-week-${review.id}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group focus-visible:ring-ring relative w-[min(80vw,18rem)] shrink-0 snap-center overflow-hidden rounded-2xl p-4 text-left ring-1 transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none xl:w-full",
        selected
          ? "bg-primary/[0.08] ring-primary/45 shadow-[0_14px_34px_-22px_var(--primary-solid)]"
          : "bg-card/80 ring-border/80 hover:bg-card hover:ring-primary/30",
      )}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-4 left-0 w-[3px] rounded-r-full"
        />
      ) : null}
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <time
              dateTime={review.weekStart}
              className="dark:text-primary font-mono text-[0.6875rem] font-semibold tracking-[0.12em] text-blue-700 uppercase"
            >
              {compactReviewWeekLabel(review.weekStart)}
            </time>
            {review.completedAt ? null : (
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                Draft
              </span>
            )}
          </span>
          <span className="mt-2 line-clamp-2 block text-sm leading-5 font-semibold tracking-[-0.01em]">
            {reviewHeadline(review)}
          </span>
        </span>
        <ScoreRing
          kind="overall"
          score={review.overallScore}
          className="size-10 shrink-0"
          figureClassName="text-[0.8125rem]"
        />
      </span>
      <span className="text-muted-foreground mt-2 line-clamp-2 block text-xs leading-5">
        {reviewSummary(review)}
      </span>
      <span className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem]">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", scoreTones.energy.dot)}
          />
          Energy {review.energyScore ?? "—"}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", scoreTones.stress.dot)}
          />
          Stress {review.stressScore ?? "—"}
        </span>
        {review.reflectedAt ? (
          <time
            dateTime={review.reflectedAt}
            className="ml-auto flex items-center gap-1"
          >
            <CalendarDays aria-hidden="true" className="size-3" />
            {archiveEntryDate.format(new Date(review.reflectedAt))}
          </time>
        ) : null}
      </span>
    </button>
  );
}

function JournalPage({
  review,
  position,
  total,
  onOlder,
  onNewer,
}: {
  review: ReviewArchiveItem;
  position: number;
  total: number;
  onOlder: () => void;
  onNewer: () => void;
}) {
  const focus = review.nextWeekFocus?.trim();
  // The chosen focus leads the page, so it is not repeated below.
  const shown = promptKeys.filter(
    (key) => key !== "nextWeekFocus" && review[key]?.trim(),
  );
  const blank = promptKeys.filter((key) => !review[key]?.trim());

  return (
    <article
      className={cn(glassCardClass, "overflow-hidden")}
      aria-live="polite"
      aria-label={`Review for ${reviewWeekLabel(review.weekStart)}`}
    >
      <header className="border-border/70 relative isolate border-b px-5 pt-6 pb-6 sm:px-8 sm:pt-8">
        <div
          aria-hidden="true"
          className="from-primary/[0.09] pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b to-transparent"
        />
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={review.weekStart}
            className="text-primary font-mono text-[0.6875rem] font-semibold tracking-[0.14em] uppercase"
          >
            {reviewWeekLabel(review.weekStart)}
          </time>
          <StatusPill tone={review.completedAt ? "positive" : "neutral"}>
            {review.completedAt ? "Completed" : "Draft"}
          </StatusPill>
        </div>
        {focus ? (
          <p className={cn(eyebrowClass, "mt-5 flex items-center gap-1.5")}>
            <Compass aria-hidden="true" className="text-primary size-3.5" />
            Chose to focus on
          </p>
        ) : null}
        <h2
          className={cn(
            "text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.035em] text-balance sm:text-[2rem]",
            focus ? "mt-2" : "mt-4",
          )}
        >
          {reviewHeadline(review)}
        </h2>
        {review.reflectedAt ? (
          <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            Latest reflection added
            <time
              dateTime={review.reflectedAt}
              className="text-foreground font-medium"
            >
              {manilaDateLabel(review.reflectedAt)}
            </time>
          </p>
        ) : null}

        <dl className="mt-6 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
          {scoreKinds.map((kind) => (
            <div
              key={kind}
              className={cn(
                tileClass,
                "flex flex-row-reverse items-center justify-end gap-2.5 p-2.5 sm:gap-3 sm:p-3",
              )}
            >
              <dt className="text-muted-foreground min-w-0 text-xs leading-4 font-medium">
                {scoreTones[kind].label}
              </dt>
              <dd className="shrink-0">
                <ScoreRing
                  kind={kind}
                  score={scoreOf(review, kind)}
                  className="size-10 sm:size-11"
                />
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {shown.length ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          {shown.map((key) => {
            const { icon: Icon, title } = promptMeta[key];
            return (
              <div key={key} className={cn(tileClass, "p-4 sm:p-5")}>
                <h3 className="text-muted-foreground flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
                  <span className="bg-primary/10 text-primary ring-primary/15 grid size-7 shrink-0 place-items-center rounded-lg ring-1">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </span>
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 break-words whitespace-pre-line">
                  {review[key]}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground px-5 py-6 text-sm sm:px-8">
          No written notes this week—only what the scores hold.
        </p>
      )}

      {blank.length ? (
        <p className="text-muted-foreground px-5 pb-5 text-xs leading-5 sm:px-8">
          <span className="text-foreground font-medium">Left blank:</span>{" "}
          {blank.map((key) => promptMeta[key].title).join(" · ")}
        </p>
      ) : null}

      <footer className="border-border/70 flex items-center justify-between gap-2 border-t px-3 py-2 sm:px-5">
        <button
          type="button"
          disabled={position === total}
          onClick={onOlder}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 sm:min-h-9"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Older
        </button>
        <p className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
          {position} of {total}
        </p>
        <button
          type="button"
          disabled={position === 1}
          onClick={onNewer}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 sm:min-h-9"
        >
          Newer
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </footer>
    </article>
  );
}

function RhythmTable({ reviews }: { reviews: ReviewArchiveItem[] }) {
  return (
    <details className="group mt-4">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 [&::-webkit-details-marker]:hidden">
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        View scores as a table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-xs">
          <caption className="sr-only">Weekly scores out of 10</caption>
          <thead className="text-muted-foreground">
            <tr className="border-border/70 border-b">
              <th scope="col" className="py-2 pr-3 font-medium">
                Week
              </th>
              {scoreKinds.map((kind) => (
                <th
                  key={kind}
                  scope="col"
                  className="py-2 pr-3 text-right font-medium"
                >
                  {scoreTones[kind].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-border/50 border-b">
                <th scope="row" className="py-2 pr-3 font-medium">
                  {compactReviewWeekLabel(review.weekStart)}
                </th>
                {scoreKinds.map((kind) => (
                  <td
                    key={kind}
                    className="py-2 pr-3 text-right font-mono tabular-nums"
                  >
                    {scoreOf(review, kind) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ArchiveEmpty() {
  return (
    <HeroShell labelledBy="archive-empty-heading">
      <div className="flex max-w-2xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-sm:hidden">
          <BookOpenCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="archive-empty-heading"
            className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]"
          >
            Your reflection archive starts here
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Submit this week’s review and it becomes the first page here. Each
            week keeps your notes, your scores, and the one direction you chose
            for the week after.
          </p>
        </div>
      </div>
      <ol
        aria-label="What each page keeps"
        className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3"
      >
        {promptKeys.map((key, index) => {
          const { icon: Icon, title } = promptMeta[key];
          return (
            <li
              key={key}
              className={cn(
                tileClass,
                "flex min-w-0 items-center gap-2.5 px-3 py-2.5",
              )}
            >
              <Icon
                aria-hidden="true"
                className="text-primary size-4 shrink-0"
              />
              <span className="min-w-0 text-xs font-medium">
                <span className="text-muted-foreground mr-1 font-mono">
                  {index + 1}
                </span>
                {title}
              </span>
            </li>
          );
        })}
      </ol>
    </HeroShell>
  );
}

export function ReviewArchive({
  reviews,
  active,
  selectedId,
  onSelect,
  streak = null,
}: {
  /** Newest first. */
  reviews: ReviewArchiveItem[];
  active: boolean;
  selectedId: string | null;
  onSelect: (reviewId: string) => void;
  streak?: string | null;
}) {
  const found = reviews.findIndex((review) => review.id === selectedId);
  const selectedIndex = found >= 0 ? found : 0;
  const selected = reviews[selectedIndex];
  const weekButtons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const button = weekButtons.current[selectedIndex];
    if (typeof button?.scrollIntoView === "function") {
      button.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [selectedIndex]);

  if (!selected) return <ArchiveEmpty />;

  const summary = archiveSummary(reviews);
  const trend = [...reviews].reverse().map((review) => ({
    id: review.id,
    label: compactReviewWeekLabel(review.weekStart),
    energy: review.energyScore,
    stress: review.stressScore,
    overall: review.overallScore,
  }));
  const select = (index: number) => {
    const review = reviews[index];
    if (review) onSelect(review.id);
  };

  return (
    <div>
      <ArchiveHero summary={summary} streak={streak} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
        <aside className="min-w-0" aria-labelledby="past-weeks-heading">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className={eyebrowClass}>Past weeks</p>
              <h2
                id="past-weeks-heading"
                className="mt-1 text-base font-semibold tracking-[-0.01em]"
              >
                Choose a reflection
              </h2>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 text-[0.6875rem] xl:hidden">
              Swipe
              <ArrowRight aria-hidden="true" className="size-3" />
            </p>
          </div>

          <div className="-mx-4 mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:flex-col xl:gap-2.5 xl:overflow-visible xl:px-0 [&::-webkit-scrollbar]:hidden">
            {reviews.map((review, index) => (
              <WeekCard
                key={review.id}
                review={review}
                selected={index === selectedIndex}
                onSelect={() => select(index)}
                buttonRef={(button) => {
                  weekButtons.current[index] = button;
                }}
              />
            ))}
          </div>
        </aside>

        <JournalPage
          review={selected}
          position={selectedIndex + 1}
          total={reviews.length}
          onOlder={() => select(selectedIndex + 1)}
          onNewer={() => select(selectedIndex - 1)}
        />
      </div>

      {active && trend.length > 1 ? (
        <section
          data-spotlight
          className={cn(glassCardClass, "mt-6 p-5 sm:p-6")}
          aria-labelledby="archive-trend-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[16rem]:hidden">
                <LineChart aria-hidden="true" className="size-[1.125rem]" />
              </span>
              <div className="min-w-0">
                <h2
                  id="archive-trend-heading"
                  className="text-base font-semibold tracking-[-0.01em]"
                >
                  Your review rhythm
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                  Scores add context; your words carry the meaning. Select a
                  week on the chart to open it.
                </p>
              </div>
            </div>
            <ul
              aria-label="Chart legend"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
            >
              {scoreKinds.map((kind) => (
                <li key={kind} className="flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="4"
                    className={scoreTones[kind].stroke}
                  >
                    <line
                      x1="1"
                      y1="2"
                      x2="17"
                      y2="2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={kind === "stress" ? "4 3" : undefined}
                    />
                  </svg>
                  {scoreTones[kind].label}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <ReviewTrend
              data={trend}
              selectedId={selected.id}
              onSelect={onSelect}
            />
          </div>
          <RhythmTable reviews={reviews} />
        </section>
      ) : null}
    </div>
  );
}
