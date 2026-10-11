import Link from "next/link";
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
        <h3 className="text-muted-foreground text-xs font-semibold">Related</h3>
        <Link
          href={`/goals/${goalId}`}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold hover:underline focus-visible:ring-2 sm:min-h-9"
        >
          View relationships
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-muted-foreground text-xs">
          No related items yet. Connect a record to see it here.
        </p>
      ) : (
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {summaryTypes
            .filter((type) => counts[type])
            .map((type) => (
              <li key={type} className="tabular-nums">
                {graphRegistry[type].label} · {counts[type]}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
