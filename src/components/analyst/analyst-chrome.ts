import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

/** Shared pieces of the Analyst page. */

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

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
    "from-emerald-500/22 to-emerald-500/5 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  sky: "from-sky-500/22 to-sky-500/5 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  rose: "from-rose-500/22 to-rose-500/5 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  violet:
    "from-violet-500/22 to-violet-500/5 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  amber:
    "from-amber-500/22 to-amber-500/5 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  primary: "from-primary/22 to-primary/6 text-primary ring-primary/20",
} as const;

export type AreaTone = keyof typeof areaTones;

/** A soft gradient tile holding an icon; `tone` picks the area's color. */
export const iconTileClass = (tone: AreaTone, size: "sm" | "md" = "md") =>
  cn(
    "relative grid shrink-0 place-items-center bg-gradient-to-br ring-1 ring-inset shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
    size === "md" ? "size-11 rounded-2xl" : "size-9 rounded-xl",
    areaTones[tone],
  );
