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
      className="border-border mt-5 border-t pt-4"
      aria-label="Related items"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Related</h3>
        <Link
          href={`/goals/${goalId}`}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:underline focus-visible:ring-2 sm:min-h-9"
        >
          View relationships{" "}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          No related items yet. Connect a record to see it here.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {summaryTypes
            .filter((type) => counts[type])
            .map((type) => (
              <span
                key={type}
                className="border-border bg-muted/40 rounded-full border px-2.5 py-1 text-xs"
              >
                {graphRegistry[type].label} · {counts[type]}
              </span>
            ))}
        </div>
      )}
    </section>
  );
}
