import { ArrowRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

/**
 * A light-catching hairline edge. Hosts must be positioned.
 * Outlines elsewhere use `ring-*` because the unlayered
 * `* { border-color }` rule in globals.css overrides `border-*` colors.
 */
export const surfaceClass = styles.edge;

/** The Today page's secondary surfaces. */
export const dashboardCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.04)] min-[360px]:p-5 sm:p-6",
);

/** An inset tile inside a dashboard card. */
export const dashboardTileClass =
  "bg-background/55 min-w-0 rounded-xl p-3.5 min-[360px]:p-4";

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
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-[-0.01em]"
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              tone === "attention"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          />
          {title}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
          {description}
        </p>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          {action.label} <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
