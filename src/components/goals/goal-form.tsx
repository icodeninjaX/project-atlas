"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createGoalAction,
  updateGoalAction,
  type GoalActionState,
} from "@/lib/goals/actions";

const initial: GoalActionState = { success: false, message: "" };

export function GoalForm({
  goal,
}: {
  goal?: {
    id: string;
    title: string;
    description: string | null;
    area: string;
    status: string;
    target_date: string | null;
    progress_percent: number;
    success_definition: string | null;
  };
}) {
  const submitAction = goal ? updateGoalAction : createGoalAction;
  const [state, action, pending] = useActionState(submitAction, initial);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
    if (state.success) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      action={action}
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {goal && <input type="hidden" name="goalId" value={goal.id} />}
      <label className="text-muted-foreground text-xs">
        Goal title
        <Input
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
        Progress percent
        <Input
          name="progressPercent"
          type="number"
          min="0"
          max="100"
          defaultValue={goal?.progress_percent ?? 0}
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
      <Button className="self-end" type="submit" disabled={pending}>
        {pending ? "Saving…" : goal ? "Save changes" : "Create goal"}
      </Button>
    </form>
  );
}
