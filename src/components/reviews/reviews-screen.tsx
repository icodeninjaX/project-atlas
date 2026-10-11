import { NotebookPen } from "lucide-react";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { WeekHero, type WeekFacts } from "@/components/reviews/week-hero";
import {
  WeeklyInsightCard,
  type InsightResult,
} from "@/components/reviews/weekly-insight-card";
import {
  lastWeekCompass,
  promptsWritten,
  reviewStreak,
  streakLabel,
  thisWeekStatus,
  weekDayIndex,
  type ReviewArchiveItem,
} from "@/lib/reviews/view";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    <PageShell>
      <PageHeading
        eyebrow="Monday–Sunday"
        icon={NotebookPen}
        title="Weekly reviews"
        description="Each week gets a factual summary of what happened, then a few prompts to decide what changes next."
      />

      <ReviewWorkspace
        reviews={reviews}
        initialView={initialView}
        highlightReviewId={highlightReviewId}
        streak={streak}
        currentContent={
          <div className="space-y-8 sm:space-y-10">
            <WeekHero
              weekStart={weekStart}
              status={status}
              streak={streak}
              compass={lastWeekCompass(reviews, weekStart)}
              facts={facts}
            />
            {/* Wide screens keep the insights beside the review, so the
                writing column stays a comfortable width. */}
            <div className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <ReviewForm
                weekStart={weekStart}
                entryTimestamp={nowIso}
                lastSavedAt={savedAt}
                submitted={submitted}
                initial={current ? fields : undefined}
              />
              <WeeklyInsightCard
                autoEnabled={insight.autoEnabled}
                lastWeek={insight.lastWeek}
              />
            </div>
          </div>
        }
      />
    </PageShell>
  );
}
