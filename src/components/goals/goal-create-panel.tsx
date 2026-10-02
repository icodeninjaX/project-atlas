"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { Button } from "@/components/ui/button";

export function GoalCreatePanel({
  eyebrow,
  heading,
  description,
  summary,
}: {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description: ReactNode;
  summary?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeForm = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <section className="border-border bg-card relative isolate overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="bg-primary/15 pointer-events-none absolute -top-28 -right-20 -z-10 size-80 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-1/4 -z-10 size-80 rounded-full bg-cyan-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] [background-size:18px_18px]"
        />
        {eyebrow}
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
        {summary}
      </section>
      {isOpen ? (
        <div className="mt-5 sm:mt-6">
          <GoalForm autoFocus onCancel={closeForm} onCreated={closeForm} />
        </div>
      ) : null}
    </>
  );
}
