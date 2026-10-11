import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

/** Shared pieces of the Analyst page. */

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** A glass surface for the page's cards. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
);

/** An inset tile inside a card. */
export const tileClass = "bg-background/55 min-w-0";

/**
 * Each starter area's glyph color. Text shades keep 4.5:1 on the card in
 * both themes.
 */
export const areaTones = {
  emerald: "text-emerald-700 dark:text-emerald-300",
  sky: "text-sky-700 dark:text-sky-300",
  rose: "text-rose-700 dark:text-rose-300",
  violet: "text-violet-700 dark:text-violet-300",
  amber: "text-amber-700 dark:text-amber-300",
  primary: "text-primary",
} as const;

export type AreaTone = keyof typeof areaTones;

/** A neutral square holding an icon; `tone` colors the glyph. */
export const iconTileClass = (tone: AreaTone, size: "sm" | "md" = "md") =>
  cn(
    "bg-muted/60 relative grid shrink-0 place-items-center rounded-lg",
    size === "md" ? "size-9" : "size-8",
    areaTones[tone],
  );
