import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="border-border mt-5 border-t pt-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        Milestones
      </p>
      <div className="mt-2 space-y-2">
        {milestones.map((milestone) => (
          <OfflineMutationForm
            key={milestone.id}
            mutation="milestone.toggle"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="milestoneId" value={milestone.id} />
            <input
              type="hidden"
              name="completed"
              value={milestone.completed_at ? "false" : "true"}
            />
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
      <OfflineMutationForm
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
    </div>
  );
}
