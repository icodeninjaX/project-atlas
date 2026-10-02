import { ChevronDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CoverageChip,
  eyebrowClass,
  glassCardClass,
} from "@/components/history/history-chrome";
import styles from "@/components/history/history.module.css";
import { MetricChart } from "@/components/history/metric-chart";
import { metricTones } from "@/components/history/metric-tone";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { metricDefinitions, type MetricGrain } from "@/lib/history/metrics";
import { formatPeriodLabel } from "@/lib/history/period-label";
import {
  countGrain,
  countedLabel,
  coverageLabel,
  formatMetricValue,
  grainWord,
  plural,
  pointLabel,
  type HistorySeries,
} from "@/lib/history/view";
import { cn } from "@/lib/utils";

function Stat({
  label,
  children,
  note,
}: {
  label: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[0.6875rem] leading-4">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm leading-5 font-semibold tracking-[-0.01em] break-words tabular-nums">
        {children}
      </dd>
      {note ? (
        <dd className="text-muted-foreground text-[0.6875rem] leading-4 break-words">
          {note}
        </dd>
      ) : null}
    </div>
  );
}

/** Every bucket, newest first, behind a disclosure under the chart. */
function Ledger({
  series,
  grain,
  contextYear,
}: {
  series: HistorySeries;
  grain: MetricGrain;
  contextYear: number;
}) {
  const definition = metricDefinitions[series.metric];
  return (
    <details className="mt-3">
      <summary
        className={cn(
          styles.summary,
          "text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <span>
          Period ledger{" "}
          <span className="font-normal">
            · {countGrain(series.points.length, grain)}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4", styles.chevron)}
        />
      </summary>
      <div
        tabIndex={0}
        role="region"
        aria-label={`${definition.label} table`}
        className="focus-visible:ring-ring ring-border/80 mt-1 max-h-80 overflow-auto rounded-xl ring-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            {definition.label} by {grainWord(grain)}
          </caption>
          <thead className="bg-muted/80 text-muted-foreground sticky top-0 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase backdrop-blur">
            <tr>
              <th scope="col" className="px-3 py-2">
                Period
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Value
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Sources
              </th>
              <th scope="col" className="py-2 pr-3 pl-2">
                <span className="sr-only">Coverage</span>
                <span aria-hidden="true" className="max-[380px]:hidden">
                  Coverage
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...series.points].reverse().map((point) => (
              <tr
                key={point.from}
                className="border-border/60 border-t align-top"
              >
                <th scope="row" className="px-3 py-2.5 font-medium">
                  {pointLabel(point, contextYear)}
                  {point.clipped ? (
                    <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                      Counted {countedLabel(point, contextYear)}
                    </span>
                  ) : null}
                </th>
                <td className="px-2 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                  {point.value === null ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground"
                      >
                        —
                      </span>
                      <span className="sr-only">No supported history</span>
                    </>
                  ) : (
                    <SensitiveValue>
                      {formatMetricValue(series.metric, point.value)}
                    </SensitiveValue>
                  )}
                </td>
                <td className="text-muted-foreground px-2 py-2.5 text-right font-mono tabular-nums">
                  <SensitiveValue>{point.sourceCount}</SensitiveValue>
                </td>
                <td className="py-2 pr-3 pl-2">
                  <CoverageChip
                    coverage={point.coverage}
                    label={coverageLabel(series.metric, point.coverage)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** One series: its total, typical and peak buckets, chart, and ledger. */
export function MetricCard({
  series,
  grain,
  contextYear,
  today,
}: {
  series: HistorySeries;
  grain: MetricGrain;
  contextYear: number;
  /** Today in Manila. */
  today: string;
}) {
  const definition = metricDefinitions[series.metric];
  const tone = metricTones[series.metric];
  const Icon = tone.icon;
  const score = definition.unit === "score";
  const headingId = `series-${series.metric}-heading`;
  const first = series.firstRecordedOn;

  return (
    <section
      id={`series-${series.metric}`}
      aria-labelledby={headingId}
      data-spotlight
      className={cn(glassCardClass, "scroll-mt-24 p-4 min-[360px]:p-5 sm:p-6")}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-[14rem] items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[16rem]:hidden",
              tone.soft,
              tone.text,
              tone.ring,
            )}
          >
            <Icon className="size-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <h3
              id={headingId}
              className="text-base leading-6 font-semibold tracking-[-0.01em]"
            >
              {definition.label}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
              {definition.source}
            </p>
          </div>
        </div>
        <Link
          href={definition.href}
          aria-label={`View source in ${tone.place}`}
          className="text-muted-foreground hover:bg-primary/10 hover:text-primary ring-border/80 focus-visible:ring-ring -mt-0.5 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8"
        >
          {tone.place}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      <div className="mt-5">
        <p className={eyebrowClass}>
          {score ? "Average score" : "Total in view"}
        </p>
        {series.headline === null ? (
          <p className="text-muted-foreground mt-1.5 font-mono text-[1.75rem] leading-tight font-semibold tracking-[-0.04em]">
            <span aria-hidden="true">—</span>
            <span className="sr-only">No supported history</span>
          </p>
        ) : (
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
            <SensitiveValue className="from-foreground to-foreground/65 bg-gradient-to-br bg-clip-text font-mono text-[1.75rem] leading-tight font-semibold tracking-[-0.04em] break-all text-transparent tabular-nums sm:text-[2rem]">
              {score
                ? series.headline.toFixed(2)
                : formatMetricValue(series.metric, series.headline)}
            </SensitiveValue>
            {score ? (
              <span className="text-muted-foreground text-sm font-medium">
                / 10
              </span>
            ) : null}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          {first ? (
            <>
              Across {countGrain(series.points.length, grain)} ·{" "}
              <SensitiveValue>
                {plural(series.sources, score ? "review" : "record")}
              </SensitiveValue>
            </>
          ) : (
            "No source records yet"
          )}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] gap-x-4 gap-y-3">
        <Stat
          label={`Typical ${grainWord(grain)}`}
          note={
            series.typical === null
              ? `Needs two full ${grainWord(grain)}s`
              : `Of ${series.typicalCount} full ${grainWord(grain)}s`
          }
        >
          {series.typical === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <SensitiveValue>
              {formatMetricValue(series.metric, series.typical)}
            </SensitiveValue>
          )}
        </Stat>
        <Stat
          label={score ? "Best" : "Peak"}
          note={series.peak ? pointLabel(series.peak, contextYear) : "None yet"}
        >
          {series.peak?.value ? (
            <SensitiveValue>
              {formatMetricValue(series.metric, series.peak.value)}
            </SensitiveValue>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Stat>
        <Stat label="Recorded since">
          {first ? (
            formatPeriodLabel(first, first)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Stat>
      </dl>

      <div className="mt-5">
        <MetricChart
          metric={series.metric}
          points={series.points}
          scaleMax={series.scaleMax}
          typical={series.typical}
          grain={grain}
          contextYear={contextYear}
          today={today}
        />
      </div>

      <Ledger series={series} grain={grain} contextYear={contextYear} />
    </section>
  );
}
