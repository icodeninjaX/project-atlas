import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { glassCardClass, tileClass } from "@/components/history/history-chrome";
import styles from "@/components/history/history.module.css";
import { metricTones } from "@/components/history/metric-tone";
import { PairChart } from "@/components/history/pair-chart";
import {
  PairGlyph,
  findingAnchor,
  markCell,
  markWords,
} from "@/components/history/pattern-matrix";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  metricDefinitions,
  type HistoricalMetric,
} from "@/lib/history/metrics";
import { formatPeriodLabel } from "@/lib/history/period-label";
import {
  formatSigned,
  pairMonths,
  type Finding,
} from "@/lib/history/pattern-view";
import { formatMetricValue, plural } from "@/lib/history/view";
import { cn } from "@/lib/utils";

/** One qualified association: what moved, how strongly, and the months. */
export function FindingCard({
  finding,
  rows,
}: {
  finding: Finding;
  rows: HistoricalMetric[];
}) {
  const [first, second] = finding.metrics;
  const months = pairMonths(rows, finding.metrics);
  const headingId = `${findingAnchor(finding.metrics)}-heading`;
  const together = finding.direction === "together";

  return (
    <article
      id={findingAnchor(finding.metrics)}
      aria-labelledby={headingId}
      data-spotlight
      className={cn(glassCardClass, "scroll-mt-24 p-4 min-[360px]:p-5 sm:p-6")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex shrink-0 -space-x-2 @max-[20rem]:hidden"
          >
            {finding.metrics.map((metric) => {
              const tone = metricTones[metric];
              const Icon = tone.icon;
              return (
                <span
                  key={metric}
                  className={cn(
                    "bg-card grid size-10 place-items-center rounded-xl ring-1",
                    tone.ring,
                  )}
                >
                  <span
                    className={cn(
                      "grid size-full place-items-center rounded-xl",
                      tone.soft,
                      tone.text,
                    )}
                  >
                    <Icon className="size-[1.125rem]" />
                  </span>
                </span>
              );
            })}
          </span>
          <h3
            id={headingId}
            className="min-w-0 text-base leading-6 font-semibold tracking-[-0.01em] break-words"
          >
            {metricDefinitions[first].label} and{" "}
            {metricDefinitions[second].label}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold",
            markCell[finding.direction],
          )}
        >
          <PairGlyph mark={finding.direction} className="size-3.5" />
          {markWords[finding.direction]}
        </span>
      </div>

      <p className="text-muted-foreground mt-3 text-sm leading-6">
        <SensitiveValue>
          Month to month changes tended to move{" "}
          {together ? "together" : "in opposite directions"}. This does not show
          that either one caused the other.
        </SensitiveValue>
      </p>

      <div className="mt-5">
        <PairChart months={months} metrics={finding.metrics} />
      </div>

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,6.75rem),1fr))] gap-2.5">
        <div className={cn(tileClass, "min-[360px]:p-3.5")}>
          <dt className="text-muted-foreground text-[0.6875rem] leading-4">
            Pearson r of the changes
          </dt>
          <dd className="mt-1 font-mono text-lg leading-6 font-semibold tracking-[-0.02em] tabular-nums">
            <SensitiveValue>
              {formatSigned(finding.correlation, 3)}
            </SensitiveValue>
          </dd>
        </div>
        <div className={cn(tileClass, "min-[360px]:p-3.5")}>
          <dt className="text-muted-foreground text-[0.6875rem] leading-4">
            Monthly changes
          </dt>
          <dd className="mt-1 font-mono text-lg leading-6 font-semibold tracking-[-0.02em] tabular-nums">
            {finding.changes}
          </dd>
        </div>
        <div className={cn(tileClass, "min-[360px]:p-3.5")}>
          <dt className="text-muted-foreground text-[0.6875rem] leading-4">
            Estimated adjusted permutation p
          </dt>
          <dd className="mt-1 font-mono text-lg leading-6 font-semibold tracking-[-0.02em] tabular-nums">
            <SensitiveValue>{finding.adjustedP.toFixed(4)}</SensitiveValue>
          </dd>
        </div>
      </dl>

      <ul className="mt-4 flex flex-wrap gap-2">
        {finding.metrics.map((metric) => (
          <li key={metric}>
            <Link
              href={metricDefinitions[metric].href}
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary ring-border/80 focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8"
            >
              View {metricDefinitions[metric].label.toLowerCase()} source
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </li>
        ))}
      </ul>

      <details className="mt-3">
        <summary
          className={cn(
            styles.summary,
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <span>
            Monthly values{" "}
            <span className="font-normal">· {months.length} months</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4", styles.chevron)}
          />
        </summary>
        <div
          tabIndex={0}
          role="region"
          aria-label={`${metricDefinitions[first].label} and ${metricDefinitions[second].label} table`}
          className="focus-visible:ring-ring ring-border/80 mt-1 max-h-72 overflow-auto rounded-xl ring-1 focus-visible:ring-2 focus-visible:outline-none"
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Monthly values behind this association
            </caption>
            <thead className="bg-muted/80 text-muted-foreground sticky top-0 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase backdrop-blur">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Month
                </th>
                <th scope="col" className="px-2 py-2 text-right">
                  {metricTones[first].short}
                </th>
                <th scope="col" className="py-2 pr-3 pl-2 text-right">
                  {metricTones[second].short}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((item) => (
                <tr key={item.month} className="border-border/60 border-t">
                  <th scope="row" className="px-3 py-2.5 font-medium">
                    {formatPeriodLabel(item.month, item.through)}
                  </th>
                  {(
                    [
                      [first, item.first, "px-2"],
                      [second, item.second, "pr-3 pl-2"],
                    ] as const
                  ).map(([metric, reading, padding]) => (
                    <td
                      key={metric}
                      className={cn("py-2.5 text-right", padding)}
                    >
                      <span className="block font-mono whitespace-nowrap tabular-nums">
                        <SensitiveValue>
                          {reading.value === null
                            ? "No supported history"
                            : formatMetricValue(metric, reading.value)}
                        </SensitiveValue>
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        <SensitiveValue>
                          {plural(reading.sourceCount, "source")}
                        </SensitiveValue>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}
