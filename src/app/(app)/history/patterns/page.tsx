import { PatternsScreen } from "@/components/history/patterns-screen";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  ASSOCIATION_VERSION,
  associationWindow,
  discoverAllAssociations,
} from "@/lib/history/associations";
import type { HistoricalMetric } from "@/lib/history/metrics";
import { loadHistoricalMetrics } from "@/lib/history/server";

export const metadata = { title: "Recorded patterns" };

export default async function PatternsPage() {
  const window = associationWindow(manilaToday(new Date()));
  let rows: HistoricalMetric[] | null = null;
  let unavailable = false;
  try {
    rows = await loadHistoricalMetrics({ ...window, grain: "month" });
  } catch {
    unavailable = true;
  }

  return (
    <PatternsScreen
      rows={rows}
      results={rows ? discoverAllAssociations(rows) : []}
      unavailable={unavailable}
      window={window}
      version={ASSOCIATION_VERSION}
    />
  );
}
