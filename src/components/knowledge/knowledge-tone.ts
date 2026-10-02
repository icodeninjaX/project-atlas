import type { ReviewOutcome } from "@/lib/knowledge/scheduler";
import type { StrengthLevel } from "@/lib/knowledge/view";

type Tone = {
  /** Fills markers and track segments. */
  dot: string;
  /** Strokes ring segments. */
  stroke: string;
  /** Tinted chips: background, text, and outline. */
  soft: string;
  text: string;
  ring: string;
};

/**
 * Each memory strength's color, from fragile to mastered. Text shades keep
 * 4.5:1 on the card in both themes. Outlines use `ring-*` because the
 * unlayered `* { border-color }` rule in globals.css overrides `border-*`
 * colors.
 */
export const strengthTones: Record<StrengthLevel, Tone> = {
  1: {
    dot: "bg-rose-500",
    stroke: "stroke-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/25",
  },
  2: {
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/25",
  },
  3: {
    dot: "bg-sky-500",
    stroke: "stroke-sky-500",
    soft: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/25",
  },
  4: {
    dot: "bg-violet-500",
    stroke: "stroke-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/25",
  },
  5: {
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25",
  },
};

/** Each rating's color: forgot, struggled, recalled, effortless. */
export const outcomeTones: Record<ReviewOutcome, Tone> = {
  again: strengthTones[1],
  hard: strengthTones[2],
  good: {
    dot: "bg-blue-500",
    stroke: "stroke-blue-500",
    soft: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/25",
  },
  easy: strengthTones[5],
};
