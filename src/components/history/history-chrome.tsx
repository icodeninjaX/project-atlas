import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeading, PageHeadingLink } from "@/components/shared/page-heading";
import styles from "@/components/history/history.module.css";
import type { HistoryCoverage, HistoryTone } from "@/lib/history/view";
import { cn } from "@/lib/utils";

/** Shared pieces of the History and Patterns pages. */

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** The page's cards: one flat, opaque surface with a hairline. */
export const cardClass =
  "bg-card border-border @container relative min-w-0 rounded-2xl border";

/** A tonal well inside a card. */
export const tileClass =
  "bg-background/55 min-w-0 rounded-xl p-3.5 min-[360px]:p-4";

/** The page title, with a companion page beside it. */
export function HistoryHeader({
  eyebrow,
  title,
  description,
  link,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  link: { href: Route; label: string; icon: LucideIcon };
}) {
  return (
    <PageHeading
      eyebrow={eyebrow}
      title={title}
      description={description}
      aside={
        <PageHeadingLink href={link.href} icon={link.icon}>
          {link.label}
        </PageHeadingLink>
      }
    />
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: HistoryTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "neutral" && "bg-muted/60 text-muted-foreground ring-border",
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

export function HeroShell({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(cardClass, "mt-6 p-5 sm:mt-8 sm:p-6 lg:p-7")}
    >
      {children}
    </section>
  );
}

/** A section title with a note at its end. */
export function SectionHeading({
  id,
  title,
  note,
}: {
  id: string;
  title: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
      <h2 id={id} className="text-base leading-6 font-semibold">
        {title}
      </h2>
      {note ? (
        <p className="text-muted-foreground min-w-0 text-xs">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * A swatch of how a bucket is drawn: solid when recorded, striped when
 * partial, an empty outline with no history. `bar` sets the color.
 */
export function CoverageSwatch({
  coverage,
  bar = "text-primary",
  className,
}: {
  coverage: HistoryCoverage;
  bar?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3 shrink-0 rounded-[3px]",
        coverage === "recorded" && "bg-current",
        coverage === "partial" && styles.partial,
        coverage === "insufficient" && "ring-border ring-1 ring-inset",
        bar,
        className,
      )}
    />
  );
}

/** A bucket's coverage in words, as a small chip. */
export function CoverageChip({
  coverage,
  label,
}: {
  coverage: HistoryCoverage;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold whitespace-nowrap ring-1",
        // Untinted, so the primary text keeps 4.5:1 on the card.
        coverage === "recorded" && "text-primary ring-primary/30",
        coverage === "partial" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        coverage === "insufficient" &&
          "bg-muted/70 text-muted-foreground ring-border/80",
      )}
    >
      <CoverageSwatch
        coverage={coverage}
        bar="text-current"
        className="size-2 rounded-[2px]"
      />
      {label}
    </span>
  );
}

/** A centered message in place of the page's content. */
export function HistoryMessage({
  icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8">
      <EmptyState
        icon={icon}
        title={title}
        description={children}
        action={action}
      />
    </div>
  );
}
