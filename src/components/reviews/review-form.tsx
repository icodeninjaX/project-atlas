"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Compass,
  Hourglass,
  Lightbulb,
  Minus,
  Plus,
  Save,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manilaDateLabel } from "@/lib/dates/dates";
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

const questions = [
  {
    name: "wins",
    label: "What went well?",
    hint: "Notice a moment worth keeping.",
    placeholder: "A small win, a kind moment, or progress you nearly missed…",
    icon: Sparkles,
  },
  {
    name: "challenges",
    label: "What was difficult?",
    hint: "Name it without judging yourself.",
    placeholder: "What felt heavy, frustrating, or harder than expected?…",
    icon: CloudRain,
  },
  {
    name: "lessons",
    label: "What did you learn?",
    hint: "Turn the week into something useful.",
    placeholder: "A lesson, realization, or reminder you want to carry…",
    icon: Lightbulb,
  },
  {
    name: "timeWasters",
    label: "Where did time slip away?",
    hint: "Spot the pattern, then let it go.",
    placeholder: "A distraction, detour, or habit that took more than it gave…",
    icon: Hourglass,
  },
  {
    name: "moneyReflection",
    label: "What happened financially?",
    hint: "Keep the story behind the numbers.",
    placeholder: "A choice, expense, saving win, or money feeling you noticed…",
    icon: WalletCards,
  },
  {
    name: "careerReflection",
    label: "What moved your career forward?",
    hint: "Quiet progress still counts.",
    placeholder: "Something you built, practiced, learned, or reached for…",
    icon: BriefcaseBusiness,
  },
  {
    name: "nextWeekFocus",
    label: "What matters most next week?",
    hint: "Choose one direction, not ten demands.",
    placeholder:
      "If one thing deserves your best attention next week, what is it?…",
    icon: Compass,
  },
] as const;

const scores = [
  {
    name: "energyScore",
    label: "Energy",
    hint: "How charged did you feel?",
  },
  {
    name: "stressScore",
    label: "Stress",
    hint: "How much pressure followed you?",
  },
  {
    name: "overallScore",
    label: "Overall",
    hint: "How did the week feel as a whole?",
  },
] as const;

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

export function ReviewForm({
  weekStart,
  entryTimestamp,
  lastSavedAt,
  initial,
}: {
  weekStart: string;
  entryTimestamp: string;
  lastSavedAt?: string;
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
    defaultValues: initial,
  });
  const [savedAt, setSavedAt] = useState(lastSavedAt);
  const [activePrompt, setActivePrompt] = useState(0);
  const [savingIntent, setSavingIntent] = useState<"draft" | "submit">(
    "submit",
  );
  const [pending, startTransition] = useTransition();
  const { submit } = useOfflineSync();
  const values = useWatch({ control });
  const activeQuestion = questions[activePrompt] ?? questions[0];
  const completedPrompts = questions.filter(({ name }) =>
    values[name]?.trim(),
  ).length;

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
      const nextQuestion = questions[nextIndex] ?? questions[0];
      window.requestAnimationFrame(() => setFocus(nextQuestion.name));
    }
  };

  const movePastPrompts = () => {
    document
      .getElementById("weekly-review-scores")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <form onSubmit={submitReview("submit")} className="space-y-4 sm:space-y-6">
      <section
        aria-label="Reflection date and progress"
        className="border-primary/20 bg-primary/[0.055] overflow-hidden rounded-xl border sm:rounded-2xl"
      >
        <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="border-primary/20 bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl border sm:size-10">
              <CalendarDays className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
                Added automatically
              </p>
              <time
                dateTime={entryTimestamp}
                className="mt-1 block text-sm font-semibold"
              >
                {manilaDateLabel(entryTimestamp)}
              </time>
              <p className="text-muted-foreground mt-1 hidden text-xs leading-5 sm:block">
                Write naturally—Atlas keeps the exact day inside this weekly
                review for you.
              </p>
            </div>
          </div>

          <div className="sm:min-w-48 sm:text-right">
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-muted-foreground text-xs">
                {completedPrompts} of {questions.length} prompts
              </p>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {Math.round((completedPrompts / questions.length) * 100)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Weekly reflection progress"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={completedPrompts}
              className="bg-primary/10 mt-2 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${(completedPrompts / questions.length) * 100}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-[10px]">
              {isDirty
                ? "You have unsaved thoughts"
                : savedAt
                  ? `Last saved ${manilaDateLabel(savedAt)}`
                  : "A few honest lines are enough"}
            </p>
          </div>
        </div>
      </section>

      <section className="lg:hidden" aria-label="Choose a reflection prompt">
        <div className="grid grid-cols-7 gap-1.5">
          {questions.map(({ name, label }, index) => {
            const filled = Boolean(values[name]?.trim());
            const selected = activePrompt === index;
            return (
              <button
                key={name}
                type="button"
                aria-label={`Prompt ${index + 1}: ${label}`}
                aria-current={selected ? "step" : undefined}
                onClick={() => selectPrompt(index)}
                className={cn(
                  "border-border bg-card text-muted-foreground focus-visible:ring-ring grid min-h-10 place-items-center rounded-xl border font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  selected &&
                    "border-primary bg-primary text-primary-foreground shadow-sm",
                  filled && !selected && "border-primary/35 text-primary",
                )}
              >
                {filled && !selected ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  index + 1
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Prompt {activePrompt + 1} of {questions.length}
          </p>
          <p className="truncate text-xs font-semibold">
            {activeQuestion.label}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {questions.map(
          ({ name, label, hint, placeholder, icon: Icon }, index) => {
            const filled = Boolean(values[name]?.trim());
            return (
              <section
                key={name}
                className={cn(
                  "border-border bg-background rounded-2xl border p-4 transition-colors sm:p-5",
                  filled && "border-primary/35 bg-primary/[0.025]",
                  name === "nextWeekFocus" && "lg:col-span-2",
                  index !== activePrompt && "hidden lg:block",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "bg-secondary text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl",
                      filled && "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={name} className="text-sm font-semibold">
                      {label}
                    </label>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                      {hint}
                    </p>
                  </div>
                </div>
                <textarea
                  id={name}
                  {...register(name)}
                  rows={name === "nextWeekFocus" ? 3 : 4}
                  placeholder={placeholder}
                  className="border-border bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-4 [field-sizing:content] max-h-96 min-h-32 w-full resize-y overflow-y-auto rounded-xl border p-3 text-sm leading-6 outline-none focus-visible:ring-2 sm:[field-sizing:fixed] sm:max-h-none sm:min-h-0"
                />
                <div className="text-muted-foreground mt-2 flex min-h-4 items-center justify-between gap-3 text-[10px]">
                  <span>You can come back and add more anytime.</span>
                  {filled ? (
                    <span className="text-primary flex shrink-0 items-center gap-1 font-semibold">
                      <CheckCircle2 className="size-3" />
                      Captured
                    </span>
                  ) : null}
                </div>
              </section>
            );
          },
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Button
          type="button"
          variant="secondary"
          disabled={activePrompt === 0}
          onClick={() => selectPrompt(activePrompt - 1, true)}
        >
          <ChevronLeft className="size-4" />
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
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <fieldset
        id="weekly-review-scores"
        className={cn(
          "border-border bg-background scroll-mt-36 rounded-2xl border p-4 sm:p-5",
          activePrompt !== questions.length - 1 && "hidden lg:block",
        )}
      >
        <legend className="px-2 text-sm font-semibold">
          How did the week feel?
        </legend>
        <p className="text-muted-foreground -mt-1 text-xs leading-5">
          Leave any score empty if numbers do not help this week.
        </p>
        <div className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
          {scores.map(({ name, label, hint }) => (
            <div
              key={name}
              className="border-border bg-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl border p-3 sm:block"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label htmlFor={name} className="text-xs font-semibold">
                    {label}
                  </label>
                  <p className="text-muted-foreground mt-0.5 hidden text-[10px] leading-4 sm:block">
                    {hint}
                  </p>
                </div>
                <span className="text-muted-foreground font-mono text-[10px]">
                  /10
                </span>
              </div>
              <div className="grid grid-cols-[2.5rem_3.75rem_2.5rem] gap-1.5 sm:mt-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${label.toLowerCase()} score`}
                  onClick={() => adjustScore(name, -1)}
                  className="border-border bg-secondary hover:bg-muted focus-visible:ring-ring grid min-h-11 place-items-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Minus className="size-4" />
                </button>
                <Input
                  id={name}
                  {...register(name)}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  aria-describedby={`${name}-note`}
                  className="text-center font-mono text-base font-semibold tabular-nums"
                />
                <button
                  type="button"
                  aria-label={`Increase ${label.toLowerCase()} score`}
                  onClick={() => adjustScore(name, 1)}
                  className="border-border bg-secondary hover:bg-muted focus-visible:ring-ring grid min-h-11 place-items-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <p
                id={`${name}-note`}
                className="text-muted-foreground col-span-2 mt-1 text-left text-[10px] sm:mt-2 sm:text-center"
              >
                {scoreNote(name, values[name])}
              </p>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="border-border flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
        <p className="text-muted-foreground hidden items-center gap-2 text-xs leading-5 sm:flex">
          <CalendarDays className="size-3.5 shrink-0" />
          The date is added when Atlas saves—nothing extra to fill in.
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
            <Save className="size-4" />
            Save draft
          </Button>
          <Button
            type="submit"
            disabled={pending}
            pending={pending && savingIntent === "submit"}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            <Send className="size-4" />
            Submit review
          </Button>
        </div>
      </div>
    </form>
  );
}
