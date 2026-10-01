"use client";

import { useEffect, useRef } from "react";
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
  onCreated,
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
  onCreated?: () => void;
}) {
  const [state, action, pending] = useOfflineActionState(
    goal ? "goal.update" : "goal.create",
    initial,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      form.current?.reset();
      onCreated?.();
    } else {
      toast.error(state.message);
    }
  }, [onCreated, state]);
  return (
    <form
      id={goal ? undefined : "goal-create-form"}
      ref={form}
      action={action}
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
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
      <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-3">
        Description
        <Input
          name="description"
          maxLength={2000}
          defaultValue={goal?.description ?? ""}
          placeholder="Context that will help you act on this goal"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-3">
        Success definition
        <Input
          name="successDefinition"
          maxLength={300}
          defaultValue={goal?.success_definition ?? ""}
          placeholder="What observable result means this is done?"
          className="mt-1.5"
        />
      </label>
      <div className="flex items-end justify-end gap-2 max-sm:flex-col max-sm:items-stretch sm:col-span-2 lg:col-span-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          className="sm:flex-1"
          type="submit"
          pending={pending}
          pendingLabel={goal ? "Saving…" : "Creating…"}
        >
          {goal ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
