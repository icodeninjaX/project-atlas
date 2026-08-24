"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { Button } from "@/components/ui/button";

export function GoalCreatePanel({
  heading,
  description,
}: {
  heading: ReactNode;
  description: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeForm = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {heading}
        {!isOpen ? (
          <Button
            type="button"
            className="shrink-0"
            aria-expanded="false"
            aria-controls="goal-create-form"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="size-4" />
            Create goal
          </Button>
        ) : null}
      </div>
      {description}
      {isOpen ? (
        <div className="mt-8">
          <GoalForm autoFocus onCancel={closeForm} onCreated={closeForm} />
        </div>
      ) : null}
    </>
  );
}
