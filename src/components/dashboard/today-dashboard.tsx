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
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";
import { SignalsPanel } from "@/components/signals/signals-panel";
import { Button } from "@/components/ui/button";
import { monthPace } from "@/lib/budgets/plan";
import {
  manilaDayLabel,
  manilaDayPart,
  manilaIsoDate,
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
  const today = manilaIsoDate(now);

  return (
    <PageShell>
      <PageHeading
        eyebrow={greeting.text}
        icon={greeting.icon}
        meta={manilaDayLabel(now)}
        title={
          daylineItems.length ? "Your Day, Mapped." : "Your route is clear."
        }
        description={
          daylineItems.length
            ? "One clear move now. The rest of your system stays within reach."
            : "Add what matters and ATLAS will surface the next useful move."
        }
        actions={
          <>
            <Button asChild variant="secondary" className="backdrop-blur">
              <Link href="/money/transactions?create=true">
                <CircleDollarSign aria-hidden="true" className="size-4" />
                Record expense
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tasks?create=true">
                <Plus aria-hidden="true" className="size-4" />
                Add task
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 sm:mt-8">
        <DaylineCommand
          items={daylineItems}
          plannedMinutes={dayline.plannedMinutes}
          capacityMinutes={dayline.capacityMinutes}
          energyLevel={dayline.energyLevel}
          now={now}
        />
      </div>

      <NextBestActions actions={nextBestActions} />

      <SituationStrip items={situationItems(dashboard)} />

      <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)] xl:gap-6">
        <FinancialOverview
          financial={dashboard.financial}
          monthName={manilaMonthName(now)}
          pace={monthPace(today.slice(0, 7), today)}
        />
        <SignalsPanel signals={signals} />
      </div>

      <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-stretch xl:gap-6">
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
    </PageShell>
  );
}
