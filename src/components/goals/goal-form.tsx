"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GoalActionState } from "@/lib/goals/actions";
import { centavosToPesoInput } from "@/lib/money/money";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: GoalActionState = { success: false, message: "" };

export function GoalForm({
  goal,
  autoFocus = false,
  onCancel,
  onSaved,
}: {
  goal?: {
    id: string;
    title: string;
    description: string | null;
    area: string;
    status: string;
    target_date: string | null;
    success_definition: string | null;
    target_amount_centavos?: number | null;
    saved_amount_centavos?: number | null;
  };
  autoFocus?: boolean;
  onCancel?: () => void;
  /** Called after the goal is created or the edit is saved. */
  onSaved?: () => void;
}) {
  const [state, action, pending] = useOfflineActionState(
    goal ? "goal.update" : "goal.create",
    initial,
  );
  const [, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      form.current?.reset();
      onSaved?.();
    } else {
      toast.error(state.message);
    }
  }, [onSaved, state]);
  return (
    <form
      id={goal ? undefined : "goal-create-form"}
      ref={form}
      // Submitting through `action={...}` makes React clear every field once
      // the action settles, so a rejected amount would wipe the whole form.
      // Dispatching it ourselves keeps what was typed until the save succeeds.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
      // Columns follow the form's own width, so the editor inside a goal card
      // stays readable where the full-width create form spreads out.
      className="border-border bg-card @container rounded-2xl border p-4"
    >
      <div className="[&_input]:text-foreground [&_select]:text-foreground [&_textarea]:text-foreground grid gap-3 @md:grid-cols-2 @4xl:grid-cols-4">
        {goal && <input type="hidden" name="goalId" value={goal.id} />}
        <label className="text-muted-foreground text-xs">
          Goal title
          <Input
            autoFocus={autoFocus}
            name="title"
            required
            maxLength={160}
            defaultValue={goal?.title}
            placeholder="e.g. Launch my portfolio"
            className="mt-1.5"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Area
          <select
            name="area"
            defaultValue={goal?.area ?? "personal"}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm capitalize"
          >
            {[
              "finance",
              "career",
              "health",
              "relationship",
              "family",
              "business",
              "learning",
              "personal",
            ].map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          Target date
          <Input
            name="targetDate"
            type="date"
            defaultValue={goal?.target_date ?? ""}
            className="mt-1.5"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Target amount (₱, optional)
          <Input
            name="targetAmount"
            inputMode="decimal"
            defaultValue={
              goal?.target_amount_centavos
                ? centavosToPesoInput(goal.target_amount_centavos)
                : ""
            }
            placeholder="e.g. 60000"
            className="mt-1.5"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Saved so far (₱, optional)
          <Input
            name="savedAmount"
            inputMode="decimal"
            defaultValue={
              goal?.saved_amount_centavos != null
                ? centavosToPesoInput(goal.saved_amount_centavos)
                : ""
            }
            placeholder="Update it as you save"
            className="mt-1.5"
          />
        </label>
        {goal && (
          <label className="text-muted-foreground text-xs">
            Status
            <select
              name="status"
              defaultValue={goal.status}
              className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm capitalize"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </label>
        )}
        <label className="text-muted-foreground text-xs @md:col-span-2 @4xl:col-span-3">
          Description
          <textarea
            name="description"
            maxLength={2000}
            rows={2}
            defaultValue={goal?.description ?? ""}
            placeholder="Context that will help you act on this goal"
            className="border-border bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 block min-h-11 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2 sm:text-sm"
          />
        </label>
        <label className="text-muted-foreground text-xs @md:col-span-2 @4xl:col-span-3">
          Success definition
          <Input
            name="successDefinition"
            maxLength={300}
            defaultValue={goal?.success_definition ?? ""}
            placeholder="What observable result means this is done?"
            className="mt-1.5"
          />
        </label>
        <div className="flex flex-col-reverse gap-2 @md:col-span-2 @md:flex-row @md:items-end @md:justify-end @4xl:col-span-1">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            className="@4xl:flex-1"
            type="submit"
            pending={pending}
            pendingLabel={goal ? "Saving…" : "Creating…"}
          >
            {goal ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </div>
    </form>
  );
}
