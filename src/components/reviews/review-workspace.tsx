"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CloudRain,
  Compass,
  Hourglass,
  Lightbulb,
  Sparkles,
  WalletCards,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  compactReviewWeekLabel,
  manilaDateLabel,
  reviewWeekLabel,
} from "@/lib/dates/dates";
import { cn } from "@/lib/utils";

const ReviewTrend = dynamic(
  () =>
    import("@/components/reviews/review-trend").then(
      (module) => module.ReviewTrend,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/40 h-64 animate-pulse rounded-xl" />
    ),
  },
);

export type ReviewArchiveItem = {
  id: string;
  weekStart: string;
  wins: string | null;
  challenges: string | null;
  lessons: string | null;
  timeWasters: string | null;
  moneyReflection: string | null;
  careerReflection: string | null;
  nextWeekFocus: string | null;
  energyScore: number | null;
  stressScore: number | null;
  overallScore: number | null;
  completedAt: string | null;
  reflectedAt: string | null;
};

type ReviewView = "current" | "archive";

const archiveEntryDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
});

function reviewHeadline(review: ReviewArchiveItem) {
  return review.nextWeekFocus || review.wins || "A week worth remembering";
}

function reviewSummary(review: ReviewArchiveItem) {
  return (
    review.lessons ||
    review.challenges ||
    review.wins ||
    "This reflection keeps the week in view."
  );
}

function archiveAverage(reviews: ReviewArchiveItem[]) {
  const scores = reviews.flatMap((review) =>
    review.overallScore === null ? [] : [review.overallScore],
  );
  if (scores.length === 0) return "—";
  return (
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  ).toFixed(1);
}

function archiveBestEnergy(reviews: ReviewArchiveItem[]) {
  const scores = reviews.flatMap((review) =>
    review.energyScore === null ? [] : [review.energyScore],
  );
  return scores.length === 0 ? "—" : String(Math.max(...scores));
}

function ScoreBar({
  label,
  score,
  tone,
}: {
  label: string;
  score: number | null;
  tone: "primary" | "destructive" | "neutral";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold tabular-nums">
          {score === null ? "—" : `${score}/10`}
        </span>
      </div>
      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            tone === "primary" && "bg-primary",
            tone === "destructive" && "bg-destructive",
            tone === "neutral" && "bg-muted-foreground",
          )}
          style={{ width: score === null ? "0%" : `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

function ReflectionBlock({
  icon: Icon,
  title,
  children,
  highlight = false,
  className,
}: {
  icon: typeof Sparkles;
  title: string;
  children: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card p-5 sm:p-6",
        highlight && "bg-primary/[0.055]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          highlight ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
        <h3 className="text-xs font-semibold tracking-wide uppercase">
          {title}
        </h3>
      </div>
      <p className={cn("mt-3 text-sm leading-6", highlight && "font-semibold")}>
        {children || "No note for this prompt."}
      </p>
    </section>
  );
}

function ReviewArchive({
  reviews,
  active,
  highlightReviewId,
}: {
  reviews: ReviewArchiveItem[];
  active: boolean;
  highlightReviewId?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const matchingIndex = reviews.findIndex(
      (review) => review.id === highlightReviewId,
    );
    return matchingIndex >= 0 ? matchingIndex : 0;
  });
  const reviewButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = reviews[selectedIndex];

  useEffect(() => {
    const selectedButton = reviewButtons.current[selectedIndex];
    if (typeof selectedButton?.scrollIntoView === "function") {
      selectedButton.scrollIntoView({
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedIndex]);

  const trend = [...reviews].reverse().map((review) => ({
    week: review.weekStart.slice(5),
    energy: review.energyScore,
    stress: review.stressScore,
    overall: review.overallScore,
  }));

  if (!selected) {
    return (
      <div className="border-border bg-card/40 grid min-h-64 place-items-center rounded-2xl border border-dashed px-6 text-center">
        <div className="max-w-sm">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto grid size-11 place-items-center rounded-xl border">
            <BookOpenCheck className="size-5" />
          </div>
          <h2 className="mt-5 text-base font-semibold">
            Your reflection archive starts here
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Submit this week’s review and it will become the first page in your
            archive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section
        className="border-border bg-card relative overflow-hidden rounded-2xl border p-5 sm:p-6"
        style={{
          background:
            "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--primary) 13%, transparent), transparent 38%), var(--card)",
        }}
      >
        <div
          aria-hidden="true"
          className="border-primary/10 absolute -top-14 -right-12 size-44 rounded-full border"
        />
        <div
          aria-hidden="true"
          className="border-primary/10 absolute -top-7 -right-2 size-28 rounded-full border"
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_21rem] lg:items-end">
          <div>
            <div className="text-primary flex items-center gap-2">
              <Sparkles className="size-4" />
              <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                Your weeks, remembered
              </p>
            </div>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              You’ve made space to reflect across {reviews.length}{" "}
              {reviews.length === 1 ? "week" : "weeks"}.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
              Return to the honest parts—not only the scores—and notice how your
              focus, energy, and choices have changed.
            </p>
          </div>
          <div className="border-border bg-border grid grid-cols-3 gap-px overflow-hidden rounded-xl border">
            {[
              ["Weeks", String(reviews.length)],
              ["Average", archiveAverage(reviews)],
              ["Best energy", archiveBestEnergy(reviews)],
            ].map(([label, value]) => (
              <div key={label} className="bg-card/95 min-w-0 p-3">
                <p className="text-muted-foreground min-h-6 text-[9px] leading-3 tracking-wide uppercase sm:text-[10px]">
                  {label}
                </p>
                <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Previous review weeks">
          <div className="px-1">
            <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
              Past weeks
            </p>
            <h2 className="mt-1 text-sm font-semibold">Choose a reflection</h2>
          </div>
          <div className="text-muted-foreground mt-2 flex items-center gap-1 px-1 text-[11px] xl:hidden">
            <ArrowRight className="size-3" />
            Swipe to move through your weeks
          </div>

          <div className="-mx-4 mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 xl:mx-0 xl:block xl:space-y-2 xl:overflow-visible xl:px-0 xl:pb-0 [&::-webkit-scrollbar]:hidden">
            {reviews.map((review, index) => {
              const isSelected = selectedIndex === index;
              return (
                <button
                  key={review.id}
                  ref={(button) => {
                    reviewButtons.current[index] = button;
                  }}
                  id={`review-week-${review.id}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "border-border bg-card focus-visible:ring-ring w-[82vw] max-w-[18rem] min-w-[15.5rem] snap-center rounded-2xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none xl:w-full xl:max-w-none",
                    isSelected
                      ? "border-primary/55 bg-primary/[0.075]"
                      : "hover:border-primary/35 hover:bg-muted/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <time
                        dateTime={review.weekStart}
                        className="text-primary font-mono text-[10px] font-semibold tracking-[0.14em] uppercase"
                      >
                        {compactReviewWeekLabel(review.weekStart)}
                      </time>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 font-semibold">
                        {reviewHeadline(review)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold tabular-nums",
                        isSelected
                          ? "bg-primary/12 text-primary"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {review.overallScore ?? "—"}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-5">
                    {reviewSummary(review)}
                  </p>
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="bg-primary size-1.5 rounded-full" />
                      Energy {review.energyScore ?? "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="bg-destructive size-1.5 rounded-full" />
                      Stress {review.stressScore ?? "—"}
                    </span>
                    {review.reflectedAt ? (
                      <time
                        dateTime={review.reflectedAt}
                        className="flex items-center gap-1"
                      >
                        <CalendarDays className="size-3" />
                        {archiveEntryDate.format(new Date(review.reflectedAt))}
                      </time>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <article
          className="border-border bg-card min-w-0 overflow-hidden rounded-2xl border"
          aria-live="polite"
          aria-label={`Review for ${reviewWeekLabel(selected.weekStart)}`}
        >
          <header className="border-border border-b px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4 sm:gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <time
                    dateTime={selected.weekStart}
                    className="text-primary font-mono text-[10px] font-semibold tracking-[0.16em] uppercase"
                  >
                    {reviewWeekLabel(selected.weekStart)}
                  </time>
                  <span className="border-border bg-secondary text-muted-foreground rounded-full border px-2 py-1 text-[10px] font-medium">
                    {selected.completedAt ? "Completed" : "Draft"}
                  </span>
                </div>
                <h2 className="mt-3 text-xl leading-7 font-semibold tracking-[-0.03em] sm:text-2xl">
                  {reviewHeadline(selected)}
                </h2>
                {selected.reflectedAt ? (
                  <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                    <CalendarDays className="size-3.5" />
                    Latest reflection added
                    <time
                      dateTime={selected.reflectedAt}
                      className="font-medium"
                    >
                      {manilaDateLabel(selected.reflectedAt)}
                    </time>
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-3xl font-semibold tracking-[-0.05em] tabular-nums">
                  {selected.overallScore ?? "—"}
                </p>
                <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                  overall
                </p>
              </div>
            </div>
            <blockquote className="border-primary mt-5 border-l-2 pl-4">
              <p className="text-sm leading-6 sm:text-base sm:leading-7">
                {reviewSummary(selected)}
              </p>
            </blockquote>
          </header>

          <div className="bg-border grid gap-px sm:grid-cols-2">
            <ReflectionBlock icon={Sparkles} title="What went well">
              {selected.wins}
            </ReflectionBlock>
            <ReflectionBlock icon={CloudRain} title="What felt hard">
              {selected.challenges}
            </ReflectionBlock>
            <ReflectionBlock icon={Lightbulb} title="What I learned">
              {selected.lessons}
            </ReflectionBlock>
            <ReflectionBlock icon={Hourglass} title="Where time went">
              {selected.timeWasters}
            </ReflectionBlock>
            <ReflectionBlock icon={WalletCards} title="Money reflection">
              {selected.moneyReflection}
            </ReflectionBlock>
            <ReflectionBlock icon={BriefcaseBusiness} title="Career reflection">
              {selected.careerReflection}
            </ReflectionBlock>
            <ReflectionBlock
              icon={Compass}
              title="Next week’s compass"
              highlight
              className="sm:col-span-2"
            >
              {selected.nextWeekFocus}
            </ReflectionBlock>
          </div>

          <footer className="px-5 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreBar
                label="Energy"
                score={selected.energyScore}
                tone="primary"
              />
              <ScoreBar
                label="Stress"
                score={selected.stressScore}
                tone="destructive"
              />
              <ScoreBar
                label="Overall"
                score={selected.overallScore}
                tone="neutral"
              />
            </div>
            <div className="border-border mt-6 flex items-center justify-between gap-2 border-t pt-4">
              <button
                type="button"
                disabled={selectedIndex === reviews.length - 1}
                onClick={() => setSelectedIndex((index) => index + 1)}
                className="text-muted-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
              >
                <ArrowLeft className="size-4" />
                Older
              </button>
              <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
                {selectedIndex + 1} of {reviews.length}
              </p>
              <button
                type="button"
                disabled={selectedIndex === 0}
                onClick={() => setSelectedIndex((index) => index - 1)}
                className="text-muted-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
              >
                Newer
                <ArrowRight className="size-4" />
              </button>
            </div>
          </footer>
        </article>
      </div>

      {active && trend.length > 1 ? (
        <section
          className="border-border bg-card mt-4 rounded-2xl border p-5 sm:p-6"
          aria-labelledby="archive-trend-heading"
        >
          <div className="flex items-start gap-3">
            <div className="border-primary/20 bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl border">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <h2 id="archive-trend-heading" className="text-sm font-semibold">
                Your review rhythm
              </h2>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Scores add context. Your written reflections remain the source
                of meaning.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <ReviewTrend data={trend} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ReviewWorkspace({
  reviews,
  currentContent,
  initialView = "current",
  highlightReviewId,
}: {
  reviews: ReviewArchiveItem[];
  currentContent: ReactNode;
  initialView?: ReviewView;
  highlightReviewId?: string;
}) {
  const [view, setView] = useState<ReviewView>(initialView);
  const [archiveOpened, setArchiveOpened] = useState(initialView === "archive");
  const tabs = useRef<Record<ReviewView, HTMLButtonElement | null>>({
    current: null,
    archive: null,
  });

  const selectView = (next: ReviewView, focus = false) => {
    setView(next);
    if (next === "archive") setArchiveOpened(true);
    if (focus) tabs.current[next]?.focus();
  };

  return (
    <div className="mt-5 sm:mt-7">
      <div className="border-border bg-background/95 sm:bg-card sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 border-y px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:max-w-md sm:rounded-xl sm:border sm:p-1">
        <div role="tablist" aria-label="Review views" className="flex gap-1">
          {(
            [
              ["current", "This week", CalendarDays],
              ["archive", "Past reviews", BookOpenCheck],
            ] as const
          ).map(([name, label, Icon]) => {
            const selected = view === name;
            return (
              <button
                key={name}
                ref={(button) => {
                  tabs.current[name] = button;
                }}
                id={`reviews-${name}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`reviews-${name}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectView(name)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectView("current", true);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectView("archive", true);
                  }
                }}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none sm:px-3",
                  selected
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {name === "archive" ? (
                  <span>
                    <span className="sm:hidden">Archive</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                ) : (
                  <span>{label}</span>
                )}
                {name === "archive" ? (
                  <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                    {reviews.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section
        id="reviews-current-panel"
        role="tabpanel"
        aria-labelledby="reviews-current-tab"
        hidden={view !== "current"}
        className="mt-4 sm:mt-5"
      >
        {currentContent}
      </section>
      <section
        id="reviews-archive-panel"
        role="tabpanel"
        aria-labelledby="reviews-archive-tab"
        hidden={view !== "archive"}
        className="mt-4 sm:mt-5"
      >
        {archiveOpened ? (
          <ReviewArchive
            reviews={reviews}
            active={view === "archive"}
            highlightReviewId={highlightReviewId}
          />
        ) : null}
      </section>
    </div>
  );
}
