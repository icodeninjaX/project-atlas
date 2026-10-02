import { NotebookPen } from "lucide-react";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import todayStyles from "@/components/dashboard/today.module.css";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { WeekHero, type WeekFacts } from "@/components/reviews/week-hero";
import {
  WeeklyInsightCard,
  type InsightResult,
} from "@/components/reviews/weekly-insight-card";
import { reviewWeekLabel } from "@/lib/dates/dates";
import {
  lastWeekCompass,
  promptsWritten,
  reviewStreak,
  streakLabel,
  thisWeekStatus,
  weekDayIndex,
  type ReviewArchiveItem,
} from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

/** This week's saved review, in the form's own field names. */
export type CurrentReview = {
  wins: string;
  challenges: string;
  lessons: string;
  timeWasters: string;
  moneyReflection: string;
  careerReflection: string;
  nextWeekFocus: string;
  energyScore: string;
  stressScore: string;
  overallScore: string;
  submitted: boolean;
  savedAt?: string;
};

/** The Weekly reviews page body, from data the page has already loaded. */
export function ReviewsScreen({
  nowIso,
  weekStart,
  current,
  facts,
  reviews,
  streakHistory,
  historyLimitReached,
  insight,
  initialView,
  highlightReviewId,
}: {
  nowIso: string;
  /** This week's Monday, `YYYY-MM-DD`. */
  weekStart: string;
  current: CurrentReview | null;
  facts: WeekFacts;
  /** Past reviews for the archive, newest first. */
  reviews: ReviewArchiveItem[];
  /** Every loaded review, this week's included, for the streak. */
  streakHistory: Array<Pick<ReviewArchiveItem, "weekStart" | "completedAt">>;
  historyLimitReached: boolean;
  insight: { autoEnabled: boolean; lastWeek: InsightResult | null };
  initialView: "current" | "archive";
  highlightReviewId?: string;
}) {
  const dayIndex = weekDayIndex(weekStart, nowIso);
  const status = thisWeekStatus({
    dayIndex,
    submitted: current?.submitted ?? false,
    hasDraft: current !== null,
    written: current ? promptsWritten(current) : 0,
  });
  const streak = streakLabel(
    reviewStreak(streakHistory, weekStart, historyLimitReached),
  );
  const { submitted, savedAt, ...fields } = current ?? {
    submitted: false,
    savedAt: undefined,
  };

  return (
    <SpotlightArea className="relative isolate mx-auto w-full max-w-[1180px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="max-w-2xl min-w-0">
        <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
          <NotebookPen aria-hidden="true" className="size-3.5" />
          Monday–Sunday
        </p>
        <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
          Weekly reviews
        </h1>
        <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
          A quiet place to notice your patterns, remember your progress, and
          choose what matters next.
        </p>
      </header>

      <ReviewWorkspace
        reviews={reviews}
        initialView={initialView}
        highlightReviewId={highlightReviewId}
        streak={streak}
        currentContent={
          <div className="space-y-5 sm:space-y-6">
            <WeekHero
              weekStart={weekStart}
              dayIndex={dayIndex}
              status={status}
              streak={streak}
              compass={lastWeekCompass(reviews, weekStart)}
              facts={facts}
            />
            <WeeklyInsightCard
              autoEnabled={insight.autoEnabled}
              lastWeek={insight.lastWeek}
            />
            <ReviewForm
              weekStart={weekStart}
              weekLabel={reviewWeekLabel(weekStart)}
              entryTimestamp={nowIso}
              lastSavedAt={savedAt}
              submitted={submitted}
              initial={current ? fields : undefined}
            />
          </div>
        }
      />
    </SpotlightArea>
  );
}
