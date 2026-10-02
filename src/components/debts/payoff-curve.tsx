"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MoneyAmount } from "@/components/money/money-amount";
import { payoffMonthLabel } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

export type CurveSeries = {
  key: string;
  label: string;
  /** Balance at the end of each month; [0] is today's. */
  balances: number[];
  color: string;
};

const WIDTH = 600;
const HEIGHT = 200;

/** The top of the scale: a clean peso step just above the highest value. */
function niceMax(value: number) {
  if (value <= 0) return 100;
  const pesos = value / 100;
  const power = 10 ** Math.floor(Math.log10(pesos));
  const step =
    [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10].find(
      (multiple) => multiple * power >= pesos,
    ) ?? 10;
  return step * power * 100;
}

/**
 * "₱100K", "₱2.5M": written out by hand because compact notation differs
 * between the server's and the browser's ICU data.
 */
function compactPesos(centavos: number) {
  const pesos = centavos / 100;
  const [divisor, unit] =
    pesos >= 1_000_000
      ? [1_000_000, "M"]
      : pesos >= 1_000
        ? [1_000, "K"]
        : [1, ""];
  const value = Math.round((pesos / divisor) * 10) / 10;
  return `₱${value}${unit}`;
}

/**
 * Projected balance month by month, one line per series, with a crosshair
 * that follows the pointer or the arrow keys. Every value is also in the
 * caller's text and table.
 */
export function PayoffCurve({
  series,
  months,
  today,
  label,
}: {
  series: CurveSeries[];
  /** Months to draw from now. */
  months: number;
  /** YYYY-MM-DD in Manila. */
  today: string;
  label: string;
}) {
  const id = useId();
  const [index, setIndex] = useState<number | null>(null);
  const span = Math.max(months, 1);
  const top = niceMax(
    Math.max(...series.flatMap((item) => item.balances.slice(0, span + 1))),
  );
  const x = (month: number) => (month / span) * WIDTH;
  const y = (centavos: number) => HEIGHT - (centavos / top) * HEIGHT;
  const valueAt = (item: CurveSeries, month: number) =>
    item.balances[Math.min(month, item.balances.length - 1)] ?? 0;
  const path = (item: CurveSeries) =>
    Array.from(
      { length: span + 1 },
      (_, month) =>
        `${month === 0 ? "M" : "L"}${x(month).toFixed(2)},${y(valueAt(item, month)).toFixed(2)}`,
    ).join("");
  const ticks = [top, top / 2, 0];

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setIndex(Math.round(Math.min(Math.max(ratio, 0), 1) * span));
  };
  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      PageUp: 12,
      PageDown: -12,
    };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setIndex(event.key === "Home" ? 0 : span);
      return;
    }
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    setIndex((current) => Math.min(Math.max((current ?? 0) + move, 0), span));
  };

  const share = index === null ? 0 : index / span;

  return (
    <div className="min-w-0">
      {series.length > 1 ? (
        <ul className="text-muted-foreground mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-0.5 w-4 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div
          aria-hidden="true"
          className="text-muted-foreground flex h-40 flex-col justify-between py-0 text-right font-mono text-[0.625rem] leading-none sm:h-48"
        >
          {ticks.map((tick) => (
            <span key={tick}>{compactPesos(tick)}</span>
          ))}
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label={`${label}. Use the arrow keys to read month by month.`}
          aria-describedby={index === null ? undefined : `${id}-readout`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setIndex(null);
          }}
          onKeyDown={step}
          onFocus={() => setIndex((current) => current ?? 0)}
          onBlur={() => setIndex(null)}
          className="focus-visible:ring-ring relative h-40 touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--card)] sm:h-48"
        >
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={WIDTH}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((item, position) =>
              position === series.length - 1 ? (
                <path
                  key={`${item.key}-area`}
                  d={`${path(item)}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`}
                  fill={item.color}
                  opacity={0.1}
                />
              ) : null,
            )}
            {series.map((item) => (
              <path
                key={item.key}
                d={path(item)}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {index !== null ? (
              <line
                x1={x(index)}
                x2={x(index)}
                y1={0}
                y2={HEIGHT}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {index !== null
            ? series.map((item) => (
                <span
                  key={item.key}
                  aria-hidden="true"
                  className="ring-card absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                  style={{
                    left: `${share * 100}%`,
                    top: `${(y(valueAt(item, index)) / HEIGHT) * 100}%`,
                    background: item.color,
                  }}
                />
              ))
            : null}
          {index !== null ? (
            <div
              id={`${id}-readout`}
              className={cn(
                "bg-card/95 ring-border pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl px-3 py-2 text-xs shadow-[0_12px_32px_-12px_rgb(7_10_15/0.45)] ring-1 backdrop-blur",
                share > 0.55
                  ? "-translate-x-[calc(100%+0.75rem)]"
                  : "translate-x-3",
              )}
              style={{ left: `${share * 100}%` }}
            >
              <p className="text-muted-foreground font-medium">
                {index === 0 ? "Today" : payoffMonthLabel(today, index)}
              </p>
              <ul className="mt-1 grid gap-0.5">
                {series.map((item) => (
                  <li key={item.key} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ background: item.color }}
                    />
                    <MoneyAmount
                      centavos={valueAt(item, index)}
                      className="font-mono font-semibold"
                    />
                    <span className="text-muted-foreground sr-only">
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <span />
        <div
          aria-hidden="true"
          className="text-muted-foreground mt-2 flex justify-between font-mono text-[0.6875rem]"
        >
          <span>Now</span>
          {span >= 6 ? (
            <span className="max-[359px]:hidden">
              {payoffMonthLabel(today, Math.round(span / 2))}
            </span>
          ) : null}
          <span>{payoffMonthLabel(today, span)}</span>
        </div>
      </div>
    </div>
  );
}
