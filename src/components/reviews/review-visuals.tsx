import {
  BriefcaseBusiness,
  CloudRain,
  Compass,
  Hourglass,
  Lightbulb,
  ThumbsUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import type { PromptKey, StatusTone } from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** Every prompt's icon, question, and its title when read back. */
export const promptMeta: Record<
  PromptKey,
  {
    icon: LucideIcon;
    question: string;
    title: string;
    hint: string;
    placeholder: string;
  }
> = {
  wins: {
    icon: ThumbsUp,
    question: "What went well?",
    title: "What went well",
    hint: "Notice a moment worth keeping.",
    placeholder: "A small win, a kind moment, or progress you nearly missed…",
  },
  challenges: {
    icon: CloudRain,
    question: "What was difficult?",
    title: "What felt hard",
    hint: "Name it without judging yourself.",
    placeholder: "What felt heavy, frustrating, or harder than expected?…",
  },
  lessons: {
    icon: Lightbulb,
    question: "What did you learn?",
    title: "What I learned",
    hint: "Turn the week into something useful.",
    placeholder: "A lesson, realization, or reminder you want to carry…",
  },
  timeWasters: {
    icon: Hourglass,
    question: "Where did time slip away?",
    title: "Where time went",
    hint: "Spot the pattern, then let it go.",
    placeholder: "A distraction, detour, or habit that took more than it gave…",
  },
  moneyReflection: {
    icon: WalletCards,
    question: "What happened financially?",
    title: "Money reflection",
    hint: "Keep the story behind the numbers.",
    placeholder: "A choice, expense, saving win, or money feeling you noticed…",
  },
  careerReflection: {
    icon: BriefcaseBusiness,
    question: "What moved your career forward?",
    title: "Career reflection",
    hint: "Quiet progress still counts.",
    placeholder: "Something you built, practiced, learned, or reached for…",
  },
  nextWeekFocus: {
    icon: Compass,
    question: "What matters most next week?",
    title: "Next week’s compass",
    hint: "Name one thing, in a few words.",
    placeholder:
      "If one thing deserves your best attention next week, what is it?…",
  },
};

export type ScoreKind = "energy" | "stress" | "overall";

/**
 * Each score's color, from the validated three-series palette. Marks wear
 * the color; figures and labels stay in text tokens.
 */
export const scoreTones: Record<
  ScoreKind,
  { label: string; fill: string; track: string; stroke: string; dot: string }
> = {
  energy: {
    label: "Energy",
    fill: "bg-score-energy",
    track: "bg-score-energy/15",
    stroke: "stroke-score-energy",
    dot: "bg-score-energy",
  },
  stress: {
    label: "Stress",
    fill: "bg-score-stress",
    track: "bg-score-stress/15",
    stroke: "stroke-score-stress",
    dot: "bg-score-stress",
  },
  overall: {
    label: "Overall",
    fill: "bg-score-overall",
    track: "bg-score-overall/15",
    stroke: "stroke-score-overall",
    dot: "bg-score-overall",
  },
};

export function StatusPill({
  tone,
  icon: Icon,
  children,
}: {
  tone: StatusTone;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "primary" && "bg-primary/10 text-primary ring-primary/25",
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}

/** The lead surface of each tab. */
export function HeroShell({
  labelledBy,
  children,
  className,
}: {
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
        className,
      )}
    >
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A glass card below the hero. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
);

/** An inset tile inside a glass card. */
export const tileClass = "bg-background/55 min-w-0 rounded-xl";

/**
 * A section of the reviews page: a short title above its surface, with an
 * optional note at the right, so the card holds content and nothing else.
 */
export function ReviewSection({
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
    <section aria-labelledby={id} className={cn("min-w-0", className)}>
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

/** A score out of ten as a figure with its color dot, or a dash. */
export function ScoreFigure({
  kind,
  score,
  className,
}: {
  kind: ScoreKind;
  score: number | null;
  className?: string;
}) {
  const tone = scoreTones[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
      />
      <span className="text-muted-foreground">{tone.label}</span>
      <span className="text-foreground font-mono font-semibold tabular-nums">
        {score ?? "—"}
        <span className="sr-only">
          {score === null ? ", not scored" : " out of 10"}
        </span>
      </span>
    </span>
  );
}
