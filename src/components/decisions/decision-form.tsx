"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPicker } from "@/components/decisions/record-picker";
import { saveDecisionAction } from "@/lib/decisions/actions";
import type { Decision } from "@/lib/decisions/decision";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import {
  decisionMetricKeys,
  decisionMetricLabel,
} from "@/lib/decisions/decision";

const initial = { success: false, message: "" };
const fieldClass =
  "border-border bg-background focus-visible:ring-ring mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function DecisionForm({
  decision,
  goals,
  today,
  actionTask,
}: {
  decision?: Decision;
  goals: { id: string; title: string }[];
  today: string;
  actionTask?: GraphEntitySummary | null;
}) {
  const [state, action, pending] = useActionState(saveDecisionAction, initial);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      if (!decision) form.current?.reset();
    } else toast.error(state.message);
  }, [state, decision]);
  return (
    <form
      ref={form}
      action={action}
      className="border-border bg-card grid gap-4 rounded-2xl border p-4 sm:grid-cols-2 sm:p-5"
    >
      {decision && (
        <input type="hidden" name="decisionId" value={decision.id} />
      )}
      <label className="text-muted-foreground text-xs sm:col-span-2">
        Decision
        <Input
          className="mt-1.5"
          name="title"
          required
          maxLength={160}
          defaultValue={decision?.title}
          placeholder="Apply to ten jobs each week"
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Date decided
        <Input
          className="mt-1.5"
          name="decisionOn"
          type="date"
          max={today}
          required
          defaultValue={decision?.decision_on ?? today}
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Review on
        <Input
          className="mt-1.5"
          name="reviewOn"
          type="date"
          required
          defaultValue={decision?.review_on}
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2">
        What will you do?
        <textarea
          className={fieldClass}
          name="intent"
          required
          maxLength={1000}
          defaultValue={decision?.intent}
          placeholder="Describe the action you chose."
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2">
        What do you hope will happen?
        <textarea
          className={fieldClass}
          name="expectedOutcome"
          required
          maxLength={1000}
          defaultValue={decision?.expected_outcome}
          placeholder="State an outcome you can revisit later."
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2">
        Why this choice? (optional)
        <textarea
          className={fieldClass}
          name="rationale"
          maxLength={2000}
          defaultValue={decision?.rationale ?? ""}
        />
      </label>
      <label className="text-muted-foreground text-xs sm:col-span-2">
        Assumptions or other factors (optional)
        <textarea
          className={fieldClass}
          name="assumptions"
          maxLength={2000}
          defaultValue={decision?.assumptions ?? ""}
        />
      </label>
      <label className="text-muted-foreground text-xs">
        Related goal (optional)
        <select
          name="goalId"
          defaultValue={decision?.goal_id ?? ""}
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="">No goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted-foreground text-xs">
        Recorded measure (optional)
        <select
          name="metricKey"
          defaultValue={decision?.metric_key ?? ""}
          className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="">No measure</option>
          {decisionMetricKeys.map((key) => (
            <option key={key} value={key}>
              {decisionMetricLabel(key)}
            </option>
          ))}
        </select>
      </label>
      <RecordPicker
        name="actionRecord"
        label="Action task"
        types={["task"]}
        initial={actionTask}
      />
      <p className="text-muted-foreground text-xs leading-5 sm:col-span-2">
        A recorded measure can show what changed in equal 14-day windows before
        and after this date. It does not prove the decision caused the change.
      </p>
      <div className="sm:col-span-2">
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {decision ? "Save changes" : "Record decision"}
        </Button>
      </div>
      {state.message && (
        <p
          role="status"
          className="text-muted-foreground text-xs sm:col-span-2"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
