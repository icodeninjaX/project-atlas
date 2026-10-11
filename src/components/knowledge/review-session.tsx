"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "@/components/knowledge/knowledge.module.css";
import { outcomeTones } from "@/components/knowledge/knowledge-tone";
import { RecallCard } from "@/components/knowledge/recall-card";
import { StrengthPips } from "@/components/knowledge/strength";
import { Button } from "@/components/ui/button";
import type { KnowledgeReviewResult } from "@/lib/knowledge/actions";
import type { ReviewOutcome } from "@/lib/knowledge/scheduler";
import {
  intervalLabel,
  outcomeLabels,
  outcomes,
  relativeDay,
  type KnowledgeConcept,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

export type SessionMode = "due" | "practice";

type Result = {
  conceptId: string;
  title: string;
  outcome: ReviewOutcome;
  intervalDays: number | null;
};

function Summary({
  results,
  skipped,
  onClose,
}: {
  results: Result[];
  skipped: number;
  onClose: () => void;
}) {
  const counts = Object.fromEntries(
    outcomes.map((outcome) => [
      outcome,
      results.filter((result) => result.outcome === outcome).length,
    ]),
  ) as Record<ReviewOutcome, number>;
  const recalled = counts.good + counts.easy;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className={cn("mx-auto w-full max-w-xl", styles.settle)}>
      <h3
        ref={heading}
        tabIndex={-1}
        className="flex items-center gap-2 text-lg font-semibold outline-none"
      >
        {results.length ? (
          <CircleCheck
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
        ) : null}
        {results.length ? "Session complete" : "Nothing reviewed"}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        {results.length
          ? `You reviewed ${results.length} ${results.length === 1 ? "concept" : "concepts"} and recalled ${recalled} well.`
          : "Every concept was skipped. They stay due until you rate them."}
        {skipped && results.length
          ? ` ${skipped} skipped ${skipped === 1 ? "stays" : "stay"} due.`
          : ""}
      </p>
      {results.length ? (
        <>
          <dl className="bg-border mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-xl border">
            {outcomes.map((outcome) => {
              const tone = outcomeTones[outcome];
              return (
                <div
                  key={outcome}
                  className="bg-card min-w-0 px-2 py-3 text-center"
                >
                  <dt className={cn("text-xs font-semibold", tone.text)}>
                    {outcomeLabels[outcome]}
                  </dt>
                  <dd className="mt-1 font-mono text-xl font-semibold tracking-[-0.025em]">
                    {counts[outcome]}
                  </dd>
                </div>
              );
            })}
          </dl>
          <ol className="divide-border/70 mt-4 divide-y border-y">
            {results.map((result) => {
              const tone = outcomeTones[result.outcome];
              return (
                <li
                  key={result.conceptId}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm"
                >
                  <span className="min-w-0 font-medium break-words">
                    {result.title}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className={cn("font-semibold", tone.text)}>
                      {outcomeLabels[result.outcome]}
                    </span>
                    {result.intervalDays != null ? (
                      <span className="text-muted-foreground">
                        · back in{" "}
                        <span className="text-foreground font-mono">
                          {intervalLabel(result.intervalDays)}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onClose} className="min-w-32">
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * A focused review of a fixed queue, one concept at a time: recall, reveal,
 * rate, and on to the next, then a summary. The queue is the concepts that
 * were due (or weakest) when the session began; ratings save as they go.
 */
export function ReviewSession({
  open,
  onOpenChange,
  ids,
  concepts,
  mode,
  nowIso,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The queue, fixed when the session starts. */
  ids: string[];
  /** The latest concepts, so each card shows what was saved. */
  concepts: KnowledgeConcept[];
  mode: SessionMode;
  nowIso: string;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [skipped, setSkipped] = useState(0);

  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  // Concepts archived or removed since the session began are passed over.
  const position = ids.findIndex((id, at) => {
    const concept = byId.get(id);
    return at >= index && concept != null && !concept.archived_at;
  });
  const current = position === -1 ? null : byId.get(ids[position]!)!;
  const total = ids.length;
  // Where the session stands, counting concepts passed over.
  const reached = current ? position : total;
  const close = () => onOpenChange(false);

  const advance = () => setIndex(position + 1);
  const recordReview = (
    outcome: ReviewOutcome,
    review: KnowledgeReviewResult | null,
  ) => {
    if (!current) return;
    setResults((previous) => [
      ...previous,
      {
        conceptId: current.id,
        title: current.title,
        outcome,
        intervalDays: review?.intervalDays ?? null,
      },
    ]);
    advance();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-safe:animate-analyst-fade fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="bg-background fixed inset-0 isolate z-50 flex flex-col overflow-hidden outline-none sm:inset-4 sm:rounded-2xl sm:border sm:shadow-2xl lg:inset-y-8 lg:left-1/2 lg:w-[min(56rem,calc(100vw-4rem))] lg:-translate-x-1/2"
        >
          <header className="bg-background relative z-10 shrink-0 border-b px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 sm:px-6 sm:pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium">
                  {mode === "due" ? "Review session" : "Practice session"}
                </p>
                <Dialog.Title className="mt-0.5 text-lg font-semibold tracking-[-0.015em]">
                  {current ? `Concept ${reached + 1} of ${total}` : "Summary"}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-mr-2 shrink-0"
                >
                  {current ? "End session" : "Close"}
                </Button>
              </Dialog.Close>
            </div>
            <div
              role="progressbar"
              aria-label="Session progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={reached}
              className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full"
            >
              <span
                className="bg-primary block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  width: `${total ? (reached / total) * 100 : 100}%`,
                }}
              />
            </div>
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8 sm:py-8">
            {current ? (
              <div
                key={current.id}
                className={cn("mx-auto w-full max-w-2xl", styles.settle)}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <span className="text-foreground/80 font-medium">
                    {current.category}
                  </span>
                  <StrengthPips confidence={current.confidence} />
                  <span className="text-muted-foreground">
                    {current.review_count === 0
                      ? "First recall"
                      : `Reviewed ${current.review_count} ${current.review_count === 1 ? "time" : "times"}${current.last_reviewed_at ? `, last ${relativeDay(current.last_reviewed_at, nowIso).toLowerCase()}` : ""}`}
                  </span>
                </div>
                <div className="mt-5">
                  <RecallCard
                    concept={current}
                    nowIso={nowIso}
                    size="lg"
                    shortcuts
                    focusOnMount
                    onReviewed={recordReview}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground text-xs [@media(pointer:coarse)]:hidden">
                    Space reveals · 1–4 rate · Esc ends the session
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSkipped((value) => value + 1);
                      advance();
                    }}
                    className="ml-auto"
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : (
              <Summary results={results} skipped={skipped} onClose={close} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
