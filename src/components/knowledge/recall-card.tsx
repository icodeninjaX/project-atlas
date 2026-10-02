"use client";

import { ArrowRight, Brain, Check, Eye, RotateCcw } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import styles from "@/components/knowledge/knowledge.module.css";
import { outcomeTones } from "@/components/knowledge/knowledge-tone";
import { Button } from "@/components/ui/button";
import {
  reviewKnowledgeConceptAction,
  type KnowledgeActionState,
  type KnowledgeReviewResult,
} from "@/lib/knowledge/actions";
import type { ReviewOutcome } from "@/lib/knowledge/scheduler";
import {
  intervalLabel,
  outcomeHints,
  outcomeLabels,
  outcomes,
  projectedIntervals,
  strengthLabels,
  strengthLevel,
  whenPhrase,
  type KnowledgeConcept,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const initialState: KnowledgeActionState = { success: false, message: "" };

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      aria-hidden="true"
      className="bg-background/70 text-muted-foreground ring-border/80 hidden min-w-5 rounded-md px-1 py-px text-center font-mono text-[0.625rem] leading-4 font-semibold ring-1 [@media(pointer:fine)]:inline-block"
    >
      {children}
    </kbd>
  );
}

/** What was just recorded, and when the concept comes back. */
function Recorded({
  review,
  confidenceBefore,
  nowIso,
  onAgain,
  onNext,
}: {
  review: KnowledgeReviewResult;
  confidenceBefore: number;
  nowIso: string;
  onAgain: () => void;
  onNext?: () => void;
}) {
  const before = strengthLevel(confidenceBefore);
  const after = strengthLevel(review.confidence);
  return (
    <div
      role="status"
      className={cn(
        "bg-positive/[0.06] ring-positive/20 rounded-2xl p-4 ring-1 sm:p-5",
        styles.settle,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="bg-positive/12 text-positive ring-positive/20 grid size-9 shrink-0 place-items-center rounded-full ring-1"
        >
          <Check className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] leading-6 font-semibold">
            Rated {outcomeLabels[review.outcome]}. Next review{" "}
            {review.intervalDays === 0
              ? "in 10 minutes"
              : whenPhrase(review.nextReviewAt, nowIso)}
            .
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            {review.intervalDays === 0
              ? "It comes straight back so you can try again."
              : `Spaced ${intervalLabel(review.intervalDays)} out.`}{" "}
            {after === before
              ? `Strength holds at ${strengthLabels[after]}.`
              : `Strength ${after > before ? "up" : "down"} to ${strengthLabels[after]}.`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onAgain}>
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Practice again
        </Button>
        {onNext ? (
          <Button type="button" size="sm" onClick={onNext}>
            Next due concept
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Active recall for one concept: explain it from memory, reveal the notes,
 * then rate how it went. Each rating shows the interval it would set.
 * Key it by the concept so a new concept starts unrevealed.
 */
export function RecallCard({
  concept,
  nowIso,
  size = "md",
  shortcuts = false,
  focusOnMount = false,
  onReviewed,
  onRecorded,
  onNext,
}: {
  concept: KnowledgeConcept;
  nowIso: string;
  size?: "md" | "lg";
  /** Space reveals and 1–4 rate, outside text fields. */
  shortcuts?: boolean;
  /** Sends focus to the prompt, for a card that just replaced another. */
  focusOnMount?: boolean;
  /** Called once a rating is saved. Without it, the card shows the result. */
  onReviewed?: (
    outcome: ReviewOutcome,
    review: KnowledgeReviewResult | null,
  ) => void;
  /** Called when the card shows a saved result. */
  onRecorded?: () => void;
  /** Offers to move on from the result. */
  onNext?: () => void;
}) {
  const headingId = useId();
  const answerId = useId();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const ratingButtons = useRef<
    Partial<Record<ReviewOutcome, HTMLButtonElement>>
  >({});
  const [revealed, setRevealed] = useState(false);
  // The result in view, cleared by Practice again.
  const [recorded, setRecorded] = useState<{
    review: KnowledgeReviewResult;
    confidenceBefore: number;
  } | null>(null);
  const [, action, pending] = useActionState(
    async (previous: KnowledgeActionState, formData: FormData) => {
      const confidenceBefore = concept.confidence;
      const result = await reviewKnowledgeConceptAction(previous, formData);
      if (!result.success) {
        toast.error(result.message || "The review could not be recorded.");
        return result;
      }
      if (onReviewed)
        onReviewed(
          formData.get("outcome") as ReviewOutcome,
          result.review ?? null,
        );
      else if (result.review) {
        setRecorded({ review: result.review, confidenceBefore });
        setRevealed(false);
        onRecorded?.();
      } else toast.success(result.message);
      return result;
    },
    initialState,
  );
  const intervals = projectedIntervals(concept);
  const reveal = () => setRevealed(true);

  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    if (!shortcuts) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTextField(event.target)
      )
        return;
      if (!revealed && event.key === " ") {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest("button, a")
        )
          return;
        event.preventDefault();
        setRevealed(true);
        return;
      }
      const outcome = outcomes[Number(event.key) - 1];
      if (!revealed || pending || !outcome) return;
      event.preventDefault();
      form.current?.requestSubmit(ratingButtons.current[outcome]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, revealed, shortcuts]);

  if (recorded) {
    return (
      <Recorded
        review={recorded.review}
        confidenceBefore={recorded.confidenceBefore}
        nowIso={nowIso}
        onAgain={() => setRecorded(null)}
        onNext={onNext}
      />
    );
  }

  const large = size === "lg";
  return (
    <form ref={form} action={action} className="@container min-w-0">
      <input type="hidden" name="conceptId" value={concept.id} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className={cn(eyebrowClass, "text-primary flex items-center gap-2")}>
          <Brain aria-hidden="true" className="size-3.5" />
          Active recall
        </p>
        <p className="text-muted-foreground text-xs">
          {revealed ? "Step 2 of 2 · Rate it" : "Step 1 of 2 · Recall it"}
        </p>
      </div>
      <h3
        ref={heading}
        id={headingId}
        tabIndex={-1}
        className={cn(
          "mt-3 font-semibold tracking-[-0.02em] text-balance break-words outline-none",
          large
            ? "text-xl leading-7 sm:text-2xl sm:leading-8"
            : "text-lg leading-7",
        )}
      >
        Explain “{concept.title}” in your own words.
      </h3>
      <label htmlFor={answerId} className="sr-only">
        Your answer
      </label>
      <textarea
        id={answerId}
        name="recalledAnswer"
        rows={large ? 5 : 4}
        maxLength={5000}
        className="border-border bg-background/70 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-4 w-full rounded-2xl border px-4 py-3 text-base leading-6 outline-none focus-visible:ring-2 sm:text-sm"
        placeholder="Type what you remember before you reveal the notes…"
      />

      {revealed ? (
        <div
          className={cn(
            "bg-primary/[0.05] ring-primary/15 mt-3 rounded-2xl p-4 ring-1 sm:p-5",
            styles.settle,
          )}
        >
          <p className={cn(eyebrowClass, "dark:text-primary text-blue-700")}>
            Learning notes
          </p>
          <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
            {concept.notes}
          </p>
          {concept.example ? (
            <div className="border-border/70 mt-4 border-t pt-3">
              <p className={eyebrowClass}>Example</p>
              <p className="mt-1.5 text-sm leading-6 break-words whitespace-pre-wrap">
                {concept.example}
              </p>
            </div>
          ) : null}
          {concept.personal_explanation ? (
            <div className="border-border/70 mt-4 border-t pt-3">
              <p className={eyebrowClass}>In your words, earlier</p>
              <p className="mt-1.5 text-sm leading-6 break-words whitespace-pre-wrap italic">
                {concept.personal_explanation}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="button" variant="secondary" onClick={reveal}>
            <Eye aria-hidden="true" className="size-4" />
            Reveal notes
            {shortcuts ? <Kbd>Space</Kbd> : null}
          </Button>
          <p className="text-muted-foreground text-xs leading-5">
            A rough answer still strengthens the memory.
          </p>
        </div>
      )}

      <fieldset disabled={!revealed || pending} className="mt-5 min-w-0">
        <legend className="text-muted-foreground mb-2 text-xs">
          How well did you recall it?
          {!revealed ? (
            <span className="sr-only"> Reveal the notes first.</span>
          ) : null}
        </legend>
        <div className="grid grid-cols-2 gap-2 @[24rem]:grid-cols-4">
          {outcomes.map((outcome, index) => {
            const tone = outcomeTones[outcome];
            return (
              <button
                key={outcome}
                ref={(node) => {
                  if (node) ratingButtons.current[outcome] = node;
                }}
                type="submit"
                name="outcome"
                value={outcome}
                className={cn(
                  "group bg-background/60 ring-border/80 focus-visible:ring-ring relative flex min-h-16 min-w-0 flex-col items-start justify-center overflow-hidden rounded-2xl px-3 py-2.5 text-left ring-1 transition-[background-color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none",
                  "enabled:hover:bg-card enabled:hover:shadow-[0_10px_24px_-16px_rgb(7_10_15/0.6)]",
                  large && "min-h-[4.5rem]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("absolute inset-x-0 top-0 h-[3px]", tone.dot)}
                />
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold", tone.text)}>
                    {outcomeLabels[outcome]}
                  </span>
                  {shortcuts ? <Kbd>{String(index + 1)}</Kbd> : null}
                </span>
                <span className="text-foreground mt-0.5 font-mono text-xs font-semibold">
                  <span className="sr-only">, next review in </span>
                  {intervalLabel(intervals[outcome])}
                </span>
                <span className="text-muted-foreground text-[0.6875rem] leading-4 max-[359px]:hidden">
                  <span className="sr-only">, </span>
                  {outcomeHints[outcome]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <p aria-live="polite" className="sr-only">
        {pending ? "Saving your rating…" : ""}
      </p>
    </form>
  );
}
