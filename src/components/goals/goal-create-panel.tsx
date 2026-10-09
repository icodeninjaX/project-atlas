"use client";

import { Goal, Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";

export function GoalCreatePanel({
  eyebrow,
  title,
  description,
  summary,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  summary?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeForm = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <PageHeading
        eyebrow={eyebrow}
        icon={Goal}
        title={title}
        description={description}
        actions={
          isOpen ? undefined : (
            <Button
              type="button"
              aria-expanded="false"
              aria-controls="goal-create-form"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="size-4" />
              Create goal
            </Button>
          )
        }
      />
      {summary}
      {isOpen ? (
        <div className="mt-5 sm:mt-6">
          <GoalForm autoFocus onCancel={closeForm} onCreated={closeForm} />
        </div>
      ) : null}
    </>
  );
}
