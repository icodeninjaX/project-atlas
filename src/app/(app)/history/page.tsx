import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryFilters } from "@/components/history/history-filters";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  HISTORICAL_METRICS_VERSION,
  historicalWindow,
  metricDefinitions,
  type HistoricalMetric,
  type MetricGrain,
  type MetricKey,
} from "@/lib/history/metrics";
import { loadHistoricalMetrics } from "@/lib/history/server";
import { formatCentavos } from "@/lib/money/money";

export const metadata = { title: "Recorded history" };

function displayValue(row: HistoricalMetric) {
  if (row.value === null) return "No supported history";
  const unit = metricDefinitions[row.metric].unit;
  return unit === "centavos"
    ? formatCentavos(row.value)
    : unit === "score"
      ? `${row.value.toFixed(2)} / 10`
      : row.value.toLocaleString("en-PH");
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ grain?: string; months?: string }>;
}) {
  const query = await searchParams;
  const grain: MetricGrain =
    query.grain === "day" || query.grain === "week" ? query.grain : "month";
  const selectedMonths = (
    ["1", "3", "6", "12"].includes(query.months ?? "")
      ? Number(query.months)
      : 6
  ) as 1 | 3 | 6 | 12;
  const months = grain === "day" ? 1 : selectedMonths;
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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Deterministic metrics"
        title="Recorded history"
        description="Compare the records ATLAS can actually reconstruct. Every value is recalculated from your surviving source records."
      />
      <Link
        className="text-primary mt-4 inline-block text-sm underline underline-offset-2"
        href="/history/patterns"
      >
        Explore recorded patterns
      </Link>
      <HistoryFilters
        key={`${grain}-${months}`}
        initialGrain={grain}
        initialMonths={months}
      />
      <p className="text-muted-foreground mt-3 text-xs">
        {window.from} to {window.through} · Asia/Manila · metric version{" "}
        {HISTORICAL_METRICS_VERSION} · updated {updatedAt}
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        “Recorded” means source records exist from that date onward, not that
        every real-world event was entered. Blank periods before the first
        record and missing review scores stay blank. Partial periods include a
        date boundary or the start of available history.
      </p>
      {unavailable ? (
        <Card className="mt-6">
          <CardContent>
            History could not be loaded. Please try again after the database
            update is available.
          </CardContent>
        </Card>
      ) : rows === null ? (
        <Card className="mt-6">
          <CardContent>Sign in to see your recorded history.</CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {(Object.keys(metricDefinitions) as MetricKey[]).map((key) => {
            const definition = metricDefinitions[key];
            const series = rows.filter((row) => row.metric === key);
            const first = series.find(
              (row) => row.firstRecordedOn,
            )?.firstRecordedOn;
            return (
              <Card key={key} className="min-w-0">
                <CardHeader>
                  <CardTitle>{definition.label}</CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {definition.source}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {first
                      ? `Available from ${first}`
                      : "No source records yet"}{" "}
                    ·{" "}
                    <Link
                      className="text-primary underline underline-offset-2"
                      href={definition.href}
                    >
                      View source
                    </Link>
                  </p>
                </CardHeader>
                <CardContent>
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${definition.label} table`}
                    className="focus-visible:ring-ring max-h-80 overflow-auto rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <table className="w-full min-w-80 text-left text-sm">
                      <caption className="sr-only">
                        {definition.label} by {grain}
                      </caption>
                      <thead className="bg-muted/60 sticky top-0 text-xs">
                        <tr>
                          <th scope="col" className="p-2">
                            Period
                          </th>
                          <th scope="col" className="p-2">
                            Value
                          </th>
                          <th scope="col" className="p-2">
                            Sources
                          </th>
                          <th scope="col" className="p-2">
                            Coverage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...series].reverse().map((row) => {
                          const countedFrom = [
                            window.from,
                            row.period.from,
                            row.firstRecordedOn ?? row.period.from,
                          ]
                            .sort()
                            .at(-1)!;
                          const countedThrough =
                            row.period.through < window.through
                              ? row.period.through
                              : window.through;
                          const clipped =
                            row.coverage !== "insufficient" &&
                            (countedFrom !== row.period.from ||
                              countedThrough !== row.period.through);
                          return (
                            <tr
                              key={row.period.from}
                              className="border-t align-top"
                            >
                              <th scope="row" className="p-2 font-medium">
                                {row.period.from}
                                {grain === "day"
                                  ? ""
                                  : ` – ${row.period.through}`}
                                {clipped && (
                                  <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                                    Counted {countedFrom} – {countedThrough}
                                  </span>
                                )}
                              </th>
                              <td className="p-2 whitespace-nowrap">
                                <SensitiveValue>
                                  {displayValue(row)}
                                </SensitiveValue>
                              </td>
                              <td className="p-2">
                                <SensitiveValue>
                                  {row.sourceCount}
                                </SensitiveValue>
                              </td>
                              <td className="p-2 capitalize">{row.coverage}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
