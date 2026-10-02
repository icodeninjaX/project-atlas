"use client";

import { PencilLine, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { DecisionForm } from "@/components/decisions/decision-form";
import { MoneySheet } from "@/components/money/money-sheet";
import { Button } from "@/components/ui/button";
import type { Decision } from "@/lib/decisions/decision";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import { cn } from "@/lib/utils";

type Goal = { id: string; title: string };

/**
 * Records a decision, or with `decision` edits it, in a bottom sheet on
 * phones and a side panel from `sm` up. The form closes the sheet once it
 * saves.
 */
function DecisionSheet({
  open,
  onOpenChange,
  decision,
  goals,
  today,
  actionTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision?: Decision;
  goals: Goal[];
  /** YYYY-MM-DD in Manila. */
  today: string;
  actionTask?: GraphEntitySummary | null;
}) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <MoneySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Decision journal"
      title={decision ? "Edit decision" : "Record a decision"}
      description={
        decision
          ? "Edits keep the earlier plan on this page, so later results are read against what you planned at the time."
          : "In your own words, while the reasons are fresh. You will come back to it on the review date."
      }
      closeLabel={
        decision ? "Close decision editor" : "Close new decision form"
      }
    >
      {open ? (
        <DecisionForm
          decision={decision}
          goals={goals}
          today={today}
          actionTask={actionTask}
          autoFocus={!decision}
          onCancel={close}
          onSaved={close}
        />
      ) : null}
    </MoneySheet>
  );
}

/** The journal's one add button, opening the form in a sheet. */
export function DecisionCreateButton({
  goals,
  today,
  label = "Record a decision",
  className,
}: {
  goals: Goal[];
  today: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn("rounded-full px-5", className)}
      >
        <Plus aria-hidden="true" className="size-4" />
        {label}
      </Button>
      <DecisionSheet
        open={open}
        onOpenChange={setOpen}
        goals={goals}
        today={today}
      />
    </>
  );
}

/** Opens the decision's plan for editing in a sheet. */
export function DecisionEditButton({
  decision,
  goals,
  today,
  actionTask,
}: {
  decision: Decision;
  goals: Goal[];
  today: string;
  actionTask: GraphEntitySummary | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full max-sm:size-11 max-sm:px-0"
      >
        <PencilLine aria-hidden="true" className="size-4" />
        <span className="max-sm:sr-only">Edit decision</span>
      </Button>
      <DecisionSheet
        open={open}
        onOpenChange={setOpen}
        decision={decision}
        goals={goals}
        today={today}
        actionTask={actionTask}
      />
    </>
  );
}
