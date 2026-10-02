import {
  BriefcaseBusiness,
  CloudRain,
  Compass,
  Hourglass,
  Lightbulb,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import type { PromptKey, StatusTone } from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

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
    icon: Sparkles,
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
    hint: "Choose one direction, not ten demands. It greets you here next week.",
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
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-indigo-400/10 blur-3xl"
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
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:rounded-[2rem]",
        className,
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/** A glass card below the hero. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** An inset tile inside a glass card. */
export const tileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl ring-1";

/**
 * A score out of ten as ten short segments. Decorative: the figure beside
 * it carries the value.
 */
export function ScoreMeter({
  score,
  kind,
  className,
}: {
  score: number | null;
  kind: ScoreKind;
  className?: string;
}) {
  const tone = scoreTones[kind];
  return (
    <span
      aria-hidden="true"
      className={cn("grid grid-cols-10 gap-[3px]", className)}
    >
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-colors duration-200",
            score !== null && index < score ? tone.fill : tone.track,
          )}
        />
      ))}
    </span>
  );
}

const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * A score out of ten as a ring with the figure in its middle. The ring is
 * decorative; the figure carries the value.
 */
export function ScoreRing({
  score,
  kind,
  className,
  figureClassName,
}: {
  score: number | null;
  kind: ScoreKind;
  className?: string;
  figureClassName?: string;
}) {
  const tone = scoreTones[kind];
  const share = score === null ? 0 : score / 10;
  return (
    <span className={cn("relative grid size-11 place-items-center", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 36 36"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          className={cn(tone.stroke, "opacity-20")}
        />
        {share > 0 ? (
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - share)}
            className={cn(tone.stroke, todayStyles.draw)}
            style={{ "--ring-from": RING_CIRCUMFERENCE } as CSSProperties}
          />
        ) : null}
      </svg>
      <span
        className={cn(
          "relative font-mono text-sm font-semibold tracking-[-0.02em]",
          figureClassName,
        )}
      >
        {score ?? "—"}
        {score === null ? (
          <span className="sr-only">, not scored</span>
        ) : (
          <span className="sr-only"> out of 10</span>
        )}
      </span>
    </span>
  );
}
