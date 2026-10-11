"use client";

import { Check, Minus, Plus, Save, Send } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch, type UseFormRegister } from "react-hook-form";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import {
  StatusPill,
  glassCardClass,
  promptMeta,
  scoreTones,
  type ScoreKind,
} from "@/components/reviews/review-visuals";
import { Disclosure } from "@/components/shared/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manilaDateLabel } from "@/lib/dates/dates";
import { promptKeys, type PromptKey } from "@/lib/reviews/view";
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

/** The three prompts every review asks; the rest fold behind "More". */
const lookBack = ["wins", "challenges", "lessons"] as const;
const morePrompts = [
  "timeWasters",
  "moneyReflection",
  "careerReflection",
] as const;

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

type ScoreName = (typeof scores)[number]["name"];

/** The score in words, or the question it answers while it is empty. */
function scoreNote(name: ScoreName, value: string | undefined, hint: string) {
  const score = Number(value);
  if (!score) return hint;
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

const stepButtonClass =
  "bg-background/60 ring-border/80 hover:bg-muted focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-full ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-10";

const textareaClass =
  "bg-background/50 ring-border/70 placeholder:text-muted-foreground/80 focus-visible:ring-primary/45 mt-2.5 [field-sizing:content] max-h-96 min-h-24 w-full resize-y overflow-y-auto rounded-xl px-3.5 py-3 text-[0.9375rem] leading-7 ring-1 outline-none focus-visible:ring-2";

/** One numbered step of the review. */
function Step({
  number,
  title,
  note,
  children,
  className,
}: {
  number: number;
  title: string;
  note: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("border-border/70 border-t px-4 py-6 sm:px-6", className)}
    >
      <div aria-hidden="true" className="flex items-start gap-3">
        <span className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold">
          {number}
        </span>
        <div className="min-w-0">
          <p className="text-base leading-6 font-semibold tracking-[-0.01em]">
            {title}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            {note}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function Prompt({
  name,
  filled,
  register,
  rows = 3,
}: {
  name: PromptKey;
  filled: boolean;
  register: UseFormRegister<ReviewFields>;
  rows?: number;
}) {
  const { question, hint, placeholder } = promptMeta[name];
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="flex items-center gap-2 text-sm leading-5 font-semibold"
      >
        {question}
        {filled ? (
          <Check aria-hidden="true" className="text-positive size-3.5" />
        ) : null}
      </label>
      <p className="text-muted-foreground mt-0.5 text-xs leading-5">{hint}</p>
      <textarea
        id={name}
        {...register(name)}
        rows={rows}
        placeholder={placeholder}
        className={textareaClass}
      />
    </div>
  );
}

export function ReviewForm({
  weekStart,
  entryTimestamp,
  lastSavedAt,
  submitted = false,
  initial,
}: {
  weekStart: string;
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
    formState: { isDirty },
  } = useForm<ReviewFields>({
    defaultValues: { ...emptyReview, ...initial },
  });
  const [savedAt, setSavedAt] = useState(lastSavedAt);
  const [submittedNow, setSubmittedNow] = useState(submitted);
  const [savingIntent, setSavingIntent] = useState<"draft" | "submit">(
    "submit",
  );
  const [pending, startTransition] = useTransition();
  const { submit } = useOfflineSync();
  const values = useWatch({ control });
  const filled = (name: PromptKey) => Boolean(values[name]?.trim());
  const written = promptKeys.filter(filled).length;
  const moreWritten = morePrompts.filter(filled).length;

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

  const adjustScore = (name: ScoreName, amount: number) => {
    const current = Number(values[name]);
    const startingPoint = amount > 0 ? 5 : 1;
    const next = Math.min(
      10,
      Math.max(1, current ? current + amount : startingPoint),
    );
    setValue(name, String(next), { shouldDirty: true, shouldTouch: true });
  };

  return (
    <form
      id="weekly-review"
      onSubmit={submitReview("submit")}
      aria-labelledby="review-composer-heading"
      className="scroll-mt-28 sm:scroll-mt-8"
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 px-1">
        <h2
          id="review-composer-heading"
          className="text-[0.9375rem] font-semibold tracking-[-0.01em]"
        >
          Your review
        </h2>
        {submittedNow ? (
          <StatusPill tone="positive" icon={Check}>
            Submitted
          </StatusPill>
        ) : savedAt ? (
          <StatusPill tone="primary">Draft</StatusPill>
        ) : null}
      </div>

      {/* `overflow-clip` rounds the corners without becoming a scroll
          container, so the action bar can stay sticky. */}
      <div className={cn(glassCardClass, "overflow-clip")}>
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <p className="text-muted-foreground">
              <span className="text-foreground font-semibold">
                {written} of {promptKeys.length}
              </span>{" "}
              answered
            </p>
            <p className="text-muted-foreground min-w-0 truncate text-right">
              Dated{" "}
              <time dateTime={entryTimestamp} className="text-foreground">
                {manilaDateLabel(entryTimestamp)}
              </time>
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Weekly reflection progress"
            aria-valuemin={0}
            aria-valuemax={promptKeys.length}
            aria-valuenow={written}
            aria-valuetext={`${written} of ${promptKeys.length} prompts written`}
            className="bg-primary/12 mt-2.5 h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(written / promptKeys.length) * 100}%` }}
            />
          </div>
        </div>

        <Step
          number={1}
          title="Look back on the week"
          note="A few honest lines are enough. Skip anything that doesn’t fit."
        >
          {lookBack.map((name) => (
            <Prompt
              key={name}
              name={name}
              filled={filled(name)}
              register={register}
            />
          ))}
          <Disclosure
            label="More to reflect on"
            summary={
              moreWritten > 0
                ? `Time, money, and career · ${moreWritten} of 3 written`
                : "Time, money, and career · optional"
            }
          >
            <div className="space-y-5">
              {morePrompts.map((name) => (
                <Prompt
                  key={name}
                  name={name}
                  filled={filled(name)}
                  register={register}
                />
              ))}
            </div>
          </Disclosure>
        </Step>

        <fieldset
          id="weekly-review-scores"
          className="border-border/70 min-w-0 border-t px-4 py-6 sm:px-6"
        >
          <legend className="sr-only">How did the week feel?</legend>
          <div aria-hidden="true" className="flex items-start gap-3">
            <span className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold">
              2
            </span>
            <div className="min-w-0">
              <p className="text-base leading-6 font-semibold tracking-[-0.01em]">
                How did the week feel?
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                Out of 10. Optional, so leave any empty.
              </p>
            </div>
          </div>
          <div className="divide-border/60 mt-3 divide-y">
            {scores.map(({ name, kind, hint }) => {
              const tone = scoreTones[kind];
              return (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 py-3"
                >
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
                    <p
                      id={`${name}-note`}
                      className="text-muted-foreground mt-0.5 text-xs leading-4"
                    >
                      {scoreNote(name, values[name], hint)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                      className="bg-background/50 ring-border/70 focus-visible:ring-primary/45 h-11 w-14 border-0 px-1 text-center font-mono text-xl font-semibold tabular-nums ring-1 sm:h-10"
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
                </div>
              );
            })}
          </div>
        </fieldset>

        <Step
          number={3}
          title="Choose next week’s focus"
          note="One direction, not ten demands. It greets you here next week."
          className="from-primary/[0.06] bg-gradient-to-b to-transparent"
        >
          <Prompt
            name="nextWeekFocus"
            filled={filled("nextWeekFocus")}
            register={register}
            rows={2}
          />
        </Step>

        {/* Stays in reach while a long review scrolls on wide screens. */}
        <div className="border-border/70 bg-card/85 z-10 flex flex-col gap-3 border-t px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:sticky lg:bottom-0">
          <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs leading-5 sm:flex-1">
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
                : "Nothing saved yet"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:justify-end [&>*]:whitespace-nowrap">
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
      </div>
    </form>
  );
}
