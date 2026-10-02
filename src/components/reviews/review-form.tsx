"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  NotebookPen,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import {
  ScoreMeter,
  StatusPill,
  eyebrowClass,
  glassCardClass,
  promptMeta,
  scoreTones,
  tileClass,
  type ScoreKind,
} from "@/components/reviews/review-visuals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manilaDateLabel } from "@/lib/dates/dates";
import { promptKeys } from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

type ReviewFields = {
  wins: string;
  challenges: string;
  lessons: string;
  timeWasters: string;
  moneyReflection: string;
  careerReflection: string;
  nextWeekFocus: string;
  energyScore: string;
  stressScore: string;
  overallScore: string;
};

const emptyReview: ReviewFields = {
  wins: "",
  challenges: "",
  lessons: "",
  timeWasters: "",
  moneyReflection: "",
  careerReflection: "",
  nextWeekFocus: "",
  energyScore: "",
  stressScore: "",
  overallScore: "",
};

const questions = promptKeys.map((name) => ({ name, ...promptMeta[name] }));

const scores = [
  {
    name: "energyScore",
    kind: "energy",
    hint: "How charged did you feel?",
  },
  {
    name: "stressScore",
    kind: "stress",
    hint: "How much pressure followed you?",
  },
  {
    name: "overallScore",
    kind: "overall",
    hint: "How did the week feel as a whole?",
  },
] as const satisfies ReadonlyArray<{
  name: keyof ReviewFields;
  kind: ScoreKind;
  hint: string;
}>;

function scoreNote(
  name: (typeof scores)[number]["name"],
  value: string | undefined,
) {
  const score = Number(value);
  if (!score) return "Tap + or enter a score";
  if (name === "stressScore") {
    if (score <= 3) return "Pressure stayed light";
    if (score <= 6) return "Pressure was noticeable";
    if (score <= 8) return "A high-pressure week";
    return "Pressure felt very heavy";
  }
  if (name === "energyScore") {
    if (score <= 3) return "Your battery ran low";
    if (score <= 6) return "Energy came and went";
    if (score <= 8) return "You had steady energy";
    return "You felt fully charged";
  }
  if (score <= 3) return "A demanding week";
  if (score <= 6) return "Somewhere in the middle";
  if (score <= 8) return "A good week overall";
  return "A strong week overall";
}

function meterScore(value: string | undefined) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;
}

function wordCount(text: string | undefined) {
  const trimmed = text?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const stepButtonClass =
  "bg-card/80 ring-border/80 hover:bg-muted focus-visible:ring-ring grid min-h-11 place-items-center rounded-xl ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-12";

export function ReviewForm({
  weekStart,
  weekLabel,
  entryTimestamp,
  lastSavedAt,
  submitted = false,
  initial,
}: {
  weekStart: string;
  /** "September 28–October 4, 2026", shown under the title. */
  weekLabel?: string;
  entryTimestamp: string;
  lastSavedAt?: string;
  /** Whether this week's review was already submitted. */
  submitted?: boolean;
  initial?: Partial<ReviewFields>;
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setFocus,
    formState: { isDirty },
  } = useForm<ReviewFields>({
    defaultValues: { ...emptyReview, ...initial },
  });
  const [savedAt, setSavedAt] = useState(lastSavedAt);
  const [submittedNow, setSubmittedNow] = useState(submitted);
  const [activePrompt, setActivePrompt] = useState(0);
  const [savingIntent, setSavingIntent] = useState<"draft" | "submit">(
    "submit",
  );
  const [pending, startTransition] = useTransition();
  const { submit } = useOfflineSync();
  const values = useWatch({ control });
  const activeQuestion = questions[activePrompt] ?? questions[0]!;
  const completedPrompts = questions.filter(({ name }) =>
    values[name]?.trim(),
  ).length;
  const percent = Math.round((completedPrompts / questions.length) * 100);

  const submitReview = (intent: "draft" | "submit") =>
    handleSubmit((formValues) => {
      const data = new FormData();
      data.set("weekStart", weekStart);
      data.set("intent", intent);
      Object.entries(formValues).forEach(([key, value]) =>
        data.set(key, value ?? ""),
      );
      setSavingIntent(intent);
      startTransition(async () => {
        const result = await submit("review.save", data);
        if (result.success) {
          const savedTimestamp = new Date().toISOString();
          setSavedAt(savedTimestamp);
          setSubmittedNow(intent === "submit");
          reset(formValues);
          toast.success(result.message, {
            description: `Dated ${manilaDateLabel(savedTimestamp)} automatically.`,
          });
        } else {
          toast.error(result.message);
        }
      });
    });

  const adjustScore = (
    name: (typeof scores)[number]["name"],
    amount: number,
  ) => {
    const current = Number(values[name]);
    const startingPoint = amount > 0 ? 5 : 1;
    const next = Math.min(
      10,
      Math.max(1, current ? current + amount : startingPoint),
    );
    setValue(name, String(next), { shouldDirty: true, shouldTouch: true });
  };

  const selectPrompt = (index: number, focus = false) => {
    const nextIndex = Math.min(questions.length - 1, Math.max(0, index));
    setActivePrompt(nextIndex);
    if (focus) {
      const nextQuestion = questions[nextIndex] ?? questions[0]!;
      window.requestAnimationFrame(() => setFocus(nextQuestion.name));
    }
  };

  const movePastPrompts = () => {
    document
      .getElementById("weekly-review-scores")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <form
      onSubmit={submitReview("submit")}
      aria-labelledby="review-composer-heading"
      data-spotlight
      // `overflow-clip` rounds the corners without becoming a scroll
      // container, so the action bar can stay sticky.
      className={cn(glassCardClass, "overflow-clip")}
    >
      <section
        aria-label="Reflection date and progress"
        className="border-border/70 relative isolate border-b px-4 pt-5 pb-5 sm:px-7 sm:pt-7 sm:pb-6"
      >
        <div
          aria-hidden="true"
          className="from-primary/[0.08] pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b to-transparent"
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[16rem]:hidden">
              <NotebookPen aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <div className="min-w-0">
              <h2
                id="review-composer-heading"
                className="text-lg leading-6 font-semibold tracking-[-0.02em]"
              >
                Your reflection
              </h2>
              {weekLabel ? (
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                  Week of {weekLabel}
                </p>
              ) : null}
            </div>
          </div>
          {submittedNow ? (
            <StatusPill tone="positive" icon={Check}>
              Submitted
            </StatusPill>
          ) : savedAt ? (
            <StatusPill tone="primary">Draft</StatusPill>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,17rem)] sm:items-end sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <CalendarDays
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
            />
            <div className="min-w-0">
              <p className={eyebrowClass}>Added automatically</p>
              <time
                dateTime={entryTimestamp}
                className="mt-1 block text-sm font-semibold"
              >
                {manilaDateLabel(entryTimestamp)}
              </time>
              <p className="text-muted-foreground mt-1 text-xs leading-5 max-sm:hidden">
                Write naturally—ATLAS keeps the exact day inside this weekly
                review for you.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-semibold">
                  {completedPrompts} of {questions.length}
                </span>{" "}
                prompts written
              </p>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {percent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Weekly reflection progress"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={completedPrompts}
              aria-valuetext={`${completedPrompts} of ${questions.length} prompts written`}
              className="mt-2 grid grid-cols-7 gap-1"
            >
              {questions.map(({ name }) => (
                <span
                  key={name}
                  className={cn(
                    "h-1.5 rounded-full transition-colors duration-300",
                    values[name]?.trim() ? "bg-primary" : "bg-primary/15",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4 sm:px-7 sm:pt-6 lg:hidden">
        <section aria-label="Choose a reflection prompt">
          <div className="grid grid-cols-7 gap-1.5">
            {questions.map(({ name, question, icon: Icon }, index) => {
              const filled = Boolean(values[name]?.trim());
              const selected = activePrompt === index;
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={`Prompt ${index + 1}: ${question}`}
                  aria-current={selected ? "step" : undefined}
                  onClick={() => selectPrompt(index)}
                  className={cn(
                    "focus-visible:ring-ring grid min-h-11 min-w-0 place-items-center rounded-xl ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    selected
                      ? "bg-primary-solid text-primary-solid-foreground shadow-[0_8px_20px_-10px_var(--primary-solid)] ring-transparent"
                      : filled
                        ? "bg-primary/10 text-primary ring-primary/25"
                        : "bg-background/55 text-muted-foreground ring-border/80",
                  )}
                >
                  {filled && !selected ? (
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  ) : (
                    <Icon aria-hidden="true" className="size-4" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-2 px-0.5 text-[0.6875rem] font-medium tracking-wide uppercase">
            Prompt {activePrompt + 1} of {questions.length}
          </p>
        </section>
      </div>

      <div className="grid gap-3 p-4 sm:gap-4 sm:p-7 lg:grid-cols-2">
        {questions.map(
          ({ name, question, hint, placeholder, icon: Icon }, index) => {
            const filled = Boolean(values[name]?.trim());
            const compass = name === "nextWeekFocus";
            const words = wordCount(values[name]);
            return (
              <section
                key={name}
                className={cn(
                  "relative min-w-0 rounded-2xl p-4 ring-1 transition-[background-color,box-shadow] sm:p-5",
                  compass
                    ? "from-primary/[0.1] via-primary/[0.03] ring-primary/25 bg-gradient-to-br to-transparent lg:col-span-2"
                    : filled
                      ? "bg-primary/[0.035] ring-primary/20"
                      : "bg-background/55 ring-border/80",
                  "focus-within:ring-primary/45",
                  index !== activePrompt && "hidden lg:block",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition-colors",
                      filled || compass
                        ? "bg-primary/12 text-primary ring-primary/20"
                        : "bg-muted/70 text-muted-foreground ring-border/70",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor={name}
                        className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em]"
                      >
                        {question}
                      </label>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground/80 shrink-0 font-mono text-[0.6875rem] font-semibold tabular-nums"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                      {hint}
                    </p>
                  </div>
                </div>
                <textarea
                  id={name}
                  {...register(name)}
                  rows={compass ? 3 : 4}
                  placeholder={placeholder}
                  className={cn(
                    "bg-card/70 ring-border/70 placeholder:text-muted-foreground focus-visible:ring-primary/45 mt-4 [field-sizing:content] max-h-96 min-h-32 w-full resize-y overflow-y-auto rounded-xl px-3.5 py-3 text-[0.9375rem] leading-7 ring-1 outline-none focus-visible:ring-2 sm:[field-sizing:fixed] sm:max-h-none sm:min-h-0",
                    compass && "font-medium",
                  )}
                />
                <div className="text-muted-foreground mt-2 flex min-h-4 items-center justify-between gap-3 text-[0.6875rem]">
                  {filled ? (
                    <span className="text-primary flex items-center gap-1 font-semibold">
                      <CheckCircle2 aria-hidden="true" className="size-3" />
                      Captured
                    </span>
                  ) : (
                    <span>
                      {compass
                        ? "It greets you on this page next week."
                        : "You can come back and add more anytime."}
                    </span>
                  )}
                  {words > 0 ? (
                    <span className="shrink-0 font-mono tabular-nums">
                      {words} {words === 1 ? "word" : "words"}
                    </span>
                  ) : null}
                </div>
              </section>
            );
          },
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-7 sm:pb-6 lg:hidden">
        <Button
          type="button"
          variant="secondary"
          disabled={activePrompt === 0}
          onClick={() => selectPrompt(activePrompt - 1, true)}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={() =>
            activePrompt === questions.length - 1
              ? movePastPrompts()
              : selectPrompt(activePrompt + 1, true)
          }
        >
          {activePrompt === questions.length - 1 ? "Scores next" : "Next"}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
        <p className="text-muted-foreground col-span-2 truncate text-center text-[0.6875rem]">
          Now: {activeQuestion.question}
        </p>
      </div>

      <fieldset
        id="weekly-review-scores"
        className={cn(
          "border-border/70 scroll-mt-36 border-t px-4 pt-5 pb-5 sm:px-7 sm:pt-6 sm:pb-7",
          activePrompt !== questions.length - 1 && "hidden lg:block",
        )}
      >
        <legend className="sr-only">How did the week feel?</legend>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p
            aria-hidden="true"
            className="text-base font-semibold tracking-[-0.01em]"
          >
            How did the week feel?
          </p>
          <p className="text-muted-foreground text-xs leading-5">
            Leave any score empty if numbers do not help this week.
          </p>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {scores.map(({ name, kind, hint }) => {
            const tone = scoreTones[kind];
            return (
              <div key={name} className={cn(tileClass, "p-3.5 sm:p-4")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <label
                      htmlFor={name}
                      className="flex items-center gap-2 text-sm font-semibold"
                    >
                      <span
                        aria-hidden="true"
                        className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                      />
                      {tone.label}
                    </label>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-4">
                      {hint}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground font-mono text-[0.6875rem]"
                  >
                    /10
                  </span>
                </div>
                <div className="mt-3.5 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease ${tone.label.toLowerCase()} score`}
                    onClick={() => adjustScore(name, -1)}
                    className={stepButtonClass}
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </button>
                  <Input
                    id={name}
                    {...register(name)}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    placeholder="–"
                    aria-describedby={`${name}-note`}
                    className="bg-card/70 ring-border/70 focus-visible:ring-primary/45 h-11 border-0 text-center font-mono text-2xl font-semibold tracking-[-0.02em] tabular-nums ring-1 sm:h-12 sm:text-2xl"
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${tone.label.toLowerCase()} score`}
                    onClick={() => adjustScore(name, 1)}
                    className={stepButtonClass}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <ScoreMeter
                  kind={kind}
                  score={meterScore(values[name])}
                  className="mt-3.5"
                />
                <p
                  id={`${name}-note`}
                  className="text-muted-foreground mt-2 text-xs leading-4"
                >
                  {scoreNote(name, values[name])}
                </p>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Stays in reach while a long review scrolls on wide screens. */}
      <div className="border-border/70 bg-card/85 z-10 flex flex-col gap-3 border-t px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:sticky lg:bottom-0">
        <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs leading-5">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              isDirty
                ? "bg-amber-500"
                : savedAt
                  ? "bg-positive"
                  : "bg-muted-foreground/50",
            )}
          />
          {isDirty
            ? "You have unsaved thoughts"
            : savedAt
              ? `Last saved ${manilaDateLabel(savedAt)}`
              : "A few honest lines are enough"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            pending={pending && savingIntent === "draft"}
            pendingLabel="Saving…"
            onClick={submitReview("draft")}
            className="w-full sm:w-auto"
          >
            <Save aria-hidden="true" className="size-4" />
            Save draft
          </Button>
          <Button
            type="submit"
            disabled={pending}
            pending={pending && savingIntent === "submit"}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            <Send aria-hidden="true" className="size-4" />
            Submit review
          </Button>
        </div>
      </div>
    </form>
  );
}
