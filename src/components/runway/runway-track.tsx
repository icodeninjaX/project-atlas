import { Check, Flag } from "lucide-react";
import type { CSSProperties } from "react";
import type { RunwayTone } from "@/lib/runway/view";
import { trackMonthLabel } from "@/lib/runway/view";
import { cn } from "@/lib/utils";
import styles from "./runway.module.css";

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const GAP_COLOR: Record<RunwayTone, string> = {
  positive: "transparent",
  caution: "#f59e0b",
  destructive: "var(--destructive)",
};

/**
 * Runway as a row of months from today: covered months fill with light,
 * months still short of the reserve target are hatched, and a flag marks
 * the target. Decorative: the caller says the same in words.
 */
export function RunwayTrack({
  runwayMonths,
  targetMonths,
  months,
  tone,
  today,
  compact = false,
  className,
}: {
  runwayMonths: number;
  targetMonths: number;
  /** Months drawn; see `trackMonths`. */
  months: number;
  tone: RunwayTone;
  /** YYYY-MM-DD in Manila; labels the months. Omit for no labels. */
  today?: string;
  /** A thin bar without the flag, for side-by-side comparisons. */
  compact?: boolean;
  className?: string;
}) {
  const targetShare = Math.min(targetMonths / months, 1);
  const fillImage =
    tone === "destructive"
      ? "linear-gradient(90deg, var(--destructive), var(--destructive))"
      : "linear-gradient(90deg, #38bdf8, var(--primary))";
  // Wide screens can label every month up to a year; phones every other
  // one, or every third past a year.
  const phoneStep = months <= 6 ? 1 : months <= 12 ? 2 : 3;
  const wideStep = months <= 12 ? 1 : 2;

  const bar = (
    <div
      className={cn("flex", compact ? "h-2 gap-0.5" : "h-3 gap-[3px] sm:h-3.5")}
    >
      {Array.from({ length: months }, (_, index) => {
        const fill = clamp(runwayMonths - index);
        const gapStart = fill;
        const gapEnd = clamp(targetMonths - index);
        return (
          <span
            key={index}
            className={cn(
              "bg-foreground/[0.07] relative min-w-0 flex-1 overflow-hidden",
              compact ? "rounded-[2px]" : "rounded-[4px]",
            )}
          >
            {gapEnd > gapStart && tone !== "positive" ? (
              <span
                className={cn("absolute inset-0", styles.gap)}
                style={
                  {
                    "--gap": GAP_COLOR[tone],
                    clipPath: `inset(0 ${(1 - gapEnd) * 100}% 0 ${gapStart * 100}%)`,
                  } as CSSProperties
                }
              />
            ) : null}
            {fill > 0 ? (
              <span
                className={cn("absolute inset-0", styles.light)}
                style={{
                  backgroundImage: fillImage,
                  // One gradient runs the length of the track, so each
                  // month shows its own stretch of it.
                  backgroundSize: `${months * 100}% 100%`,
                  backgroundPosition: `${months > 1 ? (index / (months - 1)) * 100 : 0}% 0`,
                  clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                  animationDelay: `${Math.min(index * 60, 900)}ms`,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div aria-hidden="true" className={cn("relative", className)}>
        {bar}
        <span
          className="bg-foreground ring-card absolute -top-0.5 -bottom-0.5 w-0.5 -translate-x-1/2 rounded-full ring-2"
          style={{ left: `${targetShare * 100}%` }}
        />
      </div>
    );
  }

  const met = runwayMonths >= targetMonths;
  return (
    <div aria-hidden="true" className={cn("min-w-0", className)}>
      <div className="relative h-8">
        {/* The flag keeps inside the track: its own width slides left as
            the target nears the end. */}
        <span
          className={cn(
            "absolute bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold whitespace-nowrap ring-1",
            met
              ? "bg-positive/10 text-positive ring-positive/25"
              : "bg-background/70 text-foreground ring-border",
          )}
          style={{
            left: `${targetShare * 100}%`,
            transform: `translateX(-${targetShare * 100}%)`,
          }}
        >
          {met ? (
            <Check className="size-3" strokeWidth={2.5} />
          ) : (
            <Flag className="size-3" />
          )}
          {targetMonths}-mo target
        </span>
      </div>
      <div className="relative">
        {bar}
        <span
          className="bg-foreground ring-card absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded-full ring-2"
          style={{ left: `${targetShare * 100}%` }}
        />
      </div>
      {today ? (
        <div className="text-muted-foreground mt-2.5 flex gap-[3px] font-mono text-[0.6875rem] leading-4 font-medium">
          {Array.from({ length: months }, (_, index) => (
            <span
              key={index}
              className={cn(
                // A flex box centers a label wider than its month.
                "flex min-w-0 flex-1 justify-center whitespace-nowrap",
                index % phoneStep !== 0 && "max-sm:invisible",
                index % wideStep !== 0 && "sm:invisible",
              )}
            >
              {index === 0 ? "Now" : trackMonthLabel(today, index)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
