import { strengthTones } from "@/components/knowledge/knowledge-tone";
import {
  strengthLabels,
  strengthLevel,
  strengthLevels,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const radius = 16;
const circumference = 2 * Math.PI * radius;
const segment = circumference / 5;
// Round caps reach past each dash by half the stroke width on both ends.
const strokeWidth = 3.5;
const dash = segment - 3 - strokeWidth;

/**
 * Memory strength as five arcs around the level's number. Decorative: the
 * strength is always written beside it.
 */
export function StrengthRing({
  confidence,
  muted = false,
  className,
}: {
  confidence: number;
  /** Archived concepts fade to gray. */
  muted?: boolean;
  className?: string;
}) {
  const level = strengthLevel(confidence);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-10 shrink-0 place-items-center",
        muted && "opacity-60 grayscale",
        className,
      )}
    >
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 size-full -rotate-90"
      >
        {strengthLevels.map((step, index) => (
          <circle
            key={step}
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-(index * segment) - (segment - dash) / 2}
            className={
              step <= level
                ? strengthTones[level].stroke
                : "stroke-foreground/[0.09]"
            }
          />
        ))}
      </svg>
      <span className="font-mono text-[0.75rem] leading-none font-semibold tabular-nums">
        {level}
      </span>
    </span>
  );
}

/** "Familiar" with five small bars, filled to the level. */
export function StrengthPips({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const level = strengthLevel(confidence);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        {strengthLevels.map((step) => (
          <span
            key={step}
            className={cn(
              "h-2.5 w-1.5 rounded-full",
              step <= level ? strengthTones[level].dot : "bg-foreground/[0.1]",
            )}
          />
        ))}
      </span>
      <span className={cn("font-semibold", strengthTones[level].text)}>
        {strengthLabels[level]}
      </span>
    </span>
  );
}
