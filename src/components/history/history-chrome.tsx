import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { PageHeading, PageHeadingLink } from "@/components/shared/page-heading";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import styles from "@/components/history/history.module.css";
import type { HistoryCoverage, HistoryTone } from "@/lib/history/view";
import { cn } from "@/lib/utils";

/** Shared pieces of the Recorded history and Patterns pages. */

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

/** A glass surface for the page's cards. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** An inset tile inside a card. */
export const tileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl p-3.5 ring-1 min-[360px]:p-4";

/** The page title, with a companion page beside it. */
export function HistoryHeader({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  link,
}: {
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  description: string;
  link: { href: Route; label: string; icon: LucideIcon };
}) {
  return (
    <PageHeading
      eyebrow={eyebrow}
      icon={eyebrowIcon}
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
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
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

/** A wash of light from the top, two soft glows, and a faint grid. */
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
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-emerald-400/10 blur-3xl"
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
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A section title with a fading rule and a note at its end. */
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
    <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
      <h2
        id={id}
        className="text-[1.375rem] leading-none font-semibold tracking-[-0.035em] sm:text-2xl"
      >
        {title}
      </h2>
      <span
        aria-hidden="true"
        className="from-border mb-1.5 h-px min-w-6 flex-1 bg-gradient-to-r to-transparent"
      />
      {note ? (
        <p className="text-muted-foreground mb-px min-w-0 text-xs">{note}</p>
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
        coverage === "recorded" &&
          "bg-primary/10 ring-primary/20 dark:text-primary text-blue-700",
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
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bg-card/60 mt-8 grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed p-6 text-center">
      <div className="max-w-sm">
        <span className="bg-muted/70 ring-border/80 text-muted-foreground mx-auto grid size-11 place-items-center rounded-2xl ring-1">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {children}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
