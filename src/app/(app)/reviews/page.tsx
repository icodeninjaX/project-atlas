import { BookOpenCheck } from "lucide-react";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewTrend } from "@/components/reviews/review-trend";
import { PageHeading } from "@/components/shared/page-heading";
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
            "id,week_start,wins,challenges,next_week_focus,energy_score,stress_score,overall_score,completed_at",
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
  const trend = [...history].reverse().map((review) => ({
    week: String(review.week_start).slice(5),
    energy: review.energy_score,
    stress: review.stress_score,
    overall: review.overall_score,
  }));

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Monday–Sunday"
        title="Weekly reviews"
        description="Facts first. Reflection second. Your words stay manual and your scores stay comparable."
      />
      <section className="mt-8">
        <h2 className="text-sm font-semibold">This week in facts</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map(([label, value]) => (
            <Card key={label}>
              <CardContent>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-3 font-mono text-xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Week of {weekStart}
            {current?.completed_at ? " · submitted" : current ? " · draft" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      {trend.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Score trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewTrend data={trend} />
          </CardContent>
        </Card>
      )}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Previous reviews</h2>
        <div className="mt-3 space-y-3">
          {history.filter((review) => review.week_start !== weekStart)
            .length === 0 ? (
            <div className="border-border grid min-h-48 place-items-center rounded-2xl border border-dashed text-center">
              <div>
                <BookOpenCheck className="text-primary mx-auto size-6" />
                <p className="mt-4 text-sm font-semibold">
                  No earlier reviews yet.
                </p>
              </div>
            </div>
          ) : (
            history
              .filter((review) => review.week_start !== weekStart)
              .map((review) => (
                <Card key={review.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-primary font-mono text-xs">
                          {review.week_start}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {review.next_week_focus ||
                            review.wins ||
                            "Review saved"}
                        </p>
                        {review.challenges && (
                          <p className="text-muted-foreground mt-2 text-xs">
                            {review.challenges}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xl font-semibold">
                          {review.overall_score ?? "—"}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          overall
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </section>
    </div>
  );
}
