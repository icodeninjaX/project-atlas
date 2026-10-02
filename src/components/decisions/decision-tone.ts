import {
  CalendarCheck,
  CircleCheck,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { DecisionReview, ReviewStatus } from "@/lib/decisions/view";

/**
 * Each review state's color and icon. `dot` fills markers and bar
 * segments; `chip` tints a status chip with text deep enough for 4.5:1 on a
 * tinted panel in both themes. Outlines use `ring-*` because the unlayered
 * `* { border-color }` rule in globals.css overrides `border-*` colors.
 */
export const reviewTones: Record<
  ReviewStatus,
  { label: string; dot: string; chip: string; icon: LucideIcon }
> = {
  ready: {
    label: "Ready to review",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-800 ring-amber-500/30 dark:text-amber-300",
    icon: CalendarCheck,
  },
  waiting: {
    label: "Waiting",
    dot: "bg-sky-500",
    chip: "bg-background/60 text-muted-foreground ring-border",
    icon: Hourglass,
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-emerald-500",
    chip: "bg-positive/10 text-emerald-800 ring-positive/25 dark:text-emerald-300",
    icon: CircleCheck,
  },
};

/** A waiting review a week away or less reads in blue rather than gray. */
export const soonChip =
  "bg-primary/10 text-blue-700 ring-primary/20 dark:text-blue-300";

export function reviewChipClass(review: DecisionReview) {
  return review.status === "waiting" && review.soon
    ? soonChip
    : reviewTones[review.status].chip;
}
