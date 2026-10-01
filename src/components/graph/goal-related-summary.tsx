import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { graphRegistry, type GraphEntityType } from "@/lib/graph/registry";

const summaryTypes: GraphEntityType[] = [
  "task",
  "goal_milestone",
  "knowledge_concept",
  "debt",
  "job_application",
  "weekly_review",
  "transaction",
];

export function GoalRelatedSummary({
  goalId,
  counts,
}: {
  goalId: string;
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return (
    <section
      className="border-border/70 mt-4 border-t pt-3"
      aria-label="Related items"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
          Related
        </h3>
        <Link
          href={`/goals/${goalId}`}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:underline focus-visible:ring-2 sm:min-h-9"
        >
          View relationships{" "}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-muted-foreground text-xs">
          No related items yet. Connect a record to see it here.
        </p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {summaryTypes
            .filter((type) => counts[type])
            .map((type) => (
              <span
                key={type}
                className="border-border/70 bg-muted/50 text-foreground/85 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              >
                {graphRegistry[type].label} · {counts[type]}
              </span>
            ))}
        </div>
      )}
    </section>
  );
}
