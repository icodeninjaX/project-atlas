"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddGraphRelationshipDialog } from "@/components/graph/add-relationship-dialog";
import { Button } from "@/components/ui/button";
import { removeGraphRelationshipAction } from "@/lib/graph/actions";
import {
  graphRegistry,
  graphRelationshipLabel,
  type GraphEntityType,
} from "@/lib/graph/registry";
import { groupRelatedItems, type RelatedEntity } from "@/lib/graph/model";
import { setTaskGoalRelationshipAction } from "@/lib/tasks/actions";

const order: GraphEntityType[] = [
  "goal",
  "task",
  "goal_milestone",
  "knowledge_concept",
  "debt",
  "job_application",
  "weekly_review",
  "transaction",
  "decision",
  "decision_observation",
];

export function GoalRelatedDetails({
  goalId,
  items,
  milestoneId,
}: {
  goalId: string;
  items: RelatedEntity[];
  milestoneId?: string;
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const groups = groupRelatedItems(items);

  async function remove(item: RelatedEntity) {
    setPendingId(item.id);
    const result =
      item.kind === "task_goal" && item.origin === "native"
        ? await setTaskGoalRelationshipAction(item.related.id, goalId, "unlink")
        : await removeGraphRelationshipAction(item.id);
    setMessage(result.message);
    setPendingId(null);
    setConfirmId(null);
    if (result.success) router.refresh();
  }

  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Related items</h2>
        <AddGraphRelationshipDialog
          anchorType={milestoneId ? "goal_milestone" : "goal"}
          anchorId={milestoneId ?? goalId}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-muted-foreground text-sm"
      >
        {message}
      </p>
      {items.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border border-dashed p-6 text-sm">
          <p className="font-semibold">Nothing connected yet.</p>
          <p className="text-muted-foreground mt-1">
            {milestoneId
              ? "This milestone belongs to its goal. Link a knowledge concept to show what helps complete it."
              : "Tasks and milestones appear automatically when assigned to this goal. Add a relationship to connect knowledge, debts, career, reviews, or transactions."}
          </p>
        </div>
      ) : null}
      {order.map((type) => {
        const group = groups[type] ?? [];
        if (group.length === 0) return null;
        return (
          <section
            key={type}
            aria-labelledby={`graph-${type}`}
            className="min-w-0"
          >
            <h3 id={`graph-${type}`} className="mb-2 text-sm font-semibold">
              {graphRegistry[type].label} · {group.length}
            </h3>
            <div className="border-border bg-card divide-border min-w-0 divide-y overflow-hidden rounded-2xl border">
              {group.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={item.related.href as never}
                      className="text-primary focus-visible:ring-ring text-sm font-semibold break-words hover:underline focus-visible:ring-2"
                    >
                      {item.related.title}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {graphRegistry[type].label} ·{" "}
                      {graphRelationshipLabel(item.kind)} ·{" "}
                      {item.origin === "native"
                        ? "From record"
                        : "Added manually"}
                      {item.related.subtitle
                        ? ` · ${item.related.subtitle}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {type === "goal_milestone" && !milestoneId ? (
                      <Link
                        href={`/goals/${goalId}/milestones/${item.related.id}`}
                        className="text-primary inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold hover:underline"
                      >
                        View related knowledge
                      </Link>
                    ) : null}
                    {item.removable ||
                    (item.kind === "task_goal" && item.origin === "native") ? (
                      confirmId === item.id ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pendingId === item.id}
                            onClick={() => void remove(item)}
                          >
                            {pendingId === item.id
                              ? "Removing…"
                              : item.kind === "task_goal"
                                ? "Confirm unlink"
                                : "Confirm removal"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmId(item.id)}
                        >
                          {item.kind === "task_goal"
                            ? "Unlink from goal"
                            : "Remove relationship"}
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
