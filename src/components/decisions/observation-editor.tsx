"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPicker } from "@/components/decisions/record-picker";
import {
  deleteDecisionAction,
  deleteObservationAction,
  saveObservationAction,
} from "@/lib/decisions/actions";
import type { DecisionObservation } from "@/lib/decisions/decision";
import type { GraphEntitySummary } from "@/lib/graph/registry";

const initial = { success: false, message: "" };

export function ObservationEditor({
  decisionId,
  decisionOn,
  today,
  observation,
  source,
}: {
  decisionId: string;
  decisionOn: string;
  today: string;
  observation?: DecisionObservation;
  source?: GraphEntitySummary | null;
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
    } else toast.error(state.message);
  }, [state, observation]);
  return (
    <form ref={form} action={action} className="grid gap-3">
      <input type="hidden" name="decisionId" value={decisionId} />
      {observation && (
        <input type="hidden" name="observationId" value={observation.id} />
      )}
      <label className="text-muted-foreground text-xs">
        Observed on
        <Input
          className="mt-1.5"
          type="date"
          name="observedOn"
          required
          min={decisionOn}
          max={today}
          defaultValue={observation?.observed_on ?? today}
        />
      </label>
      <label className="text-muted-foreground text-xs">
        What did you observe?
        <textarea
          name="note"
          required
          maxLength={2000}
          defaultValue={observation?.note}
          className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </label>
      <RecordPicker
        name="sourceRecord"
        label="Supporting record"
        types={["task", "transaction", "job_application"]}
        initial={source}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Saving…"
          size="sm"
        >
          {observation ? "Update note" : "Add observation"}
        </Button>
        {observation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
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

export function DeleteDecisionButton({ decisionId }: { decisionId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
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
      Delete decision
    </Button>
  );
}
