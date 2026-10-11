import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

/** Shared pieces of the Analyst page. */

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** A glass surface for the page's cards. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** An inset tile inside a card. */
export const tileClass = "bg-background/55 ring-border/80 min-w-0 ring-1";

/**
 * Each starter area's color. Text shades keep 4.5:1 on the card in both
 * themes. Outlines use `ring-*` because the unlayered `* { border-color }`
 * rule in globals.css overrides `border-*` colors.
 */
export const areaTones = {
  emerald:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  sky: "bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  rose: "bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  violet:
    "bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  amber: "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  primary: "bg-primary/12 text-primary ring-primary/20",
} as const;

export type AreaTone = keyof typeof areaTones;

/** A tinted tile holding an icon; `tone` picks the area's color. */
export const iconTileClass = (tone: AreaTone, size: "sm" | "md" = "md") =>
  cn(
    "relative grid shrink-0 place-items-center ring-1 ring-inset",
    size === "md" ? "size-11 rounded-2xl" : "size-9 rounded-xl",
    areaTones[tone],
  );
