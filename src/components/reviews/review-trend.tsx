"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

export type TrendPoint = {
  id: string;
  /** "Sep 21–27". */
  label: string;
  energy: number | null;
  stress: number | null;
  overall: number | null;
};

const series = [
  { key: "overall", name: "Overall", color: "var(--color-score-overall)" },
  { key: "energy", name: "Energy", color: "var(--color-score-energy)" },
  {
    key: "stress",
    name: "Stress",
    color: "var(--color-score-stress)",
    dash: "5 4",
  },
] as const;

/** Values lead, names follow; each row keyed by a short stroke. */
function TrendTooltip({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="bg-card/95 ring-border min-w-36 rounded-xl px-3 py-2.5 text-xs shadow-[0_12px_32px_-12px_rgb(7_10_15/0.5)] ring-1 backdrop-blur">
      <p className="text-muted-foreground font-medium">Week of {point.label}</p>
      <ul className="mt-2 space-y-1.5">
        {series.map(({ key, name, color, ...rest }) => (
          <li key={key} className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              width="14"
              height="4"
              style={{ stroke: color }}
            >
              <line
                x1="1"
                y1="2"
                x2="13"
                y2="2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={"dash" in rest ? "3 2" : undefined}
              />
            </svg>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {point[key] ?? "—"}
            </span>
            <span className="text-muted-foreground">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Energy, stress, and overall by week, oldest to newest, on one 0–10
 * scale. The week being read is marked; selecting a week opens it.
 */
export function ReviewTrend({
  data,
  selectedId,
  onSelect,
}: {
  data: TrendPoint[];
  selectedId?: string;
  onSelect?: (reviewId: string) => void;
}) {
  const selected = data.find((point) => point.id === selectedId);
  return (
    <div
      className="h-64 w-full sm:h-72 [&_.recharts-surface]:overflow-visible"
      role="img"
      aria-label="Weekly overall, energy, and stress scores from zero to ten. The table below lists every value."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -28 }}
          className={onSelect ? "cursor-pointer" : undefined}
          onClick={(state) => {
            const index = Number(state?.activeTooltipIndex);
            const point = Number.isInteger(index) ? data[index] : undefined;
            if (point && onSelect) onSelect(point.id);
          }}
        >
          <defs>
            <linearGradient
              id="review-overall-wash"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-score-overall)"
                stopOpacity={0.16}
              />
              <stop
                offset="100%"
                stopColor="var(--color-score-overall)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={16}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          {selected ? (
            <ReferenceLine
              x={selected.label}
              stroke="var(--primary)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          ) : null}
          <Tooltip
            content={TrendTooltip}
            cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
          />
          <Area
            type="monotone"
            dataKey="overall"
            stroke="none"
            fill="url(#review-overall-wash)"
            connectNulls
            isAnimationActive={false}
            tooltipType="none"
          />
          {series.map(({ key, name, color, ...rest }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={name}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={"dash" in rest ? rest.dash : undefined}
              connectNulls
              dot={{ r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{
                r: 5.5,
                fill: color,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              animationDuration={700}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
