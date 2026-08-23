import { ReviewForm } from "@/components/reviews/review-form";
import {
  ReviewWorkspace,
  type ReviewArchiveItem,
} from "@/components/reviews/review-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mondayWeekStart } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Weekly reviews" };

export default async function ReviewsPage() {
  const weekStart = mondayWeekStart(new Date());
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
            "id,week_start,wins,challenges,lessons,time_wasters,money_reflection,career_reflection,next_week_focus,energy_score,stress_score,overall_score,completed_at",
          )
          .order("week_start", { ascending: false })
          .limit(12),
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
  const current = currentResult.data;
  const history = historyResult.data ?? [];
  const spending = (spendingResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_centavos),
    0,
  );
  const payments = (paymentsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_centavos),
    0,
  );
  const metrics = [
    ["Tasks completed", String(tasksResult.count ?? 0)],
    ["Spending", formatCentavos(spending)],
    ["Debt payments", formatCentavos(payments)],
    ["Applications sent", String(applicationsResult.count ?? 0)],
    ["Goals progressed", String(goalsResult.count ?? 0)],
  ];
  const pastReviews: ReviewArchiveItem[] = history
    .filter((review) => review.week_start !== weekStart)
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
    }));

  return (
    <div className="mx-auto max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Monday–Sunday"
        title="Weekly reviews"
        description="A quiet place to notice your patterns, remember your progress, and choose what matters next."
      />
      <ReviewWorkspace
        reviews={pastReviews}
        currentContent={
          <div>
            <section>
              <h2 className="text-sm font-semibold">This week in facts</h2>
              <div className="-mx-4 mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
                {metrics.map(([label, value]) => (
                  <Card
                    key={label}
                    className="w-[8.75rem] min-w-[8.75rem] snap-start sm:w-auto sm:min-w-0"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-muted-foreground text-xs leading-4">
                        {label}
                      </p>
                      <p className="mt-3 font-mono text-xl font-semibold tabular-nums">
                        {label === "Spending" || label === "Debt payments" ? (
                          <SensitiveValue>{value}</SensitiveValue>
                        ) : (
                          value
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-muted-foreground mt-1 text-center text-[11px] sm:hidden">
                Swipe to see all weekly facts
              </p>
            </section>

            <Card className="mt-5">
              <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Week of {weekStart}</CardTitle>
                  {current ? (
                    <span className="border-border bg-secondary text-muted-foreground rounded-full border px-2 py-1 text-[10px] font-medium">
                      {current.completed_at ? "Submitted" : "Draft"}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <ReviewForm
                  weekStart={weekStart}
                  initial={
                    current
                      ? {
                          wins: current.wins ?? "",
                          challenges: current.challenges ?? "",
                          lessons: current.lessons ?? "",
                          timeWasters: current.time_wasters ?? "",
                          moneyReflection: current.money_reflection ?? "",
                          careerReflection: current.career_reflection ?? "",
                          nextWeekFocus: current.next_week_focus ?? "",
                          energyScore: current.energy_score
                            ? String(current.energy_score)
                            : "",
                          stressScore: current.stress_score
                            ? String(current.stress_score)
                            : "",
                          overallScore: current.overall_score
                            ? String(current.overall_score)
                            : "",
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          </div>
        }
      />
    </div>
  );
}
