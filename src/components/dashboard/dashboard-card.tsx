import { ArrowRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

/**
 * A light-catching hairline edge and, with `data-spotlight` inside a
 * SpotlightArea, a light that follows the mouse. Hosts must be positioned.
 * Outlines elsewhere use `ring-*` because the unlayered
 * `* { border-color }` rule in globals.css overrides `border-*` colors.
 */
export const surfaceClass = cn(styles.edge, styles.spotlight);

/** The Today page's secondary surfaces. */
export const dashboardCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] min-[360px]:p-5 sm:p-6",
);

/** An inset tile inside a dashboard card. */
export const dashboardTileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl p-3.5 ring-1 min-[360px]:p-4";

export function DashboardCardHeading({
  id,
  icon: Icon,
  title,
  description,
  tone = "default",
  action,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  tone?: "default" | "attention";
  action?: { href: Route; label: string };
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[14rem]:hidden",
            tone === "attention"
              ? "bg-destructive/10 text-destructive ring-destructive/20"
              : "bg-primary/10 text-primary ring-primary/15",
          )}
        >
          <Icon aria-hidden="true" className="size-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
            {description}
          </p>
        </div>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          {action.label} <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
