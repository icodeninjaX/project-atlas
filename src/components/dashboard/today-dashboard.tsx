import { CircleDollarSign, Moon, Plus, Sun, Sunrise } from "lucide-react";
import Link from "next/link";
import {
  DaylineCommand,
  type DashboardDaylineItem,
} from "@/components/dashboard/dayline-command";
import { NextBestActions } from "@/components/dashboard/next-best-actions";
import {
  FinancialOverview,
  type FinancialSnapshot,
} from "@/components/dashboard/financial-overview";
import { GratitudeCard } from "@/components/dashboard/gratitude-card";
import {
  SituationStrip,
  type SituationItem,
} from "@/components/dashboard/situation-strip";
import { WeekPosition } from "@/components/dashboard/week-position";
import { SignalsPanel } from "@/components/signals/signals-panel";
import { Button } from "@/components/ui/button";
import {
  manilaDayLabel,
  manilaDayPart,
  manilaMonthName,
  manilaWeekdayIndex,
  paydayLabel,
} from "@/lib/dashboard/today";
import type { WisdomQuote } from "@/lib/gratitude/gratitude-reflections";
import { formatCentavos } from "@/lib/money/money";
import type { NextBestAction } from "@/lib/next-best-action/engine";
import type { Signal } from "@/lib/signals/engine";
import { formatTaskMinutes } from "@/lib/tasks/task-view";

export type DashboardData = {
  financial: FinancialSnapshot;
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

export type TodayDayline = {
  items: DashboardDaylineItem[];
  plannedMinutes?: number;
  capacityMinutes?: number;
  energyLevel?: string;
};

const greetings = {
  morning: { text: "Good morning", icon: Sunrise },
  afternoon: { text: "Good afternoon", icon: Sun },
  evening: { text: "Good evening", icon: Moon },
} as const;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function situationItems(dashboard: DashboardData): SituationItem[] {
  const { financial, tasks, career, goals } = dashboard;
  const leadGoal = goals[0];

  return [
    {
      label: "Available cash",
      area: "money",
      value: formatCentavos(financial.total_balance_centavos),
      detail: paydayLabel(financial.days_until_payday) ?? "Active accounts",
      href: "/money/accounts",
      sensitive: true,
    },
    {
      label: "Tasks",
      area: "tasks",
      value: `${tasks.overdue} overdue`,
      // Not `completed_today`: the snapshot counts it from UTC midnight.
      detail:
        tasks.remaining_minutes > 0
          ? `${tasks.today} due today · ${formatTaskMinutes(tasks.remaining_minutes, { compact: true })}`
          : `${tasks.today} due today`,
      href: "/tasks?view=overdue",
      urgent: tasks.overdue > 0,
    },
    {
      label: "Career",
      area: "career",
      value: plural(career.follow_up, "overdue follow-up"),
      detail:
        career.interviews > 0
          ? `${career.active} active · ${career.interviews} interviewing`
          : plural(career.active, "active application"),
      href: "/career",
      urgent: career.follow_up > 0,
    },
    {
      label: "Goals",
      area: "goals",
      value: `${goals.length} active`,
      detail: leadGoal
        ? `${leadGoal.title} · ${Math.round(leadGoal.progress_percent)}%`
        : "Define an outcome",
      href: "/goals",
      meter: leadGoal ? leadGoal.progress_percent / 100 : undefined,
    },
  ];
}

/** The Today page body, from data the page has already loaded. */
export function TodayDashboard({
  now,
  dashboard,
  dayline,
  nextBestActions,
  signals,
  wisdomQuote,
}: {
  now: Date;
  dashboard: DashboardData;
  dayline: TodayDayline;
  nextBestActions: NextBestAction[];
  signals: Signal[] | null;
  wisdomQuote: WisdomQuote;
}) {
  const daylineItems = dayline.items;
  const greeting = greetings[manilaDayPart(now)];
  const GreetingIcon = greeting.icon;

  return (
    <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tracking-[0.1em] uppercase">
            <span className="text-primary inline-flex items-center gap-1.5">
              <GreetingIcon aria-hidden="true" className="size-3.5" />
              {greeting.text}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/60">
              ·
            </span>
            <span className="text-muted-foreground">{manilaDayLabel(now)}</span>
          </p>
          <h1 className="mt-3 text-[2rem] leading-none font-semibold tracking-[-0.05em] sm:text-[2.5rem] lg:text-[2.875rem]">
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

      <div className="mt-7 sm:mt-8">
        <DaylineCommand
          items={daylineItems}
          plannedMinutes={dayline.plannedMinutes}
          capacityMinutes={dayline.capacityMinutes}
          energyLevel={dayline.energyLevel}
        />
      </div>

      <NextBestActions actions={nextBestActions} />

      <SituationStrip items={situationItems(dashboard)} />

      <div className="mt-8 grid gap-5 sm:mt-10 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)] xl:gap-6">
        <FinancialOverview
          financial={dashboard.financial}
          monthName={manilaMonthName(now)}
        />
        <SignalsPanel signals={signals} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-stretch xl:gap-6">
        <GratitudeCard
          initialQuote={wisdomQuote}
          compact
          className="rounded-[1.5rem]"
        />
        <WeekPosition
          dayIndex={manilaWeekdayIndex(now)}
          reviewComplete={dashboard.review_complete}
        />
      </div>
    </div>
  );
}
