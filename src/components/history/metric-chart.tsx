"use client";

import { useId } from "react";
import { CoverageChip } from "@/components/history/history-chrome";
import styles from "@/components/history/history.module.css";
import { metricTones } from "@/components/history/metric-tone";
import { useScrub } from "@/components/history/use-scrub";
import {
  SensitiveValue,
  usePrivacyMode,
} from "@/components/privacy/privacy-provider";
import {
  metricDefinitions,
  type MetricGrain,
  type MetricKey,
} from "@/lib/history/metrics";
import {
  axisLabel,
  countedLabel,
  coverageLabel,
  formatMetricValue,
  grainWord,
  plural,
  pointLabel,
  type HistoryPoint,
} from "@/lib/history/view";
import { cn } from "@/lib/utils";

/** The bucket the readout shows at rest: the latest with a value. */
function restingIndex(points: HistoryPoint[]) {
  for (let index = points.length - 1; index >= 0; index--)
    if (points[index]!.value !== null) return index;
  return points.length - 1;
}

/**
 * Each bucket as a bar: solid when recorded, striped when partial, a dashed
 * stub with no history. The pointer or the arrow keys pick a bucket for the
 * readout beneath; every value is also in the card's ledger.
 */
export function MetricChart({
  metric,
  points,
  scaleMax,
  typical,
  grain,
  contextYear,
  today,
}: {
  metric: MetricKey;
  points: HistoryPoint[];
  scaleMax: number;
  /** The mean of fully recorded buckets, drawn as a dashed rule. */
  typical: number | null;
  grain: MetricGrain;
  contextYear: number;
  /** Today in Manila. */
  today: string;
}) {
  const id = useId();
  const tone = metricTones[metric];
  const { hidden } = usePrivacyMode();
  const count = points.length;
  const label = metricDefinitions[metric].label;

  const describe = (position: number) => {
    const item = points[position]!;
    const value =
      item.value === null
        ? coverageLabel(metric, item.coverage)
        : hidden
          ? "value hidden"
          : formatMetricValue(metric, item.value);
    return `${pointLabel(item, contextYear)}: ${value}, ${plural(
      item.sourceCount,
      "source",
    )}, ${coverageLabel(metric, item.coverage).toLowerCase()}`;
  };
  const { index, active, announcement, handlers } = useScrub(
    count,
    restingIndex(points),
    describe,
  );
  const point = points[index];
  if (!point) return null;

  const middle = count >= 7 ? points[Math.floor((count - 1) / 2)] : null;
  const typicalTop =
    typical !== null && scaleMax > 0
      ? Math.min(100, (typical / scaleMax) * 100)
      : null;

  return (
    <div className="min-w-0">
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label} by ${grainWord(grain)}. Use the arrow keys to read each ${grainWord(grain)}.`}
        aria-describedby={`${id}-readout`}
        {...handlers}
        className="focus-visible:ring-ring relative h-28 touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--card)] sm:h-32"
      >
        <div
          aria-hidden="true"
          className="border-border/70 absolute inset-0 flex items-end gap-[2px] border-b pb-px sm:gap-[3px]"
        >
          {points.map((item, position) => {
            const selected = position === index;
            const dim = active && !selected;
            const value = item.value;
            return (
              <span
                key={item.from}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-[5px] transition-colors",
                  selected && active && "bg-foreground/[0.04]",
                )}
              >
                {value === null ? (
                  <span
                    className={cn(
                      "h-[3px] w-full max-w-11 rounded-full transition-opacity",
                      styles.none,
                      dim && "opacity-50",
                    )}
                  />
                ) : value === 0 ? (
                  <span
                    className={cn(
                      "h-[3px] w-full max-w-11 rounded-full opacity-40 transition-opacity",
                      tone.dot,
                      dim && "opacity-20",
                    )}
                  />
                ) : (
                  <span
                    style={{
                      height: `${Math.max(4, (value / scaleMax) * 100)}%`,
                    }}
                    className={cn(
                      "w-full max-w-11 rounded-t-[5px] rounded-b-[2px] transition-opacity",
                      styles.rise,
                      tone.bar,
                      item.coverage === "partial"
                        ? styles.partial
                        : styles.solid,
                      dim && "opacity-40",
                      selected &&
                        active &&
                        "outline-2 outline-offset-2 outline-current",
                    )}
                  />
                )}
              </span>
            );
          })}
        </div>
        {typicalTop !== null ? (
          <span
            aria-hidden="true"
            style={{ bottom: `calc(${typicalTop}% - 0.5px)` }}
            className={cn(
              "pointer-events-none absolute inset-x-0 h-px",
              styles.typical,
            )}
          />
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="text-muted-foreground mt-2 flex justify-between gap-3 font-mono text-[0.6875rem]"
      >
        <span>{axisLabel(points[0]!, grain, contextYear, today)}</span>
        {middle ? (
          <span className="max-[359px]:hidden">
            {axisLabel(middle, grain, contextYear, today)}
          </span>
        ) : null}
        {count > 1 ? (
          <span>{axisLabel(points.at(-1)!, grain, contextYear, today)}</span>
        ) : null}
      </div>

      <div
        id={`${id}-readout`}
        className="bg-background/55 ring-border/70 mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl px-3.5 py-3 ring-1"
      >
        <div className="min-w-0">
          <p className="text-sm leading-5 font-semibold tracking-[-0.01em]">
            {pointLabel(point, contextYear)}
            {point.current ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · so far
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs leading-5">
            {point.clipped ? (
              <>Counted {countedLabel(point, contextYear)} · </>
            ) : null}
            <SensitiveValue>
              {plural(point.sourceCount, "source")}
            </SensitiveValue>
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className={cn(
              "font-mono text-base font-semibold tracking-[-0.02em] tabular-nums",
              point.value === null && "text-muted-foreground",
            )}
          >
            {point.value === null ? (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">No supported history</span>
              </>
            ) : (
              <SensitiveValue>
                {formatMetricValue(metric, point.value)}
              </SensitiveValue>
            )}
          </p>
          <CoverageChip
            coverage={point.coverage}
            label={coverageLabel(metric, point.coverage)}
          />
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
