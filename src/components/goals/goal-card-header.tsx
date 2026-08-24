"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  status: string;
  target_date: string | null;
  success_definition: string | null;
};

export function GoalCardHeader({ goal }: { goal: Goal }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const editorId = `edit-goal-${goal.id}`;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="border-border text-muted-foreground rounded-full border px-2 py-1 text-[10px] capitalize">
          {goal.area}
        </span>
        <TooltipHint label="Edit goal" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`-mr-1 size-8 min-h-8 rounded-lg sm:size-8 ${editorOpen ? "bg-muted text-foreground" : ""}`}
            aria-label={`Edit ${goal.title}`}
            aria-expanded={editorOpen}
            aria-controls={editorId}
            onClick={() => setEditorOpen((open) => !open)}
          >
            <Pencil aria-hidden="true" className="size-3.5" />
          </Button>
        </TooltipHint>
      </div>
      <h2 className="mt-3 text-base font-semibold">{goal.title}</h2>
      {goal.success_definition ? (
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          {goal.success_definition}
        </p>
      ) : null}
      {editorOpen ? (
        <div id={editorId} className="mt-4">
          <GoalForm goal={goal} />
        </div>
      ) : null}
    </>
  );
}
