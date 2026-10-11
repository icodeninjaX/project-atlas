import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import {
  reviewChipClass,
  reviewTones,
} from "@/components/decisions/decision-tone";
import type { DecisionReview } from "@/lib/decisions/view";
import { cn } from "@/lib/utils";

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** The glass tile used inside heroes and cards. */
export const tileClass = "bg-background/55 min-w-0 rounded-xl";

const shortDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** Where a decision is in its review loop, as a chip with an icon. */
export function ReviewChip({
  review,
  className,
}: {
  review: DecisionReview;
  className?: string;
}) {
  const Icon = reviewTones[review.status].icon;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold ring-1",
        reviewChipClass(review),
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {review.label}
    </span>
  );
}

/** A short date in the row's gutter; decorative, so say the date in text too. */
export function DateLeaf({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-muted-foreground w-12 shrink-0 font-mono text-xs leading-6 tabular-nums",
        className,
      )}
    >
      {shortDate.format(new Date(`${iso}T12:00:00Z`))}
    </span>
  );
}

/** The lead surface of a decision page. */
export function DecisionHeroShell({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)] sm:mt-8",
        className,
      )}
    >
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A secondary card on a decision page. */
export const decisionCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.04)] min-[360px]:p-5 sm:p-6",
);
