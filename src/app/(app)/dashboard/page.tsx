import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Plus,
  Target,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipHint } from "@/components/ui/tooltip";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { GratitudeCard } from "@/components/dashboard/gratitude-card";
import { SignalsPanel } from "@/components/signals/signals-panel";
import { manilaDateLabel } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import { selectDashboardSignals } from "@/lib/signals/engine";
import { loadSignals } from "@/lib/signals/server";
import { createClient } from "@/lib/supabase/server";
import { getRandomWisdomQuote } from "@/lib/gratitude/gratitude-reflections";

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
  const wisdomQuote = getRandomWisdomQuote();
  const monthStart = `${today.slice(0, 7)}-01`;
  const localNoon = new Date(`${today}T12:00:00+08:00`);
  const weekday = localNoon.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const weekStartDate = new Date(localNoon);
  weekStartDate.setUTCDate(localNoon.getUTCDate() + mondayOffset);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [dashboardResult, signalResult] = supabase
    ? await Promise.all([
        supabase.rpc("dashboard_snapshot", {
          p_today: today,
          p_month_start: monthStart,
          p_week_start: weekStart,
        }),
        loadSignals(supabase, now).catch(() => null),
      ])
    : [{ data: null }, null];
  const { data } = dashboardResult;
  const dashboard = (data as DashboardData | null) ?? emptyData;
  const dashboardSignals = signalResult
    ? selectDashboardSignals(signalResult)
    : null;

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
      <div className="grid lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch lg:gap-8">
        <div className="contents min-w-0 lg:flex lg:flex-col lg:justify-center">
          <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
            {manilaDateLabel(now)}
          </p>

          <div className="order-3 lg:order-none">
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:mt-6 sm:text-4xl lg:mt-3">
              {dashboard.priorities.length
                ? "Your Day, Mapped."
                : "Your route is clear."}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {dashboard.priorities.length
                ? "Ranked by deadlines and commitments."
                : "Add what matters and ATLAS will surface the next useful move."}
            </p>

            <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button asChild variant="secondary" size="sm" className="w-full">
                <Link href="/money/transactions?create=true">
                  <CircleDollarSign className="size-4" />
                  Record expense
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full">
                <Link href="/tasks?create=true">
                  <Plus className="size-4" />
                  Add task
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <GratitudeCard
          initialQuote={wisdomQuote}
          className="order-2 mt-3 lg:order-none lg:mt-0"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:mt-8 xl:grid-cols-[1.35fr_0.65fr]">
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
              <div className="border-border bg-background/45 grid min-h-44 place-items-center rounded-xl border border-dashed p-5 text-center sm:min-h-56 sm:p-6">
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
                    className="relative grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2.5 pb-5 last:pb-0 sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:gap-3 sm:pb-6"
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
                    <TooltipHint label={`Open ${priority.title}`} side="left">
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={priority.href as Route}
                          aria-label={`Open ${priority.title}`}
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </TooltipHint>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between gap-4">
            <CardTitle>Week position</CardTitle>
            <div className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
              <CalendarClock aria-hidden="true" className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">
              {dashboard.review_complete
                ? "This week is reviewed"
                : "Review when the week closes"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              ATLAS uses Monday through Sunday and keeps factual metrics beside
              your reflection.
            </p>
            <Link
              href="/reviews"
              className="text-primary mt-4 inline-flex items-center gap-1 text-xs font-semibold"
            >
              Open weekly reviews <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <SignalsPanel signals={dashboardSignals} />

      <section aria-labelledby="financial-snapshot" className="mt-3 sm:mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <CreditCard
                aria-hidden="true"
                className="text-primary size-4 shrink-0"
              />
              <CardTitle id="financial-snapshot">Financial snapshot</CardTitle>
            </div>
            <Link
              href="/money/accounts"
              className="text-primary focus-visible:ring-ring hidden rounded-md text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
            >
              View money
            </Link>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-5">
            <div className="border-border grid grid-cols-2 overflow-hidden rounded-xl border xl:grid-cols-4">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={`min-h-24 min-w-0 p-2.5 min-[360px]:p-3 sm:p-4 ${
                    index >= 2 ? "border-border border-t xl:border-t-0" : ""
                  } ${index % 2 === 1 ? "border-border border-l" : ""} ${
                    index === 2 ? "xl:border-border xl:border-l" : ""
                  }`}
                >
                  <p className="text-muted-foreground text-[clamp(0.625rem,3vw,0.75rem)] sm:text-xs">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-[clamp(0.875rem,4.6vw,1.125rem)] leading-6 font-semibold tracking-tight break-words sm:text-xl">
                    <SensitiveValue>{metric.value}</SensitiveValue>
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-[clamp(0.625rem,2.8vw,0.6875rem)] leading-4 sm:text-[11px]">
                    {metric.label === "Expenses this month" &&
                    dashboard.financial.remaining_budget_centavos != null ? (
                      <SensitiveValue>{metric.note}</SensitiveValue>
                    ) : (
                      metric.note
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-3 overflow-hidden sm:mt-4">
        <CardHeader>
          <CardTitle>Workspace pulse</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4 sm:p-0 sm:pt-5">
          <div className="border-border divide-border divide-y border-t">
            {moduleSnapshots.map(
              ({ title, icon: Icon, value, href, detail }) => (
                <Link
                  key={title}
                  href={href}
                  aria-label={`View ${title}`}
                  className="hover:bg-muted/70 focus-visible:ring-ring grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                >
                  <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-xl">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="font-mono text-sm font-semibold">
                        {value}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {detail}
                    </span>
                  </span>
                  <ArrowRight className="text-muted-foreground size-4" />
                </Link>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
