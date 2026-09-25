import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  ASSOCIATION_TESTS,
  ASSOCIATION_VERSION,
  associationWindow,
  discoverAllAssociations,
} from "@/lib/history/associations";
import { metricDefinitions } from "@/lib/history/metrics";
import { loadHistoricalMetrics } from "@/lib/history/server";
import { formatCentavos } from "@/lib/money/money";

export const metadata = { title: "Recorded patterns" };

function displayValue(
  metric: keyof typeof metricDefinitions,
  value: number | null,
) {
  if (value === null) return "No supported history";
  const unit = metricDefinitions[metric].unit;
  return unit === "centavos"
    ? formatCentavos(value)
    : unit === "score"
      ? `${value.toFixed(2)} / 10`
      : value.toLocaleString("en-PH");
}

export default async function PatternsPage() {
  const window = associationWindow(manilaToday(new Date()));
  let rows: Awaited<ReturnType<typeof loadHistoricalMetrics>> = null;
  let unavailable = false;
  try {
    rows = await loadHistoricalMetrics({ ...window, grain: "month" });
  } catch {
    unavailable = true;
  }
  const results = rows ? discoverAllAssociations(rows) : [];
  const findings = results.filter((result) => result.status === "found");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Recorded history"
        title="Patterns"
        description="Look for repeated monthly movement in your surviving records. Findings describe associations, not causes."
      />
      <Link
        className="text-primary mt-4 inline-block text-sm underline underline-offset-2"
        href="/history"
      >
        View monthly history
      </Link>
      <p className="text-muted-foreground mt-4 text-sm">
        {window.from} to {window.through} · eleven completed Asia/Manila
        calendar months · method version {ASSOCIATION_VERSION}
      </p>
      {unavailable || rows === null ? (
        <Card className="mt-6">
          <CardContent>
            {unavailable
              ? "Patterns could not be loaded. Try again when recorded history is available."
              : "Sign in to see your recorded patterns."}
          </CardContent>
        </Card>
      ) : (
        <>
          {findings.length === 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>No reliable pattern to show yet</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                The recorded months do not meet all coverage, activity and
                statistical checks. ATLAS withholds weak or uncertain
                associations.
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {findings.map((finding) => {
                const [first, second] = finding.metrics;
                const byMonth = rows
                  .filter((row) => row.metric === first)
                  .map((row) => ({
                    month: row.period.from,
                    first: row.value,
                    firstCount: row.sourceCount,
                    second: rows.find(
                      (other) =>
                        other.metric === second &&
                        other.period.from === row.period.from,
                    )?.value,
                    secondCount: rows.find(
                      (other) =>
                        other.metric === second &&
                        other.period.from === row.period.from,
                    )?.sourceCount,
                  }));
                return (
                  <Card key={`${first}.${second}`} className="min-w-0">
                    <CardHeader>
                      <CardTitle>
                        {metricDefinitions[first].label} and{" "}
                        {metricDefinitions[second].label}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        <SensitiveValue>
                          Month to month changes tended to move{" "}
                          {finding.direction === "together"
                            ? "together"
                            : "in opposite directions"}
                          . This does not show that either one caused the other.
                        </SensitiveValue>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        <SensitiveValue>
                          Pearson r {finding.correlation.toFixed(3)}
                        </SensitiveValue>{" "}
                        · {finding.changes} monthly changes · estimated adjusted
                        permutation p{" "}
                        <SensitiveValue>
                          {finding.adjustedP.toFixed(4)}
                        </SensitiveValue>
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Each metric has at least twelve contributing records and
                        activity in six months. All eleven months have full
                        recorded coverage. The test compares changes, checks
                        each month for outlier influence, and adjusts for all{" "}
                        {ASSOCIATION_TESTS} supported metric pairs. A finding
                        requires estimated adjusted p at most 0.01.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <Link
                          className="text-primary underline underline-offset-2"
                          href={metricDefinitions[first].href}
                        >
                          View {metricDefinitions[first].label.toLowerCase()}{" "}
                          source
                        </Link>
                        <Link
                          className="text-primary underline underline-offset-2"
                          href={metricDefinitions[second].href}
                        >
                          View {metricDefinitions[second].label.toLowerCase()}{" "}
                          source
                        </Link>
                      </div>
                      <div className="mt-4 max-h-64 overflow-auto rounded-lg border">
                        <table className="w-full min-w-80 text-left text-sm">
                          <caption className="sr-only">
                            Monthly values behind this association
                          </caption>
                          <thead className="bg-muted/60 sticky top-0">
                            <tr>
                              <th className="p-2" scope="col">
                                Month
                              </th>
                              <th className="p-2" scope="col">
                                {metricDefinitions[first].label}
                              </th>
                              <th className="p-2" scope="col">
                                {metricDefinitions[second].label}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {byMonth.map((item) => (
                              <tr className="border-t" key={item.month}>
                                <th className="p-2" scope="row">
                                  {item.month}
                                </th>
                                <td className="p-2">
                                  <SensitiveValue>
                                    {displayValue(first, item.first)}
                                  </SensitiveValue>
                                  <span className="text-muted-foreground block text-xs">
                                    <SensitiveValue>
                                      {item.firstCount} sources
                                    </SensitiveValue>
                                  </span>
                                </td>
                                <td className="p-2">
                                  <SensitiveValue>
                                    {displayValue(second, item.second ?? null)}
                                  </SensitiveValue>
                                  <span className="text-muted-foreground block text-xs">
                                    <SensitiveValue>
                                      {item.secondCount} sources
                                    </SensitiveValue>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <p className="text-muted-foreground mt-6 text-sm">
            These calculations use surviving records as they exist now. Deleted,
            edited or unrecorded activity may change a result. Shared trends,
            seasonality and other factors can still explain a finding. A lack of
            a finding does not prove no relationship.
          </p>
        </>
      )}
    </div>
  );
}
