import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

/**
 * A debts surface: the card behind a section. Lists sit flush inside it,
 * split by hairlines, rather than in a second box.
 */
export const debtSurfaceClass = cn(
  surfaceClass,
  "bg-card/90 relative min-w-0 overflow-hidden rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** Hairline rows inside a surface. */
export const debtRowsClass = "divide-border/70 divide-y";

/**
 * A section of the debts pages: a short title above its surface, with an
 * optional note at the right, so the card holds content and nothing else.
 */
export function DebtSection({
  id,
  title,
  meta,
  className,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("mt-8 sm:mt-10", className)}>
      <div className="mb-3 flex min-w-0 items-baseline justify-between gap-3 px-1">
        <h2
          id={id}
          className="text-[0.9375rem] font-semibold tracking-[-0.01em]"
        >
          {title}
        </h2>
        {meta ? (
          <p className="text-muted-foreground min-w-0 text-right text-xs">
            {meta}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
