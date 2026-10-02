import {
  ReviewsScreen,
  type CurrentReview,
} from "@/components/reviews/reviews-screen";
import type { InsightResult } from "@/components/reviews/weekly-insight-card";
import { mondayWeekStart } from "@/lib/dates/dates";
import { previousWeekWindows } from "@/lib/reviews/insight";
import { storedResponse } from "@/lib/reviews/insight-storage";
import {
  REVIEW_HISTORY_LIMIT,
  type ReviewArchiveItem,
} from "@/lib/reviews/view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Weekly reviews" };

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; highlight?: string }>;
}) {
  const query = await searchParams;
  const now = new Date();
  const weekStart = mondayWeekStart(now);
  const entryTimestamp = now.toISOString();
  const endDate = new Date(`${weekStart}T00:00:00+08:00`);
  endDate.setDate(endDate.getDate() + 7);
  const weekEnd = endDate.toISOString();
  const weekStartIso = new Date(`${weekStart}T00:00:00+08:00`).toISOString();
  const supabase = await createClient();
  const results = supabase
    ? await Promise.all([
        supabase
          .from("weekly_reviews")
          .select("*")
          .eq("week_start", weekStart)
          .maybeSingle(),
        supabase
          .from("weekly_reviews")
          .select(
            "id,week_start,wins,challenges,lessons,time_wasters,money_reflection,career_reflection,next_week_focus,energy_score,stress_score,overall_score,completed_at,created_at,updated_at",
          )
          .order("week_start", { ascending: false })
          .limit(REVIEW_HISTORY_LIMIT),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .gte("completed_at", weekStartIso)
          .lt("completed_at", weekEnd),
        supabase
          .from("transactions")
          .select("amount_centavos")
          .eq("transaction_type", "expense")
          .gte("transaction_date", weekStart)
          .lt("transaction_date", weekEnd.slice(0, 10)),
        supabase
          .from("debt_payments")
          .select("amount_centavos")
          .gte("payment_date", weekStart)
          .lt("payment_date", weekEnd.slice(0, 10)),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .gte("applied_at", weekStartIso)
          .lt("applied_at", weekEnd),
        supabase
          .from("goals")
          .select("id", { count: "exact", head: true })
          .gt("progress_percent", 0)
          .gte("updated_at", weekStartIso)
          .lt("updated_at", weekEnd),
      ])
    : [
        { data: null },
        { data: [] },
        { count: 0 },
        { data: [] },
        { data: [] },
        { count: 0 },
        { count: 0 },
      ];
  const [
    currentResult,
    historyResult,
    tasksResult,
    spendingResult,
    paymentsResult,
    applicationsResult,
    goalsResult,
  ] = results;
  const highlightedReviewResult =
    supabase && query.highlight
      ? await supabase
          .from("weekly_reviews")
          .select(
            "id,week_start,wins,challenges,lessons,time_wasters,money_reflection,career_reflection,next_week_focus,energy_score,stress_score,overall_score,completed_at,created_at,updated_at",
          )
          .eq("id", query.highlight)
          .maybeSingle()
      : { data: null };
  // Last week's stored insight and the automatic-insight opt-in.
  const lastWeekStart = previousWeekWindows(now).current.from;
  const [insightPreference, lastWeekInsight] = supabase
    ? await Promise.all([
        supabase
          .from("user_preferences")
          .select("weekly_insight_auto")
          .maybeSingle(),
        supabase
          .from("weekly_insights")
          .select("status,claims,evidence,limitations,created_at")
          .eq("week_start", lastWeekStart)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const storedLastWeek = lastWeekInsight.data
    ? (storedResponse(
        lastWeekInsight.data,
        lastWeekStart,
      ) as unknown as InsightResult)
    : null;
  const current = currentResult.data;
  const history = historyResult.data ?? [];
  const sum = (
    rows: Array<{ amount_centavos: number | string }> | null | undefined,
  ) =>
    (rows ?? []).reduce((total, row) => total + Number(row.amount_centavos), 0);
  const reviewHistory = highlightedReviewResult.data
    ? [
        highlightedReviewResult.data,
        ...history.filter(
          (review) => review.id !== highlightedReviewResult.data?.id,
        ),
      ]
    : history;
  const pastReviews: ReviewArchiveItem[] = reviewHistory
    .filter(
      (review) =>
        review.week_start !== weekStart || review.id === query.highlight,
    )
    .map((review) => ({
      id: review.id,
      weekStart: review.week_start,
      wins: review.wins,
      challenges: review.challenges,
      lessons: review.lessons,
      timeWasters: review.time_wasters,
      moneyReflection: review.money_reflection,
      careerReflection: review.career_reflection,
      nextWeekFocus: review.next_week_focus,
      energyScore: review.energy_score,
      stressScore: review.stress_score,
      overallScore: review.overall_score,
      completedAt: review.completed_at,
      reflectedAt:
        review.completed_at ?? review.updated_at ?? review.created_at ?? null,
    }));
  const currentReview: CurrentReview | null = current
    ? {
        wins: current.wins ?? "",
        challenges: current.challenges ?? "",
        lessons: current.lessons ?? "",
        timeWasters: current.time_wasters ?? "",
        moneyReflection: current.money_reflection ?? "",
        careerReflection: current.career_reflection ?? "",
        nextWeekFocus: current.next_week_focus ?? "",
        energyScore: current.energy_score ? String(current.energy_score) : "",
        stressScore: current.stress_score ? String(current.stress_score) : "",
        overallScore: current.overall_score
          ? String(current.overall_score)
          : "",
        submitted: Boolean(current.completed_at),
        savedAt: current.updated_at ?? current.created_at ?? undefined,
      }
    : null;

  return (
    <ReviewsScreen
      nowIso={entryTimestamp}
      weekStart={weekStart}
      current={currentReview}
      facts={{
        tasks: tasksResult.count ?? 0,
        spendingCentavos: sum(spendingResult.data),
        debtPaymentsCentavos: sum(paymentsResult.data),
        applications: applicationsResult.count ?? 0,
        goals: goalsResult.count ?? 0,
      }}
      reviews={pastReviews}
      streakHistory={history.map((review) => ({
        weekStart: review.week_start,
        completedAt: review.completed_at,
      }))}
      historyLimitReached={history.length === REVIEW_HISTORY_LIMIT}
      insight={{
        autoEnabled: insightPreference.data?.weekly_insight_auto === true,
        lastWeek: storedLastWeek,
      }}
      initialView={query.view === "archive" ? "archive" : "current"}
      highlightReviewId={query.highlight}
    />
  );
}
