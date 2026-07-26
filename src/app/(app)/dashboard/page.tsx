import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Plus,
  Target,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { manilaDateLabel } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

type DashboardData = {
  financial: {
    total_balance_centavos: number;
    income_month_centavos: number;
    expense_month_centavos: number;
    remaining_budget_centavos: number | null;
    debt_remaining_centavos: number;
    next_financial_deadline: string | null;
    days_until_payday: number | null;
  };
  tasks: {
    today: number;
    overdue: number;
    completed_today: number;
    remaining_minutes: number;
  };
  career: {
    active: number;
    follow_up: number;
    interviews: number;
    offers: number;
    submitted_month: number;
  };
  goals: Array<{
    id: string;
    title: string;
    progress_percent: number;
    area: string;
  }>;
  review_complete: boolean;
  priorities: Array<{
    id: string;
    kind: string;
    title: string;
    reason: string;
    href: string;
  }>;
};

const emptyData: DashboardData = {
  financial: {
    total_balance_centavos: 0,
    income_month_centavos: 0,
    expense_month_centavos: 0,
    remaining_budget_centavos: null,
    debt_remaining_centavos: 0,
    next_financial_deadline: null,
    days_until_payday: null,
  },
  tasks: { today: 0, overdue: 0, completed_today: 0, remaining_minutes: 0 },
  career: {
    active: 0,
    follow_up: 0,
    interviews: 0,
    offers: 0,
    submitted_month: 0,
  },
  goals: [],
  review_complete: false,
  priorities: [],
};

function manilaIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const metadata = { title: "Today" };

export default async function DashboardPage() {
  const now = new Date();
  const today = manilaIsoDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const localNoon = new Date(`${today}T12:00:00+08:00`);
  const weekday = localNoon.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const weekStartDate = new Date(localNoon);
  weekStartDate.setUTCDate(localNoon.getUTCDate() + mondayOffset);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.rpc("dashboard_snapshot", {
        p_today: today,
        p_month_start: monthStart,
        p_week_start: weekStart,
      })
    : { data: null };
  const dashboard = (data as DashboardData | null) ?? emptyData;

  const metrics = [
    {
      label: "Available balance",
      value: formatCentavos(dashboard.financial.total_balance_centavos),
      note: "Across active accounts",
    },
    {
      label: "Income this month",
      value: formatCentavos(dashboard.financial.income_month_centavos),
      note: "Transfers excluded",
    },
    {
      label: "Expenses this month",
      value: formatCentavos(dashboard.financial.expense_month_centavos),
      note:
        dashboard.financial.remaining_budget_centavos == null
          ? "No budget set"
          : `${formatCentavos(dashboard.financial.remaining_budget_centavos)} budget left`,
    },
    {
      label: "Debt remaining",
      value: formatCentavos(dashboard.financial.debt_remaining_centavos),
      note: dashboard.financial.next_financial_deadline
        ? `Next due ${dashboard.financial.next_financial_deadline}`
        : "No active deadline",
    },
  ];
  const moduleSnapshots = [
    {
      title: "Tasks",
      icon: CheckCircle2,
      value: `${dashboard.tasks.today} due today`,
      href: "/tasks" as const,
      detail: `${dashboard.tasks.overdue} overdue · ${dashboard.tasks.completed_today} completed`,
    },
    {
      title: "Career",
      icon: BriefcaseBusiness,
      value: `${dashboard.career.active} active`,
      href: "/career" as const,
      detail: `${dashboard.career.follow_up} follow-ups waiting`,
    },
    {
      title: "Goals",
      icon: Landmark,
      value: `${dashboard.goals.length} active`,
      href: "/goals" as const,
      detail: dashboard.goals[0]?.title ?? "Define the outcome you want",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
            {manilaDateLabel(now)}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {dashboard.priorities.length
              ? "Your next moves are mapped."
              : "Your route is clear."}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {dashboard.priorities.length
              ? "Atlas ranked these from current deadlines and commitments."
              : "Add what matters and Atlas will surface the next useful move."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/money/transactions?create=true">
              <CircleDollarSign className="size-4" />
              Record expense
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/tasks?create=true">
              <Plus className="size-4" />
              Add task
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-primary font-mono text-[10px] font-semibold tracking-widest uppercase">
                Dayline
              </p>
              <CardTitle className="mt-1">Today’s priorities</CardTitle>
            </div>
            <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[10px]">
              {dashboard.priorities.length} of 3
            </span>
          </CardHeader>
          <CardContent>
            {dashboard.priorities.length === 0 ? (
              <div className="border-border bg-background/45 grid min-h-56 place-items-center rounded-xl border border-dashed p-6 text-center">
                <div className="max-w-sm">
                  <Target className="text-primary mx-auto size-6" />
                  <p className="mt-4 text-sm font-semibold">
                    Nothing urgent is competing for attention.
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    Critical tasks, due debts, career follow-ups, and
                    approaching milestones will appear here with a reason.
                  </p>
                </div>
              </div>
            ) : (
              <ol>
                {dashboard.priorities.map((priority, index) => (
                  <li
                    key={`${priority.kind}-${priority.id}`}
                    className="relative grid grid-cols-[22px_1fr_auto] gap-3 pb-6 last:pb-0"
                  >
                    {index < dashboard.priorities.length - 1 && (
                      <span className="bg-border absolute top-3 bottom-0 left-[6px] w-px" />
                    )}
                    <span
                      className={`relative mt-1 size-[13px] rounded-full border-2 ${
                        index === 0
                          ? "border-primary bg-primary ring-primary/15 ring-4"
                          : "border-muted-foreground bg-card"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold">{priority.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {priority.reason}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={priority.href as Route}
                        aria-label={`Open ${priority.title}`}
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Week position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                <CalendarClock className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {dashboard.review_complete
                    ? "This week is reviewed"
                    : "Review when the week closes"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Atlas uses Monday through Sunday and keeps factual metrics
                  beside your reflection.
                </p>
                <Link
                  href="/reviews"
                  className="text-primary mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                >
                  Open weekly reviews <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="financial-snapshot" className="mt-4">
        <h2 id="financial-snapshot" className="sr-only">
          Financial snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent>
                <p className="text-muted-foreground text-xs">{metric.label}</p>
                <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  {metric.note}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {moduleSnapshots.map(({ title, icon: Icon, value, href, detail }) => (
          <Card key={title}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="bg-muted text-muted-foreground grid size-9 place-items-center rounded-lg">
                  <Icon className="size-4" />
                </div>
                <Link
                  href={href}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2"
                  aria-label={`View ${title}`}
                >
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <p className="mt-5 text-sm font-semibold">{title}</p>
              <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
              <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
