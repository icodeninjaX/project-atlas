import { HistoryScreen } from "@/components/history/history-screen";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  HISTORICAL_METRICS_VERSION,
  historicalWindow,
  type HistoricalMetric,
} from "@/lib/history/metrics";
import { loadHistoricalMetrics } from "@/lib/history/server";
import { parseHistoryView } from "@/lib/history/view";

export const metadata = { title: "Recorded history" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ grain?: string; months?: string }>;
}) {
  const { grain, months } = parseHistoryView(await searchParams);
  const today = manilaToday(new Date());
  const window = historicalWindow(today, grain, months);
  let rows: HistoricalMetric[] | null = null;
  let unavailable = false;
  try {
    rows = await loadHistoricalMetrics({ ...window, grain });
  } catch {
    unavailable = true;
  }
  const updatedAt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <HistoryScreen
      rows={rows}
      unavailable={unavailable}
      grain={grain}
      months={months}
      window={window}
      today={today}
      updatedAt={updatedAt}
      version={HISTORICAL_METRICS_VERSION}
    />
  );
}
