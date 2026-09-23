import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { DaylineCommand } from "@/components/dashboard/dayline-command";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { GratitudeCard } from "@/components/dashboard/gratitude-card";
import { SituationStrip } from "@/components/dashboard/situation-strip";
import { SignalsPanel } from "@/components/signals/signals-panel";
import { Button } from "@/components/ui/button";
import { manilaDateLabel } from "@/lib/dates/dates";
import { loadDayline } from "@/lib/dayline/server";
import { getRandomWisdomQuote } from "@/lib/gratitude/gratitude-reflections";
import { formatCentavos } from "@/lib/money/money";
import { selectDashboardSignals } from "@/lib/signals/engine";
import { loadSignals } from "@/lib/signals/server";
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
  const wisdomQuote = getRandomWisdomQuote();
  const monthStart = `${today.slice(0, 7)}-01`;
  const localNoon = new Date(`${today}T12:00:00+08:00`);
  const weekday = localNoon.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const weekStartDate = new Date(localNoon);
  weekStartDate.setUTCDate(localNoon.getUTCDate() + mondayOffset);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [dashboardResult, signalResult, daylineResult] = supabase
    ? await Promise.all([
        supabase.rpc("dashboard_snapshot", {
          p_today: today,
          p_month_start: monthStart,
          p_week_start: weekStart,
        }),
        loadSignals(supabase, now).catch(() => null),
        loadDayline(supabase, now).catch(() => null),
      ])
    : [{ data: null }, null, null];
  const { data } = dashboardResult;
  const dashboard = (data as DashboardData | null) ?? emptyData;
  const dashboardSignals = signalResult
    ? selectDashboardSignals(signalResult)
    : null;
  const fallbackPositions = ["NOW", "NEXT", "LATER"] as const;
  const daylineItems = daylineResult
    ? daylineResult.items
    : dashboard.priorities.map((priority, index) => ({
        ...priority,
        position: fallbackPositions[index] ?? "LATER",
        durationMinutes: null,
        energy: null,
      }));

  const metrics = [
    {
      label: "Available",
      value: formatCentavos(dashboard.financial.total_balance_centavos),
      note: "Across active accounts",
    },
    {
      label: "Income",
      value: formatCentavos(dashboard.financial.income_month_centavos),
      note: "Transfers excluded",
    },
    {
      label: "Expenses",
      value: formatCentavos(dashboard.financial.expense_month_centavos),
      note:
        dashboard.financial.remaining_budget_centavos == null
          ? "No budget set"
          : `${formatCentavos(dashboard.financial.remaining_budget_centavos)} budget left`,
      sensitiveNote: dashboard.financial.remaining_budget_centavos != null,
    },
    {
      label: "Debt remaining",
      value: formatCentavos(dashboard.financial.debt_remaining_centavos),
      note: dashboard.financial.next_financial_deadline
        ? `Next due ${dashboard.financial.next_financial_deadline}`
        : "No active deadline",
    },
  ];

  const situation = [
    {
      label: "Available cash",
      value: formatCentavos(dashboard.financial.total_balance_centavos),
      detail: "Active accounts",
      href: "/money/accounts" as const,
      sensitive: true,
    },
    {
      label: "Tasks",
      value: `${dashboard.tasks.overdue} overdue`,
      detail: `${dashboard.tasks.today} due today`,
      href: "/tasks?view=overdue" as const,
      urgent: dashboard.tasks.overdue > 0,
    },
    {
      label: "Career",
      value: `${dashboard.career.follow_up} follow-ups`,
      detail: `${dashboard.career.active} active applications`,
      href: "/career" as const,
      urgent: dashboard.career.follow_up > 0,
    },
    {
      label: "Goals",
      value: `${dashboard.goals.length} active`,
      detail: dashboard.goals[0]?.title ?? "Define an outcome",
      href: "/goals" as const,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">
            {manilaDateLabel(now)}
          </p>
          <h1 className="mt-3 text-[2rem] leading-none font-semibold tracking-[-0.05em] sm:text-[2.5rem] lg:text-[2.75rem]">
            {daylineItems.length ? "Your Day, Mapped." : "Your route is clear."}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6 sm:text-[0.9375rem]">
            {daylineItems.length
              ? "One clear move now. The rest of your system stays within reach."
              : "Add what matters and ATLAS will surface the next useful move."}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex">
          <Button asChild variant="secondary" size="sm">
            <Link href="/money/transactions?create=true">
              <CircleDollarSign aria-hidden="true" className="size-4" />
              Record expense
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/tasks?create=true">
              <Plus aria-hidden="true" className="size-4" />
              Add task
            </Link>
          </Button>
        </div>
      </header>

      <div className="mt-8">
        <DaylineCommand
          items={daylineItems}
          plannedMinutes={daylineResult?.plannedMinutes}
          capacityMinutes={daylineResult?.capacityMinutes}
          energyLevel={daylineResult?.energyLevel}
        />
      </div>

      <SituationStrip items={situation} />

      <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)] xl:gap-10">
        <FinancialOverview metrics={metrics} />
        <SignalsPanel signals={dashboardSignals} className="mt-0" />
      </div>

      <div className="border-border mt-10 grid gap-8 border-t pt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-stretch">
        <GratitudeCard initialQuote={wisdomQuote} compact />
        <section
          aria-labelledby="week-position"
          className="flex min-h-36 flex-col justify-between px-1 py-1"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-muted text-muted-foreground grid size-9 place-items-center rounded-xl">
                <CalendarClock aria-hidden="true" className="size-4" />
              </span>
              <h2 id="week-position" className="text-sm font-semibold">
                Week position
              </h2>
            </div>
            <p className="mt-4 text-base font-semibold">
              {dashboard.review_complete
                ? "This week is reviewed"
                : "Review when the week closes"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              The facts stay beside your reflection, without interrupting today.
            </p>
          </div>
          <Link
            href="/reviews"
            className="text-primary focus-visible:ring-ring mt-4 inline-flex min-h-9 w-fit items-center gap-1 rounded-md text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            Open weekly reviews{" "}
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        </section>
      </div>
    </div>
  );
}
