import { NotebookPen } from "lucide-react";
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
        description="A quiet place to notice your patterns, remember your progress, and choose what matters next."
      />

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
    </PageShell>
  );
}
