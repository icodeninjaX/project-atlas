"use client";

import { useId } from "react";
import styles from "@/components/history/history.module.css";
import { metricTones } from "@/components/history/metric-tone";
import { useScrub } from "@/components/history/use-scrub";
import {
  SensitiveValue,
  usePrivacyMode,
} from "@/components/privacy/privacy-provider";
import { metricDefinitions, type MetricKey } from "@/lib/history/metrics";
import { formatPeriodLabel } from "@/lib/history/period-label";
import type { PairMonth } from "@/lib/history/pattern-view";
import { formatMetricValue } from "@/lib/history/view";
import { cn } from "@/lib/utils";

const WIDTH = 600;
const HEIGHT = 200;
/** Room above and below the lines so dots and strokes are never cut. */
const INSET = 0.1;

/** Each value's place between its own series' lowest and highest. */
function scaled(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  const low = Math.min(...known);
  const high = Math.max(...known);
  return values.map((value) =>
    value === null ? null : high === low ? 0.5 : (value - low) / (high - low),
  );
}

/**
 * Two series month by month, each on its own scale so their movement can
 * be compared whatever their units. The pointer or arrow keys pick a month;
 * every value is also in the card's table.
 */
export function PairChart({
  months,
  metrics: [first, second],
}: {
  months: PairMonth[];
  metrics: [MetricKey, MetricKey];
}) {
  const id = useId();
  const { hidden } = usePrivacyMode();
  const lines = [
    { metric: first, places: scaled(months.map((item) => item.first.value)) },
    {
      metric: second,
      places: scaled(months.map((item) => item.second.value)),
    },
  ];
  const count = months.length;
  const x = (position: number) => (count === 1 ? 0.5 : position / (count - 1));
  const y = (place: number) => 1 - INSET - place * (1 - 2 * INSET);

  const value = (metric: MetricKey, amount: number | null) =>
    amount === null ? "No value" : formatMetricValue(metric, amount);
  const describe = (position: number) => {
    const month = months[position]!;
    const read = (metric: MetricKey, amount: number | null) =>
      `${metricDefinitions[metric].label} ${hidden && amount !== null ? "hidden" : value(metric, amount)}`;
    return `${formatPeriodLabel(month.month, month.through)}: ${read(first, month.first.value)}, ${read(second, month.second.value)}`;
  };
  const { index, active, announcement, handlers } = useScrub(
    count,
    count - 1,
    describe,
  );
  const month = months[index];
  if (!month) return null;

  return (
    <div className="min-w-0">
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {lines.map((line) => (
          <li key={line.metric} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "w-4 rounded-full",
                lines[0] === line ? "h-1" : "h-0.5",
                metricTones[line.metric].dot,
              )}
            />
            {metricDefinitions[line.metric].label}
          </li>
        ))}
        <li className="text-muted-foreground/80">Each on its own scale</li>
      </ul>
      <div
        role="group"
        tabIndex={0}
        aria-label={`${metricDefinitions[first].label} and ${metricDefinitions[second].label} by month. Use the arrow keys to read each month.`}
        aria-describedby={`${id}-readout`}
        {...handlers}
        className="focus-visible:ring-ring relative mt-3 h-36 touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--card)] sm:h-40"
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className={cn(
            "absolute inset-0 size-full overflow-visible",
            styles.reveal,
          )}
        >
          {[INSET, 0.5, 1 - INSET].map((rule) => (
            <line
              key={rule}
              x1={0}
              x2={WIDTH}
              y1={rule * HEIGHT}
              y2={rule * HEIGHT}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={rule === 0.5 ? "4 6" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {active ? (
            <line
              x1={x(index) * WIDTH}
              x2={x(index) * WIDTH}
              y1={0}
              y2={HEIGHT}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {lines.map((line, order) => {
            const path = line.places
              .map((place, position) =>
                place === null
                  ? null
                  : `${x(position) * WIDTH},${y(place) * HEIGHT}`,
              )
              .filter(Boolean)
              .map((point, position) => `${position ? "L" : "M"}${point}`)
              .join("");
            return (
              <g key={line.metric} className={metricTones[line.metric].bar}>
                {order === 0 ? (
                  <path
                    d={`${path}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`}
                    fill="currentColor"
                    opacity={0.08}
                  />
                ) : null}
                {/* The first line runs wider beneath, so a second that
                    tracks it closely still shows both. */}
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={order === 0 ? 4 : 1.75}
                  strokeOpacity={order === 0 ? 0.75 : 1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
        {lines.flatMap((line) =>
          line.places.map((place, position) =>
            place === null ? null : (
              <span
                key={`${line.metric}-${position}`}
                aria-hidden="true"
                className={cn(
                  "ring-card absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 transition-[width,height]",
                  metricTones[line.metric].dot,
                  position === index && active ? "size-3" : "size-1.5",
                )}
                style={{
                  left: `${x(position) * 100}%`,
                  top: `${y(place) * 100}%`,
                }}
              />
            ),
          ),
        )}
      </div>
      <div
        aria-hidden="true"
        className="text-muted-foreground mt-2 flex justify-between font-mono text-[0.6875rem]"
      >
        <span>{formatPeriodLabel(months[0]!.month, months[0]!.through)}</span>
        <span>
          {formatPeriodLabel(months.at(-1)!.month, months.at(-1)!.through)}
        </span>
      </div>
      <div
        id={`${id}-readout`}
        className="bg-background/55 ring-border/70 mt-3 rounded-2xl px-3.5 py-3 ring-1"
      >
        <p className="text-sm leading-5 font-semibold tracking-[-0.01em]">
          {formatPeriodLabel(month.month, month.through)}
        </p>
        <dl className="mt-1.5 grid gap-1">
          {(
            [
              [first, month.first],
              [second, month.second],
            ] as const
          ).map(([metric, reading]) => (
            <div
              key={metric}
              className="flex flex-wrap items-baseline justify-between gap-x-3"
            >
              <dt className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    metricTones[metric].dot,
                  )}
                />
                {metricDefinitions[metric].label}
              </dt>
              <dd className="font-mono text-sm font-semibold tabular-nums">
                <SensitiveValue>{value(metric, reading.value)}</SensitiveValue>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
