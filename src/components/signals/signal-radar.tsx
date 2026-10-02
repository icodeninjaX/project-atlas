import { signalCategories, type Signal } from "@/lib/signals/engine";
import {
  hasSignalFilters,
  matchesSignalFilters,
  radarBlips,
  radarSectorAngle,
  severityLabels,
  type SignalFilters,
} from "@/lib/signals/view";
import { cn } from "@/lib/utils";
import { severityTones } from "./signal-tone";
import styles from "./signals.module.css";

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 88;
const LABEL_RADIUS = 106;
const SECTOR = 360 / signalCategories.length;

function point(angleDegrees: number, radius: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** A slice of the scope, from the center out to the edge. */
function sectorPath(centerAngle: number) {
  const start = point(centerAngle - SECTOR / 2, RADIUS);
  const end = point(centerAngle + SECTOR / 2, RADIUS);
  return `M ${CENTER} ${CENTER} L ${round(start.x)} ${round(start.y)} A ${RADIUS} ${RADIUS} 0 0 1 ${round(end.x)} ${round(end.y)} Z`;
}

/**
 * Every signal as a blip on a radar: each area owns a slice, and the more
 * urgent a signal, the nearer the center. It is decoration (the hero and
 * the feed say the same in words), so it is hidden from assistive
 * technology; filtered-out blips dim, and the filtered area lights up.
 */
export function SignalRadar({
  signals,
  filters,
  labelClassName,
  className,
}: {
  signals: readonly Signal[];
  filters: SignalFilters;
  /** Classes for the area names at the edge, to hide them where too small. */
  labelClassName?: string;
  className?: string;
}) {
  const filtered = hasSignalFilters(filters);
  const blips = radarBlips(signals);

  return (
    <div aria-hidden="true" className={cn("relative aspect-square", className)}>
      <div
        className={cn(
          "absolute inset-[13.333%] [mask-image:radial-gradient(closest-side,black_96%,transparent)]",
          styles.sweep,
        )}
      />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative size-full overflow-visible"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          className="fill-primary/[0.035] stroke-border"
          strokeWidth="1"
        />
        {[0.25, 0.5, 0.75].map((share) => (
          <circle
            key={share}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS * share}
            fill="none"
            className="stroke-border/80"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}
        {signalCategories.map((category) => {
          const edge = point(radarSectorAngle(category) - SECTOR / 2, RADIUS);
          return (
            <line
              key={category}
              x1={CENTER}
              y1={CENTER}
              x2={round(edge.x)}
              y2={round(edge.y)}
              className="stroke-border/70"
              strokeWidth="1"
            />
          );
        })}
        {filters.category ? (
          <path
            d={sectorPath(radarSectorAngle(filters.category))}
            className="fill-primary/[0.09] stroke-primary/30"
            strokeWidth="1"
          />
        ) : null}

        <g className={labelClassName}>
          {signalCategories.map((category) => {
            const at = point(radarSectorAngle(category), LABEL_RADIUS);
            const selected = filters.category === category;
            return (
              <text
                key={category}
                x={round(at.x)}
                y={round(at.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "text-[8.5px] font-semibold tracking-[0.14em] uppercase",
                  selected ? "fill-foreground" : "fill-muted-foreground",
                  filters.category && !selected && "opacity-60",
                )}
              >
                {category}
              </text>
            );
          })}
        </g>

        {blips.map(({ signal, x, y }) => {
          const tone = severityTones[signal.severity];
          const dim = filtered && !matchesSignalFilters(signal, filters);
          const cx = round(CENTER + x * RADIUS);
          const cy = round(CENTER + y * RADIUS);
          return (
            <g key={signal.id} opacity={dim ? 0.22 : 1}>
              <title>{`${severityLabels[signal.severity]} · ${signal.title}`}</title>
              {signal.severity === "critical" && !dim ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  className={cn(tone.fill, styles.ping)}
                />
              ) : null}
              <circle
                cx={cx}
                cy={cy}
                r="10"
                className={cn(tone.fill, "opacity-[0.16]")}
              />
              <circle
                cx={cx}
                cy={cy}
                r="4.5"
                strokeWidth="1.5"
                className={cn(tone.fill, "stroke-card")}
              />
            </g>
          );
        })}

        <circle cx={CENTER} cy={CENTER} r="2.5" className="fill-primary" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r="6"
          fill="none"
          className="stroke-primary/40"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
