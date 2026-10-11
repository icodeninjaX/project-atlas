"use client";

import { BookOpenCheck, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import {
  HeroShell,
  ReviewSection,
  ScoreFigure,
  StatusPill,
  glassCardClass,
  promptMeta,
  scoreTones,
  type ScoreKind,
} from "@/components/reviews/review-visuals";
import { Disclosure } from "@/components/shared/disclosure";
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
  return (
    <HeroShell labelledBy="archive-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="archive-heading"
          className="text-muted-foreground text-[0.8125rem] font-medium"
        >
          Past reviews
        </h2>
        <p className="text-muted-foreground text-xs">
          {streak ?? `${summary.submitted} of ${summary.weeks} submitted`}
        </p>
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-foreground text-[clamp(2.25rem,9vw,3rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
          {summary.weeks}
        </span>
        <span className="text-muted-foreground text-base font-medium">
          {summary.weeks === 1 ? "week reflected" : "weeks reflected"}
        </span>
      </p>
      <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
        {archiveSentence(summary)}
      </p>

      <dl className="border-border/70 [&>div+div]:border-border/70 mt-6 grid grid-cols-3 border-t pt-5 sm:max-w-md [&>div+div]:border-l [&>div+div]:pl-4 sm:[&>div+div]:pl-5">
        {scoreKinds.map((kind) => (
          <div key={kind} className="min-w-0">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  scoreTones[kind].dot,
                )}
              />
              <span className="min-w-0 truncate">{scoreTones[kind].label}</span>
            </dt>
            <dd className="mt-1 font-mono text-lg leading-tight font-semibold tracking-[-0.03em] tabular-nums">
              {formatAverage(summary.averages[kind])}
              <span className="sr-only"> average out of 10</span>
            </dd>
          </div>
        ))}
      </dl>
    </HeroShell>
  );
}

function WeekRow({
  review,
  selected,
  onSelect,
}: {
  review: ReviewArchiveItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        id={`review-week-${review.id}`}
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "focus-visible:ring-ring relative flex min-h-16 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
          selected
            ? "xl:ring-primary/50 xl:ring-2 xl:ring-inset"
            : "hover:bg-muted/40",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <time dateTime={review.weekStart}>
              {compactReviewWeekLabel(review.weekStart)}
            </time>
            {review.completedAt ? null : (
              <span className="bg-muted rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold">
                Draft
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-sm leading-5 font-semibold tracking-[-0.01em]">
            {reviewHeadline(review)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-base leading-none font-semibold tabular-nums">
            {review.overallScore ?? "—"}
          </span>
          <span className="text-muted-foreground mt-1 block text-[0.625rem]">
            {review.overallScore === null ? "No score" : "Overall"}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 xl:hidden"
        />
      </button>
    </li>
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
  const pager =
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 sm:min-h-9";

  return (
    <article
      className={cn(glassCardClass, "overflow-hidden")}
      aria-live="polite"
      aria-label={`Review for ${reviewWeekLabel(review.weekStart)}`}
    >
      <header className="border-border/70 relative isolate border-b px-5 pt-6 pb-5 sm:px-8 sm:pt-7">
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={review.weekStart}
            className="text-muted-foreground text-[0.8125rem] font-medium"
          >
            {reviewWeekLabel(review.weekStart)}
          </time>
          <StatusPill tone={review.completedAt ? "positive" : "neutral"}>
            {review.completedAt ? "Completed" : "Draft"}
          </StatusPill>
        </div>
        {focus ? (
          <p className="text-muted-foreground mt-5 text-xs font-medium">
            Chose to focus on
          </p>
        ) : null}
        <h2
          className={cn(
            "text-lg leading-snug font-semibold tracking-[-0.015em] text-balance break-words",
            focus ? "mt-1" : "mt-4",
          )}
        >
          {reviewHeadline(review)}
        </h2>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {scoreKinds.map((kind) => (
            <ScoreFigure key={kind} kind={kind} score={scoreOf(review, kind)} />
          ))}
        </p>
        {review.reflectedAt ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Last written{" "}
            <time dateTime={review.reflectedAt}>
              {manilaDateLabel(review.reflectedAt)}
            </time>
          </p>
        ) : null}
      </header>

      {shown.length ? (
        <div className="divide-border/60 divide-y px-5 sm:px-8">
          {shown.map((key) => (
            <section key={key} className="py-5">
              <h3 className="text-muted-foreground text-xs font-medium">
                {promptMeta[key].title}
              </h3>
              <p className="mt-1.5 text-[0.9375rem] leading-7 break-words whitespace-pre-line">
                {review[key]}
              </p>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground px-5 py-6 text-sm sm:px-8">
          No written notes this week, only what the scores hold.
        </p>
      )}

      {blank.length ? (
        <p className="text-muted-foreground border-border/60 border-t px-5 py-4 text-xs leading-5 sm:px-8">
          <span className="text-foreground font-medium">Left blank:</span>{" "}
          {blank.map((key) => promptMeta[key].title).join(" · ")}
        </p>
      ) : null}

      <footer className="border-border/70 flex items-center justify-between gap-2 border-t px-3 py-2 sm:px-5">
        <button
          type="button"
          disabled={position === total}
          onClick={onOlder}
          className={pager}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Older
        </button>
        <p className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
          {position} of {total}
        </p>
        <button
          type="button"
          disabled={position === 1}
          onClick={onNewer}
          className={pager}
        >
          Newer
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </footer>
    </article>
  );
}

function RhythmTable({ reviews }: { reviews: ReviewArchiveItem[] }) {
  return (
    <div className="overflow-x-auto">
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
  );
}

function ArchiveEmpty() {
  return (
    <HeroShell labelledBy="archive-empty-heading">
      <div className="flex max-w-2xl gap-3">
        <span className="bg-muted/60 text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg max-sm:hidden">
          <BookOpenCheck aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <h2
            id="archive-empty-heading"
            className="text-base leading-6 font-semibold"
          >
            No past reviews yet
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Submitted reviews appear here with their notes, scores, and focus.
          </p>
        </div>
      </div>
    </HeroShell>
  );
}

/**
 * Past reviews: a list of weeks and the week being read. Phones show one
 * at a time (the list, then the page with a way back); wide screens show
 * both side by side.
 */
export function ReviewArchive({
  reviews,
  active,
  selectedId,
  onSelect,
  reading,
  onReadingChange,
  streak = null,
}: {
  /** Newest first. */
  reviews: ReviewArchiveItem[];
  active: boolean;
  selectedId: string | null;
  onSelect: (reviewId: string) => void;
  /** On phones, whether a week's page is open instead of the list. */
  reading: boolean;
  onReadingChange: (reading: boolean) => void;
  streak?: string | null;
}) {
  const reader = useRef<HTMLDivElement>(null);
  const found = reviews.findIndex((review) => review.id === selectedId);
  const selectedIndex = found >= 0 ? found : 0;
  const selected = reviews[selectedIndex];

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
  const open = (index: number) => {
    select(index);
    onReadingChange(true);
    // On phones the page replaces the list; start at its top.
    if (window.matchMedia?.("(min-width: 80rem)").matches) return;
    window.requestAnimationFrame(() =>
      reader.current?.scrollIntoView?.({ block: "start" }),
    );
  };
  const backToList = () => {
    onReadingChange(false);
    window.requestAnimationFrame(() =>
      document
        .getElementById(`review-week-${selected.id}`)
        ?.scrollIntoView?.({ block: "center" }),
    );
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <ArchiveHero summary={summary} streak={streak} />

      <div className="grid gap-8 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start xl:gap-6">
        <ReviewSection
          id="past-weeks-heading"
          title="All weeks"
          meta="Newest first"
          className={cn(reading && "max-xl:hidden")}
        >
          <ul
            className={cn(
              glassCardClass,
              "divide-border/70 divide-y overflow-hidden",
            )}
          >
            {reviews.map((review, index) => (
              <WeekRow
                key={review.id}
                review={review}
                selected={index === selectedIndex}
                onSelect={() => open(index)}
              />
            ))}
          </ul>
        </ReviewSection>

        <div
          ref={reader}
          className={cn(
            "min-w-0 scroll-mt-36 sm:scroll-mt-8",
            !reading && "max-xl:hidden",
          )}
        >
          <button
            type="button"
            onClick={backToList}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-2 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none xl:hidden"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            All weeks
          </button>
          <JournalPage
            review={selected}
            position={selectedIndex + 1}
            total={reviews.length}
            onOlder={() => select(selectedIndex + 1)}
            onNewer={() => select(selectedIndex - 1)}
          />
        </div>
      </div>

      {active && trend.length > 1 ? (
        <ReviewSection
          id="archive-trend-heading"
          title="How your weeks felt"
          meta="Select a week"
        >
          <div className={cn(glassCardClass, "p-4 sm:p-6")}>
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
            <div className="mt-4">
              <ReviewTrend
                data={trend}
                selectedId={selected.id}
                onSelect={(reviewId) => {
                  const index = reviews.findIndex(
                    (review) => review.id === reviewId,
                  );
                  if (index >= 0) open(index);
                }}
              />
            </div>
            <Disclosure
              label="Scores as a table"
              variant="row"
              className="mt-4"
            >
              <RhythmTable reviews={reviews} />
            </Disclosure>
          </div>
        </ReviewSection>
      ) : null}
    </div>
  );
}
