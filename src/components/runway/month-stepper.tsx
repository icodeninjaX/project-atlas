"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const stepButton =
  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 sm:size-10";

/**
 * A count of months from 1 to 24, one tap at a time. With `name`, it also
 * submits the count with its form.
 */
export function MonthStepper({
  value,
  onValueChange,
  labelledBy,
  name,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  labelledBy: string;
  name?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={cn(
        // A pixel floor keeps it from shrinking at normal sizes; with large
        // text the count wraps instead of pushing past the edge.
        "bg-background/60 ring-border inline-flex max-w-full min-w-[184px] items-center rounded-full ring-1",
        className,
      )}
    >
      <button
        type="button"
        aria-label="One month less"
        disabled={value <= 1}
        onClick={() => onValueChange(Math.max(1, value - 1))}
        className={stepButton}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <output
        aria-live="polite"
        className="min-w-0 flex-1 px-1 text-center font-mono text-sm leading-tight font-semibold"
      >
        {value} {value === 1 ? "month" : "months"}
      </output>
      <button
        type="button"
        aria-label="One month more"
        disabled={value >= 24}
        onClick={() => onValueChange(Math.min(24, value + 1))}
        className={stepButton}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
