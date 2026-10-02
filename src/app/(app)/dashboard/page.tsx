import {
  TodayDashboard,
  type DashboardData,
} from "@/components/dashboard/today-dashboard";
import { manilaIsoDate } from "@/lib/dashboard/today";
import { loadDayline } from "@/lib/dayline/server";
import { getRandomWisdomQuote } from "@/lib/gratitude/gratitude-reflections";
import { loadNextBestActions } from "@/lib/next-best-action/server";
import { selectDashboardSignals } from "@/lib/signals/engine";
import { loadSignals } from "@/lib/signals/server";
import { createClient } from "@/lib/supabase/server";

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
  const nextBestActions =
    supabase && daylineResult
      ? await loadNextBestActions(supabase, daylineResult).catch(() => [])
      : [];

  return (
    <TodayDashboard
      now={now}
      dashboard={dashboard}
      dayline={{
        items: daylineItems,
        plannedMinutes: daylineResult?.plannedMinutes,
        capacityMinutes: daylineResult?.capacityMinutes,
        energyLevel: daylineResult?.energyLevel,
      }}
      nextBestActions={nextBestActions}
      signals={dashboardSignals}
      wisdomQuote={wisdomQuote}
    />
  );
}
