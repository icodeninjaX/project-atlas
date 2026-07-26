"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGoalAction, type GoalActionState } from "@/lib/goals/actions";

const initial: GoalActionState = { success: false, message: "" };

export function GoalForm() {
  const [state, action, pending] = useActionState(createGoalAction, initial);
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
      <Input
        name="title"
        required
        maxLength={160}
        placeholder="Goal title"
        aria-label="Goal title"
      />
      <select
        name="area"
        defaultValue="personal"
        aria-label="Goal area"
        className="border-border bg-background min-h-11 rounded-xl border px-3 text-sm"
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
      <Input name="targetDate" type="date" aria-label="Target date" />
      <div className="flex gap-2">
        <Input
          name="progressPercent"
          type="number"
          min="0"
          max="100"
          defaultValue="0"
          aria-label="Progress percent"
        />
        <Button className="shrink-0" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create goal"}
        </Button>
      </div>
      <Input
        name="successDefinition"
        maxLength={300}
        placeholder="What does success look like?"
        aria-label="Success definition"
        className="sm:col-span-2 lg:col-span-4"
      />
    </form>
  );
}
