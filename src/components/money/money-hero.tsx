import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";
import { HeroBackdrop } from "@/components/shared/hero-backdrop";

export type HeroTone = "positive" | "caution" | "destructive" | "neutral";

/** A status in a few words, with a dot so it never relies on color alone. */
export function TonePill({
  tone,
  children,
  className,
}: {
  tone: HeroTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "destructive" &&
          "bg-destructive/10 text-destructive ring-destructive/25",
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
        className,
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

/** The lead surface of a money page, lit warm when something is wrong. */
export function MoneyHeroShell({
  labelledBy,
  tone,
  className,
  children,
}: {
  labelledBy: string;
  tone: HeroTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-8 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:rounded-[2rem]",
        className,
      )}
    >
      <HeroBackdrop warm={tone === "destructive"} />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A figure in the hero's side grid: plain on phones, a tile from `sm`. */
export function HeroStat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "positive" | "destructive";
}) {
  return (
    <div className="sm:bg-background/55 sm:ring-border/80 min-w-0 sm:rounded-2xl sm:p-4 sm:ring-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-mono text-lg leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]",
          tone === "positive" && "text-positive",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {note ? (
        <dd className="text-muted-foreground mt-1 text-xs leading-4">{note}</dd>
      ) : null}
    </div>
  );
}
