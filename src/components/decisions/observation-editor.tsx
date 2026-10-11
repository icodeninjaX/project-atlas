"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Link2, PencilLine, Unlink, X } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
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

/**
 * A small confirm for an irreversible delete. `trigger` opens it; nothing
 * is removed unless the destructive button is pressed.
 */
function ConfirmDelete({
  trigger,
  title,
  description,
  keepLabel,
  confirmLabel,
  closeLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  keepLabel: string;
  confirmLabel: string;
  closeLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={closeLabel}
                className="-mt-2 -mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" size="sm" variant="secondary">
                {keepLabel}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
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
          <ConfirmDelete
            title="Delete this observation?"
            description="The note is removed from this decision. This cannot be undone."
            keepLabel="Keep note"
            confirmLabel="Delete note"
            closeLabel="Close delete note confirmation"
            onConfirm={() => {
              const data = new FormData();
              data.set("decisionId", decisionId);
              data.set("observationId", observation.id);
              startDelete(async () => {
                const result = await deleteObservationAction(data);
                toast[result.success ? "success" : "error"](result.message);
              });
            }}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleting}
                className="hover:text-destructive ml-auto"
              >
                {deleting ? "Deleting…" : "Delete note"}
              </Button>
            }
          />
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
          className="bg-border absolute top-9 bottom-0 left-[calc(1rem-0.5px)] w-px sm:top-10 sm:left-[calc(1.125rem-0.5px)]"
        />
      )}
      <span
        aria-hidden="true"
        className="mt-3 grid size-8 place-items-center sm:size-9"
      >
        <span className="bg-muted-foreground/60 ring-background size-2.5 rounded-full ring-4" />
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
              className="-my-1.5 -mr-2 max-sm:size-11 max-sm:px-0"
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
                className="group/source focus-visible:ring-ring mt-3 inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-md text-xs focus-visible:ring-2 focus-visible:outline-none"
              >
                <Link2
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0"
                />
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">
                    {sourceLabel(source.type)} ·{" "}
                  </span>
                  <span className="text-primary font-semibold group-hover/source:underline">
                    {source.title}
                  </span>
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
    <ConfirmDelete
      title="Delete this decision?"
      description="The decision and its observations are removed. This cannot be undone."
      keepLabel="Keep decision"
      confirmLabel="Delete decision"
      closeLabel="Close delete decision confirmation"
      onConfirm={() => {
        const data = new FormData();
        data.set("decisionId", decisionId);
        startTransition(async () => {
          const result = await deleteDecisionAction(data);
          if (result.success) router.push("/decisions");
          else toast.error(result.message);
        });
      }}
      trigger={
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          // The theme's filled destructive red holds white text at only 3.9:1
          // in dark mode; red text on the quiet surface keeps 4.5:1 in both.
          className="text-red-700 hover:bg-red-500/10 dark:text-red-300"
        >
          {pending ? "Deleting…" : "Delete decision"}
        </Button>
      }
    />
  );
}
