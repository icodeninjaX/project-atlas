"use client";

import {
  ArrowRight,
  BrainCircuit,
  CalendarCheck2,
  Dumbbell,
  Flame,
  GraduationCap,
  Play,
  Plus,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DueChip } from "@/components/career/due-chip";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import styles from "@/components/knowledge/knowledge.module.css";
import { strengthTones } from "@/components/knowledge/knowledge-tone";
import { StrengthRing } from "@/components/knowledge/strength";
import { Button } from "@/components/ui/button";
import {
  intervalLabel,
  queueSentence,
  queueStatus,
  reviewChip,
  spacingLadder,
  strengthLabels,
  strengthLevel,
  strengthLevels,
  type ForecastDay,
  type KnowledgeConcept,
  type MemorySummary,
  type QueueTone,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

function StatusPill({
  tone,
  children,
}: {
  tone: QueueTone;
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
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-violet-400/10 blur-3xl"
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

function HeroShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="knowledge-queue-heading"
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

function UpNext({
  concept,
  due,
  nowIso,
  onOpen,
}: {
  concept: KnowledgeConcept | null;
  due: boolean;
  nowIso: string;
  onOpen: (conceptId: string) => void;
}) {
  if (!concept) {
    return (
      <div className="bg-background/55 ring-border/80 rounded-2xl p-4 ring-1 sm:p-5">
        <p className={eyebrowClass}>Up next</p>
        <div className="mt-3 flex items-start gap-3">
          <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1">
            <CalendarCheck2 aria-hidden="true" className="size-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] leading-6 font-semibold">
              Nothing scheduled
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-5">
              Add a concept or restore one from the archive.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chip = reviewChip(concept, nowIso);
  const level = strengthLevel(concept.confidence);
  return (
    <div className="bg-background/55 ring-border/80 @container rounded-2xl p-4 ring-1 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={eyebrowClass}>{due ? "Up next" : "Next up"}</p>
        {chip ? <DueChip due={chip} showDate={false} /> : null}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <StrengthRing
          confidence={concept.confidence}
          className="@max-[15rem]:hidden"
        />
        <div className="min-w-0">
          <p className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words">
            {concept.title}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {concept.category} ·{" "}
            <span className={strengthTones[level].text}>
              {strengthLabels[level]}
            </span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(concept.id)}
        className="text-primary hover:bg-primary/10 focus-visible:ring-ring mt-3 -mb-1.5 -ml-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
      >
        Open concept
        <span className="sr-only">: {concept.title}</span>
        <ArrowRight aria-hidden="true" className="size-3" />
      </button>
    </div>
  );
}

/**
 * Concepts by strength as one bar, each level as long as its share, with
 * every level named beneath. The bar is decorative; the legend has counts.
 */
function StrengthTrack({ summary }: { summary: MemorySummary }) {
  const filled = strengthLevels.filter((level) => summary.strength[level] > 0);
  const solid = summary.strength[4] + summary.strength[5];
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>Memory strength</p>
      <div
        aria-hidden="true"
        className="bg-muted/70 ring-border/60 flex h-2.5 overflow-hidden rounded-full ring-1"
      >
        {filled.length ? (
          <div className={cn("flex w-full gap-1", todayStyles.fill)}>
            {filled.map((level) => (
              <span
                key={level}
                style={{ flexGrow: summary.strength[level] }}
                className={cn(
                  "h-full min-w-2 basis-0 rounded-full",
                  strengthTones[level].dot,
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ul
        aria-label="Concepts by memory strength"
        className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,6.5rem),1fr))] gap-x-4 gap-y-2.5 @2xl:grid-cols-5 @2xl:gap-x-2"
      >
        {strengthLevels.map((level) => {
          const count = summary.strength[level];
          const dot = cn(
            "size-2 shrink-0 rounded-full",
            strengthTones[level].dot,
          );
          return (
            // Narrow: dot, name, and count on one line. Wide: the count over
            // its name, one column per level.
            <li
              key={level}
              className={cn(
                "flex min-w-0 items-center gap-2 @2xl:grid @2xl:content-start @2xl:gap-1",
                count === 0 && "opacity-55",
              )}
            >
              <span aria-hidden="true" className={cn(dot, "@2xl:hidden")} />
              <span className="text-muted-foreground min-w-0 text-xs @max-2xl:truncate @2xl:order-2 @2xl:text-[0.6875rem] @2xl:leading-4">
                {strengthLabels[level]}
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums @2xl:order-1 @2xl:ml-0 @2xl:text-xl @2xl:tracking-[-0.03em]">
                <span
                  aria-hidden="true"
                  className={cn(dot, "@max-2xl:hidden")}
                />
                {count}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground border-border/70 mt-5 border-t pt-4 text-xs leading-5">
        {summary.active === 0
          ? "No active concepts."
          : `${solid} of ${summary.active} ${summary.active === 1 ? "concept is" : "concepts are"} strong or mastered, across ${summary.categories} ${summary.categories === 1 ? "category" : "categories"}.`}
      </p>
    </div>
  );
}

function Forecast({
  days,
  later,
  busiest,
}: {
  days: ForecastDay[];
  later: number;
  busiest: ForecastDay | null;
}) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>Next 7 days</p>
      <ol
        aria-label="Reviews due each day"
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
      >
        {days.map((day, index) => (
          <li key={day.key} className="flex min-w-0 flex-col items-center">
            <span className="sr-only">
              {day.name}: {day.count} {day.count === 1 ? "review" : "reviews"}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                day.count === 0 && "text-muted-foreground/70",
              )}
            >
              {day.count}
            </span>
            <span
              aria-hidden="true"
              className="border-border/70 mt-1.5 flex h-16 w-full items-end justify-center border-b pb-px sm:h-20"
            >
              {day.count ? (
                <span
                  style={{
                    height: `${Math.max(10, (day.count / max) * 100)}%`,
                  }}
                  className={cn(
                    "w-full max-w-7 rounded-t-[6px] rounded-b-[2px]",
                    index === 0
                      ? "from-primary to-primary/70 bg-gradient-to-t"
                      : "bg-primary/35 dark:bg-primary/45",
                    styles.rise,
                  )}
                />
              ) : (
                <span className="bg-muted h-[3px] w-full max-w-7 rounded-full" />
              )}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-1.5 text-[0.6875rem] leading-4",
                index === 0
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {day.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mt-4 text-xs leading-5">
        {busiest ? (
          <>
            Busiest:{" "}
            <span className="text-foreground font-semibold">
              {busiest.name}
            </span>{" "}
            · {busiest.count} {busiest.count === 1 ? "review" : "reviews"}
          </>
        ) : (
          "A quiet week ahead."
        )}
        {later ? ` · ${later} more after that` : ""}
      </p>
    </div>
  );
}

function Habit({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <li className="flex min-w-0 items-start gap-2.5">
      <span
        aria-hidden="true"
        className="bg-primary/10 text-primary ring-primary/15 mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1 max-[359px]:hidden"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[0.6875rem] leading-4 font-medium">
          {label}
        </p>
        <p className="font-mono text-lg leading-6 font-semibold tracking-[-0.02em]">
          {value}
        </p>
        <p className="text-muted-foreground text-[0.6875rem] leading-4">
          {detail}
        </p>
      </div>
    </li>
  );
}

/** The Knowledge lead: what is due, what is next, and how memory is holding. */
export function KnowledgeHero({
  summary,
  forecast,
  recall,
  streak,
  nowIso,
  onStart,
  onOpen,
}: {
  summary: MemorySummary;
  forecast: { days: ForecastDay[]; later: number; busiest: ForecastDay | null };
  recall: {
    total: number;
    recalled: number;
    rate: number | null;
    thisWeek: number;
  };
  streak: { days: number; reviewedToday: boolean };
  nowIso: string;
  onStart: (mode: "due" | "practice") => void;
  onOpen: (conceptId: string) => void;
}) {
  const status = queueStatus(summary);
  const next = summary.queue[0] ?? summary.nextScheduled;

  return (
    <HeroShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="knowledge-queue-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Review queue
        </h2>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {/* Narrow: the count, what is next, then the detail. Wide: the count
          beside what is next, and strength beside the week ahead. */}
      <div className="mt-5 grid gap-7 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @3xl:gap-x-12 @3xl:gap-y-9">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
              {summary.due}
            </span>
            <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              {summary.due === 1 ? "concept due" : "concepts due"}
            </span>
          </p>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {queueSentence(summary, nowIso)}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {summary.due > 0 ? (
              <Button type="button" size="lg" onClick={() => onStart("due")}>
                <Play aria-hidden="true" className="size-4 fill-current" />
                Start review
              </Button>
            ) : summary.weak > 0 ? (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => onStart("practice")}
              >
                <Dumbbell aria-hidden="true" className="size-4" />
                Practice {summary.weak} weak{" "}
                {summary.weak === 1 ? "concept" : "concepts"}
              </Button>
            ) : null}
          </div>
          <ul
            aria-label="Review habits"
            className="border-border/70 mt-6 grid grid-cols-3 gap-3 border-t pt-5"
          >
            <Habit
              icon={Target}
              label="Recall rate"
              value={
                recall.rate == null ? "—" : `${Math.round(recall.rate * 100)}%`
              }
              detail={
                recall.total
                  ? `${recall.recalled} of ${recall.total} in 30 days`
                  : "No reviews in 30 days"
              }
            />
            <Habit
              icon={Flame}
              label="Streak"
              value={`${streak.days} ${streak.days === 1 ? "day" : "days"}`}
              detail={
                streak.reviewedToday
                  ? "Reviewed today"
                  : streak.days
                    ? "Review today to keep it"
                    : "Review to start one"
              }
            />
            <Habit
              icon={BrainCircuit}
              label="This week"
              value={String(recall.thisWeek)}
              detail={recall.thisWeek === 1 ? "review" : "reviews"}
            />
          </ul>
        </div>

        <div className="min-w-0">
          <UpNext
            concept={next}
            due={summary.due > 0}
            nowIso={nowIso}
            onOpen={onOpen}
          />
        </div>

        <div className="min-w-0">
          <StrengthTrack summary={summary} />
        </div>

        <div className="min-w-0">
          <Forecast {...forecast} />
        </div>
      </div>
    </HeroShell>
  );
}

const steps = [
  {
    title: "Capture",
    detail: "A concept, the notes that explain it, and an example.",
  },
  {
    title: "Recall",
    detail: "Explain it from memory, then reveal the notes to check.",
  },
  {
    title: "Space",
    detail: "Rate how it went. Each good recall pushes the next review out.",
  },
];

/** The hero before anything is saved: how Knowledge works and how to start. */
export function KnowledgeEmptyHero({ onAdd }: { onAdd: () => void }) {
  const ladder = spacingLadder();
  return (
    <HeroShell>
      <h2
        id="knowledge-queue-heading"
        className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
      >
        Review queue
      </h2>
      <div className="mt-6 flex max-w-2xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-sm:hidden">
          <GraduationCap aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            Build a library you won’t forget
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Write down what you learn once. ATLAS asks you to explain it from
            memory, then brings it back just before it fades, a little further
            apart each time it sticks.
          </p>
          <div className="mt-6">
            <Button type="button" onClick={onAdd}>
              <Plus aria-hidden="true" className="size-4" />
              Add concept
            </Button>
          </div>
        </div>
      </div>
      <ol
        aria-label="How Knowledge works"
        className="mt-8 grid gap-3 @2xl:grid-cols-3"
      >
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="bg-background/55 ring-border/70 flex min-w-0 gap-3 rounded-2xl p-4 ring-1"
          >
            <span className="bg-primary/10 text-primary ring-primary/15 grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ring-1">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{step.title}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <div className="border-border/70 mt-6 border-t pt-5">
        <p className={eyebrowClass}>When every review goes well</p>
        <ol
          aria-label="Days between reviews when every recall goes well"
          className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2"
        >
          {ladder.map((days, index) => (
            <li key={days} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="text-muted-foreground/70 size-3"
                />
              ) : null}
              <span className="bg-background/60 ring-border/80 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ring-1">
                {intervalLabel(days)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </HeroShell>
  );
}
