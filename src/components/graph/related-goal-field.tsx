"use client";

import { useEffect, useId, useState } from "react";
import { listGoalOptionsAction } from "@/lib/graph/actions";
import { cn } from "@/lib/utils";

/**
 * Optional goal picker for create forms. Submits `relatedGoalId`; the create
 * action links the new record to that goal. Hidden when there are no goals
 * or they cannot be loaded (for example, offline).
 */
export function RelatedGoalField({
  className,
  labelClassName,
  selectClassName,
}: {
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
}) {
  const id = useId();
  const [goals, setGoals] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    let active = true;
    listGoalOptionsAction()
      .then((options) => {
        if (active) setGoals(options);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (goals.length === 0) return null;
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-muted-foreground mb-1.5 block text-xs font-medium",
          labelClassName,
        )}
      >
        Related goal (optional)
      </label>
      <select
        id={id}
        name="relatedGoalId"
        defaultValue=""
        className={cn(
          "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm",
          selectClassName,
        )}
      >
        <option value="">No goal</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
    </div>
  );
}
