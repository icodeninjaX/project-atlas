import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import {
  reviewChipClass,
  reviewTones,
} from "@/components/decisions/decision-tone";
import type { DecisionReview } from "@/lib/decisions/view";
import { cn } from "@/lib/utils";

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

/** The glass tile used inside heroes and cards. */
export const tileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl ring-1";

const monthShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
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

/** A quiet chip for a fact about a decision (its measure, its notes). */
export function FactChip({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted/60 text-muted-foreground ring-border/70 inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-medium ring-1",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/** A date as a small calendar leaf; decorative, so say the date in text too. */
export function DateLeaf({
  iso,
  highlight = false,
  className,
}: {
  iso: string;
  highlight?: boolean;
  className?: string;
}) {
  const date = new Date(`${iso}T12:00:00Z`);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid w-11 shrink-0 justify-items-center rounded-xl py-1 shadow-[0_1px_2px_rgb(7_10_15/0.08)] ring-1 sm:w-12",
        highlight
          ? "bg-amber-500/10 ring-amber-500/35"
          : "bg-card/85 ring-border/80 backdrop-blur",
        className,
      )}
    >
      <span
        className={cn(
          "text-[0.5625rem] leading-3 font-semibold tracking-[0.14em] uppercase",
          // Deeper shades keep 4.5:1 on the tinted leaf.
          highlight ? "text-amber-800 dark:text-amber-300" : "text-primary",
        )}
      >
        {monthShort.format(date)}
      </span>
      <span className="font-mono text-lg leading-6 font-semibold tracking-[-0.04em]">
        {date.getUTCDate()}
      </span>
    </span>
  );
}

/** A wash of light from the top, a blue and a teal glow, and a faint grid. */
function HeroLight() {
  return (
    <>
      <div
        aria-hidden="true"
        className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-teal-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
    </>
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
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
        className,
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A secondary card on a decision page. */
export const decisionCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] min-[360px]:p-5 sm:p-6",
);
