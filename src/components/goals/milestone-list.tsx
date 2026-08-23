"use client";

import { Check, ChevronDown, Circle, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";

type Milestone = {
  id: string;
  title: string;
  target_date: string | null;
  completed_at: string | null;
};

export function MilestoneList({
  goalId,
  milestones,
}: {
  goalId: string;
  milestones: Milestone[];
}) {
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const milestonesId = `milestones-${goalId}`;
  const addMilestoneId = `add-milestone-${goalId}`;

  return (
    <div className="border-border mt-5 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Milestones
          </p>
          <span
            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px]"
            aria-label={`${milestones.length} ${milestones.length === 1 ? "milestone" : "milestones"}`}
          >
            {milestones.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={milestonesOpen}
            aria-controls={milestonesId}
            onClick={() => setMilestonesOpen((open) => !open)}
          >
            {milestonesOpen ? "Hide" : "View"}
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 transition-transform ${milestonesOpen ? "rotate-180" : ""}`}
            />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={
              addMilestoneOpen ? "Cancel adding milestone" : "Add milestone"
            }
            aria-expanded={addMilestoneOpen}
            aria-controls={addMilestoneId}
            onClick={() => setAddMilestoneOpen((open) => !open)}
          >
            <Plus
              aria-hidden="true"
              className={`size-3.5 transition-transform ${addMilestoneOpen ? "rotate-45" : ""}`}
            />
            {addMilestoneOpen ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>
      {milestonesOpen && (
        <div id={milestonesId} className="mt-3">
          {milestones.length ? (
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <OfflineMutationForm
                  key={milestone.id}
                  mutation="milestone.toggle"
                  className="flex items-center gap-2"
                >
                  <input
                    type="hidden"
                    name="milestoneId"
                    value={milestone.id}
                  />
                  <input
                    type="hidden"
                    name="completed"
                    value={milestone.completed_at ? "false" : "true"}
                  />
                  <TooltipHint
                    label={
                      milestone.completed_at
                        ? "Reopen milestone"
                        : "Complete milestone"
                    }
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label={`${milestone.completed_at ? "Reopen" : "Complete"} milestone ${milestone.title}`}
                    >
                      {milestone.completed_at ? (
                        <Check className="text-primary size-4" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </Button>
                  </TooltipHint>
                  <span
                    className={`min-w-0 flex-1 text-xs ${milestone.completed_at ? "text-muted-foreground line-through" : ""}`}
                  >
                    {milestone.title}
                  </span>
                  {milestone.target_date && (
                    <time className="text-muted-foreground font-mono text-[10px]">
                      {milestone.target_date}
                    </time>
                  )}
                </OfflineMutationForm>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-xs">
              No milestones yet.
            </p>
          )}
        </div>
      )}
      {addMilestoneOpen && (
        <OfflineMutationForm
          id={addMilestoneId}
          mutation="milestone.create"
          className="mt-3 flex flex-wrap gap-2"
        >
          <input type="hidden" name="goalId" value={goalId} />
          <input
            name="title"
            required
            maxLength={160}
            placeholder="Add a milestone"
            aria-label="New milestone"
            className="border-border bg-background min-h-9 min-w-0 flex-1 rounded-lg border px-2 text-xs"
          />
          <input
            name="targetDate"
            type="date"
            aria-label="Milestone target date"
            className="border-border bg-background min-h-9 rounded-lg border px-2 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary">
            Add
          </Button>
        </OfflineMutationForm>
      )}
    </div>
  );
}
