"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  fieldLabelClass,
  fieldSelectClass,
  fieldTextareaClass,
} from "@/components/career/application-fields";
import { RecordPicker } from "@/components/decisions/record-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDecisionAction } from "@/lib/decisions/actions";
import type { Decision } from "@/lib/decisions/decision";
import {
  decisionMetricKeys,
  decisionMetricLabel,
} from "@/lib/decisions/decision";
import { reviewPresets, shiftDays } from "@/lib/decisions/view";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import { cn } from "@/lib/utils";

const initial = { success: false, message: "" };

/** A numbered group of fields, as in the other ATLAS sheets. */
function Step({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold">
        <span
          aria-hidden="true"
          className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-bold"
        >
          {step}
        </span>
        {title}
      </h3>
      {hint ? (
        <p className="text-muted-foreground mt-1 pl-[2.125rem] text-xs leading-5">
          {hint}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export function DecisionForm({
  decision,
  goals,
  today,
  actionTask,
  autoFocus,
  onCancel,
  onSaved,
}: {
  decision?: Decision;
  goals: { id: string; title: string }[];
  today: string;
  actionTask?: GraphEntitySummary | null;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(saveDecisionAction, initial);
  const form = useRef<HTMLFormElement>(null);
  const reviewInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const [decidedOn, setDecidedOn] = useState(decision?.decision_on ?? today);
  const [reviewOn, setReviewOn] = useState(decision?.review_on ?? "");
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      if (!decision) form.current?.reset();
      onSaved?.();
    } else toast.error(state.message);
  }, [state, decision, onSaved]);
  const validDecidedOn = /^\d{4}-\d{2}-\d{2}$/.test(decidedOn);

  return (
    <form
      ref={form}
      action={action}
      onReset={() => {
        setDecidedOn(decision?.decision_on ?? today);
        setReviewOn(decision?.review_on ?? "");
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-7"
    >
      {decision && (
        <input type="hidden" name="decisionId" value={decision.id} />
      )}

      <Step step={1} title="The choice">
        <label className={cn(fieldLabelClass, "sm:col-span-2")}>
          Decision
          <Input
            className="mt-1.5"
            name="title"
            required
            maxLength={160}
            autoFocus={autoFocus}
            defaultValue={decision?.title}
            placeholder="Apply to ten jobs each week"
          />
        </label>
        <label className={cn(fieldLabelClass, "sm:col-span-2")}>
          What will you do?
          <textarea
            className={cn(fieldTextareaClass, "min-h-24")}
            name="intent"
            required
            maxLength={1000}
            defaultValue={decision?.intent}
            placeholder="Describe the action you chose."
          />
        </label>
        <label className={cn(fieldLabelClass, "sm:col-span-2")}>
          What do you hope will happen?
          <textarea
            className={cn(fieldTextareaClass, "min-h-24")}
            name="expectedOutcome"
            required
            maxLength={1000}
            defaultValue={decision?.expected_outcome}
            placeholder="State an outcome you can revisit later."
            aria-describedby={`${id}-outcome`}
          />
        </label>
        <p
          id={`${id}-outcome`}
          className="text-muted-foreground -mt-1.5 text-[0.6875rem] leading-4 sm:col-span-2"
        >
          You will read this again on the review date.
        </p>
      </Step>

      <Step
        step={2}
        title="When to look back"
        hint="On the review date the decision moves to Ready to review."
      >
        <label className={fieldLabelClass}>
          Date decided
          <Input
            className="mt-1.5 font-mono"
            name="decisionOn"
            type="date"
            max={today}
            required
            defaultValue={decision?.decision_on ?? today}
            onChange={(event) => setDecidedOn(event.target.value)}
          />
        </label>
        <label className={fieldLabelClass}>
          Review on
          <Input
            ref={reviewInput}
            className="mt-1.5 font-mono"
            name="reviewOn"
            type="date"
            required
            min={validDecidedOn ? shiftDays(decidedOn, 1) : undefined}
            defaultValue={decision?.review_on}
            onChange={(event) => setReviewOn(event.target.value)}
            aria-describedby={`${id}-presets`}
          />
        </label>
        {validDecidedOn ? (
          <div className="sm:col-span-2">
            <p
              id={`${id}-presets`}
              className="text-muted-foreground text-[0.6875rem] leading-4"
            >
              Or pick a review date from the decision date:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {reviewPresets(decidedOn).map((preset) => {
                const pressed = reviewOn === preset.on;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => {
                      if (reviewInput.current)
                        reviewInput.current.value = preset.on;
                      setReviewOn(preset.on);
                    }}
                    className={cn(
                      "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
                      pressed
                        ? "bg-primary/10 text-foreground ring-primary"
                        : "bg-background/60 text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </Step>

      <Step
        step={3}
        title="Your reasoning"
        hint="Optional, and worth it: later you can check these against what happened."
      >
        <label className={cn(fieldLabelClass, "sm:col-span-2")}>
          Why this choice? (optional)
          <textarea
            className={cn(fieldTextareaClass, "min-h-20")}
            name="rationale"
            maxLength={2000}
            defaultValue={decision?.rationale ?? ""}
          />
        </label>
        <label className={cn(fieldLabelClass, "sm:col-span-2")}>
          Assumptions or other factors (optional)
          <textarea
            className={cn(fieldTextareaClass, "min-h-20")}
            name="assumptions"
            maxLength={2000}
            defaultValue={decision?.assumptions ?? ""}
          />
        </label>
      </Step>

      <Step step={4} title="Connections">
        <label className={fieldLabelClass}>
          Related goal (optional)
          <select
            name="goalId"
            defaultValue={decision?.goal_id ?? ""}
            className={fieldSelectClass}
          >
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabelClass}>
          Recorded measure (optional)
          <select
            name="metricKey"
            defaultValue={decision?.metric_key ?? ""}
            className={fieldSelectClass}
            aria-describedby={`${id}-measure`}
          >
            <option value="">No measure</option>
            {decisionMetricKeys.map((key) => (
              <option key={key} value={key}>
                {decisionMetricLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <p
          id={`${id}-measure`}
          className="text-muted-foreground text-xs leading-5 sm:col-span-2"
        >
          A recorded measure can show what changed in equal 14-day windows
          before and after this date. It does not prove the decision caused the
          change.
        </p>
        <RecordPicker
          name="actionRecord"
          label="Action task"
          types={["task"]}
          initial={actionTask}
        />
      </Step>

      <div className="border-border bg-background/90 sticky bottom-0 z-20 -mx-5 -mb-[calc(1.5rem+env(safe-area-inset-bottom))] grid gap-2 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-5">
        <div className="flex flex-wrap justify-end gap-2 [&>*]:grow min-[26rem]:[&>*]:grow-0">
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" pending={pending} pendingLabel="Saving…">
            {decision ? "Save changes" : "Record decision"}
          </Button>
        </div>
        {state.message && (
          <p role="status" className="text-muted-foreground text-xs">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
