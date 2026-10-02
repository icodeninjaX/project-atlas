"use client";

import { Eye, Link2, PencilLine, Trash2, Unlink } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fieldLabelClass,
  fieldTextareaClass,
} from "@/components/career/application-fields";
import {
  RecordPicker,
  recordTypeLabels,
} from "@/components/decisions/record-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCalendarDate } from "@/lib/dates/dates";
import {
  deleteDecisionAction,
  deleteObservationAction,
  saveObservationAction,
} from "@/lib/decisions/actions";
import type { DecisionObservation } from "@/lib/decisions/decision";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import { cn } from "@/lib/utils";

const initial = { success: false, message: "" };

function sourceLabel(type: string) {
  return type in recordTypeLabels
    ? recordTypeLabels[type as keyof typeof recordTypeLabels]
    : "Record";
}

export function ObservationEditor({
  decisionId,
  decisionOn,
  today,
  observation,
  source,
  onSaved,
  onCancel,
}: {
  decisionId: string;
  decisionOn: string;
  today: string;
  observation?: DecisionObservation;
  source?: GraphEntitySummary | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveObservationAction,
    initial,
  );
  const [deleting, startDelete] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      if (!observation) form.current?.reset();
      onSaved?.();
    } else toast.error(state.message);
  }, [state, observation, onSaved]);
  return (
    <form
      ref={form}
      action={action}
      className="grid grid-cols-[minmax(0,1fr)] gap-3"
    >
      <input type="hidden" name="decisionId" value={decisionId} />
      {observation && (
        <input type="hidden" name="observationId" value={observation.id} />
      )}
      <label className={fieldLabelClass}>
        What did you observe?
        <textarea
          name="note"
          required
          maxLength={2000}
          defaultValue={observation?.note}
          placeholder={
            observation
              ? undefined
              : "What happened, what surprised you, what you would do differently."
          }
          className={cn(fieldTextareaClass, "min-h-24")}
        />
      </label>
      <label className={cn(fieldLabelClass, "sm:max-w-[13rem]")}>
        Observed on
        <Input
          className="mt-1.5 font-mono"
          type="date"
          name="observedOn"
          required
          min={decisionOn}
          max={today}
          defaultValue={observation?.observed_on ?? today}
        />
      </label>
      <RecordPicker
        name="sourceRecord"
        label="Supporting record"
        types={["task", "transaction", "job_application"]}
        initial={source}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Saving…"
          size="sm"
        >
          {observation ? "Update note" : "Add observation"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {observation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
            className="hover:text-destructive ml-auto"
            onClick={() => {
              if (!window.confirm("Delete this observation?")) return;
              const data = new FormData();
              data.set("decisionId", decisionId);
              data.set("observationId", observation.id);
              startDelete(async () => {
                const result = await deleteObservationAction(data);
                toast[result.success ? "success" : "error"](result.message);
              });
            }}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Delete note
          </Button>
        )}
      </div>
      {state.message && (
        <p role="status" className="text-muted-foreground text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * One note on the decision's trail: its date and day after deciding, the
 * note, and the record it cites. Edit opens the note's form in place.
 */
export function ObservationItem({
  decisionId,
  decisionOn,
  today,
  observation,
  source,
  dayLabel,
  afterReview,
  last,
}: {
  decisionId: string;
  decisionOn: string;
  today: string;
  observation: DecisionObservation;
  /** The cited record, or null when there is none or it is gone. */
  source: GraphEntitySummary | null;
  /** "Decision day" or "Day 16". */
  dayLabel: string;
  afterReview: boolean;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const date = formatCalendarDate(observation.observed_on);
  const cited = Boolean(
    observation.source_task_id ||
    observation.source_transaction_id ||
    observation.source_application_id,
  );

  return (
    <li
      id={`observation-${observation.id}`}
      className="group/note relative grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-4"
    >
      {/* The rail runs from this node to the next one. */}
      {last ? null : (
        <span
          aria-hidden="true"
          className="from-border to-border/40 absolute top-9 bottom-0 left-[calc(1rem-0.5px)] w-px bg-gradient-to-b sm:top-10 sm:left-[calc(1.125rem-0.5px)]"
        />
      )}
      <span
        aria-hidden="true"
        className="mt-3 grid size-8 place-items-center rounded-full bg-teal-500/10 text-teal-700 ring-1 ring-teal-500/25 sm:size-9 dark:text-teal-300"
      >
        <Eye className="size-4" />
      </span>
      <article className="bg-card/90 ring-border/80 group-target/note:ring-primary min-w-0 rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05)] ring-1 group-target/note:ring-2 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <time dateTime={observation.observed_on} className="font-semibold">
              {date}
            </time>
            <span
              aria-hidden="true"
              className="bg-muted-foreground/50 size-0.5 rounded-full"
            />
            <span className="text-muted-foreground font-mono">{dayLabel}</span>
            {afterReview ? (
              <span className="bg-positive/10 ring-positive/25 rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold text-emerald-800 ring-1 dark:text-emerald-300">
                Review note
              </span>
            ) : null}
          </p>
          {editing ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              aria-label={`Edit note from ${date}`}
              className="-my-1.5 -mr-2 rounded-full max-sm:size-11 max-sm:px-0"
            >
              <PencilLine aria-hidden="true" className="size-3.5" />
              <span aria-hidden="true" className="max-sm:hidden">
                Edit
              </span>
            </Button>
          )}
        </div>
        {editing ? (
          <div className="mt-4">
            <ObservationEditor
              decisionId={decisionId}
              decisionOn={decisionOn}
              today={today}
              observation={observation}
              source={source}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
              {observation.note}
            </p>
            {source ? (
              <Link
                href={source.href as never}
                aria-label={`Open supporting record: ${sourceLabel(source.type)} · ${source.title}`}
                className="bg-primary/[0.06] text-foreground ring-primary/20 hover:bg-primary/10 focus-visible:ring-ring mt-3 inline-flex min-h-10 max-w-full items-center gap-2 rounded-full px-3 text-xs ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Link2
                  aria-hidden="true"
                  className="text-primary size-3.5 shrink-0"
                />
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">
                    {sourceLabel(source.type)} ·{" "}
                  </span>
                  <span className="font-semibold">{source.title}</span>
                </span>
              </Link>
            ) : cited ? (
              <p className="text-muted-foreground mt-3 inline-flex items-center gap-1.5 text-xs">
                <Unlink aria-hidden="true" className="size-3" />
                Supporting record no longer available
              </p>
            ) : null}
          </>
        )}
      </article>
    </li>
  );
}

export function DeleteDecisionButton({ decisionId }: { decisionId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      // The theme's filled destructive red holds white text at only 3.9:1
      // in dark mode; red text on the quiet surface keeps 4.5:1 in both.
      className="text-red-700 hover:bg-red-500/10 dark:text-red-300"
      onClick={() => {
        if (!window.confirm("Delete this decision and its observations?"))
          return;
        const data = new FormData();
        data.set("decisionId", decisionId);
        startTransition(async () => {
          const result = await deleteDecisionAction(data);
          if (result.success) router.push("/decisions");
          else toast.error(result.message);
        });
      }}
    >
      <Trash2 aria-hidden="true" className="size-4" />
      Delete decision
    </Button>
  );
}
