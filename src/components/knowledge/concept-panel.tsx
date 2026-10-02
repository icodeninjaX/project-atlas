"use client";

import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { toast } from "sonner";
import { DueChip } from "@/components/career/due-chip";
import { outcomeTones } from "@/components/knowledge/knowledge-tone";
import { RecallCard } from "@/components/knowledge/recall-card";
import { StrengthPips } from "@/components/knowledge/strength";
import { Button } from "@/components/ui/button";
import {
  setKnowledgeConceptArchivedAction,
  type KnowledgeActionState,
} from "@/lib/knowledge/actions";
import {
  formatKnowledgeDate,
  intervalLabel,
  outcomeLabels,
  relativeDay,
  reviewChip,
  type KnowledgeConcept,
  type KnowledgeReview,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const initialState: KnowledgeActionState = { success: false, message: "" };

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

function ArchiveForm({
  concept,
  onDone,
}: {
  concept: KnowledgeConcept;
  onDone?: () => void;
}) {
  const archived = Boolean(concept.archived_at);
  const [, action, pending] = useActionState(
    async (previous: KnowledgeActionState, formData: FormData) => {
      const result = await setKnowledgeConceptArchivedAction(
        previous,
        formData,
      );
      if (result.success) {
        toast.success(result.message);
        onDone?.();
      } else toast.error(result.message);
      return result;
    },
    initialState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="conceptId" value={concept.id} />
      <input
        type="hidden"
        name="archived"
        value={archived ? "false" : "true"}
      />
      {archived ? (
        <Button type="submit" pending={pending} pendingLabel="Restoring…">
          <ArchiveRestore aria-hidden="true" className="size-4" />
          Restore concept
        </Button>
      ) : (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          pending={pending}
          pendingLabel="Archiving…"
        >
          <Archive aria-hidden="true" className="size-3.5" />
          Archive
        </Button>
      )}
    </form>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-background/55 ring-border/70 min-w-0 rounded-2xl px-3.5 py-3 ring-1">
      <dt className="text-muted-foreground text-[0.6875rem] leading-4 font-medium">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-5 font-medium break-words">
        {children}
      </dd>
    </div>
  );
}

function MemoryStats({
  concept,
  nowIso,
}: {
  concept: KnowledgeConcept;
  nowIso: string;
}) {
  const chip = reviewChip(concept, nowIso);
  return (
    <dl className="grid grid-cols-2 gap-2">
      <Stat label="Strength">
        <StrengthPips confidence={concept.confidence} />
      </Stat>
      <Stat label="Next review">
        {chip ? (
          <DueChip due={chip} showDate={false} />
        ) : (
          <span className="text-muted-foreground">Paused</span>
        )}
      </Stat>
      <Stat label="Spacing">
        {concept.review_count === 0 ? (
          <span className="text-muted-foreground">
            Set by your first review
          </span>
        ) : (
          <span className="font-mono">
            {intervalLabel(concept.interval_days)}
          </span>
        )}
      </Stat>
      <Stat label="Reviews">
        <span className="font-mono">{concept.review_count}</span>
        {concept.last_reviewed_at ? (
          <span className="text-muted-foreground text-xs font-normal">
            {" "}
            · last {relativeDay(concept.last_reviewed_at, nowIso).toLowerCase()}
          </span>
        ) : null}
      </Stat>
    </dl>
  );
}

function ReviewHistory({
  reviews,
  nowIso,
}: {
  reviews: KnowledgeReview[];
  nowIso: string;
}) {
  if (reviews.length === 0) return null;
  // Oldest to newest, left to right, so the trend reads forward.
  const trail = reviews.slice(0, 16).reverse();
  return (
    <section className="border-border/70 mt-6 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-[-0.01em]">
          Review history
        </h3>
        <span aria-hidden="true" className="flex items-center gap-1">
          {trail.map((review) => (
            <span
              key={review.id}
              title={`${outcomeLabels[review.outcome]} · ${formatKnowledgeDate(review.reviewed_at)}`}
              className={cn(
                "size-2.5 rounded-full",
                outcomeTones[review.outcome].dot,
              )}
            />
          ))}
        </span>
      </div>
      <ol className="mt-3 space-y-1.5">
        {reviews.slice(0, 8).map((review) => {
          const tone = outcomeTones[review.outcome];
          return (
            <li
              key={review.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ring-1",
                  tone.soft,
                  tone.text,
                  tone.ring,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 rounded-full", tone.dot)}
                />
                {outcomeLabels[review.outcome]}
              </span>
              <span className="text-muted-foreground">
                {relativeDay(review.reviewed_at, nowIso)} · then{" "}
                <span className="text-foreground font-mono">
                  {intervalLabel(review.next_interval_days)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * One concept in full: where its memory stands, recall practice, and its
 * review history. Archived concepts show their notes and a restore button.
 */
export function ConceptPanel({
  concept,
  reviews,
  nowIso,
  showTitle = true,
  onEdit,
  onRecorded,
  onNext,
  onArchived,
}: {
  concept: KnowledgeConcept;
  /** This concept's reviews, newest first. */
  reviews: KnowledgeReview[];
  nowIso: string;
  /** A sheet shows the title in its own header. */
  showTitle?: boolean;
  onEdit: () => void;
  /** A rating was saved; the concept may have left the list. */
  onRecorded?: () => void;
  onNext?: () => void;
  onArchived?: () => void;
}) {
  const archived = Boolean(concept.archived_at);
  return (
    <div className="min-w-0">
      {showTitle ? (
        <>
          <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {concept.category}
          </p>
          <h2 className="mt-1.5 text-xl leading-7 font-semibold tracking-[-0.025em] break-words">
            {concept.title}
          </h2>
        </>
      ) : null}
      {concept.tags.length ? (
        <ul
          aria-label="Tags"
          className={cn("flex flex-wrap gap-1.5", showTitle && "mt-3")}
        >
          {concept.tags.map((tag) => (
            <li
              key={tag}
              className="bg-muted/80 text-muted-foreground rounded-full px-2 py-0.5 text-[0.6875rem] font-medium"
            >
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}

      {archived ? (
        <div className="mt-5">
          <p className="text-muted-foreground text-sm leading-6">
            Archived {formatKnowledgeDate(concept.archived_at!)}. Restore it to
            bring it back into your reviews.
          </p>
          <div className="bg-background/55 ring-border/70 mt-4 rounded-2xl p-4 ring-1">
            <p className={eyebrowClass}>Learning notes</p>
            <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
              {concept.notes}
            </p>
            {concept.example ? (
              <p className="text-muted-foreground mt-3 text-xs leading-5 break-words">
                <span className="text-foreground font-semibold">Example:</span>{" "}
                {concept.example}
              </p>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ArchiveForm concept={concept} onDone={onArchived} />
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Pencil aria-hidden="true" className="size-3.5" />
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <MemoryStats concept={concept} nowIso={nowIso} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
              <Pencil aria-hidden="true" className="size-3.5" />
              Edit
            </Button>
            <ArchiveForm concept={concept} onDone={onArchived} />
          </div>
          <div className="border-border/70 mt-3 border-t pt-5">
            <RecallCard
              key={concept.id}
              concept={concept}
              nowIso={nowIso}
              onRecorded={onRecorded}
              onNext={onNext}
            />
          </div>
        </>
      )}

      <ReviewHistory reviews={reviews} nowIso={nowIso} />
    </div>
  );
}
