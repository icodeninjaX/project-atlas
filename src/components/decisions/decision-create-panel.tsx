"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { DecisionForm } from "@/components/decisions/decision-form";
import { Button } from "@/components/ui/button";

export function DecisionCreatePanel({
  goals,
  today,
  startOpen = false,
  children,
}: {
  goals: { id: string; title: string }[];
  today: string;
  startOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const closeForm = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {isOpen ? (
        <section className="mt-6" aria-labelledby="record-decision">
          <h2 id="record-decision" className="mb-3 text-lg font-semibold">
            Record a decision
          </h2>
          <div id="decision-create-form">
            <DecisionForm
              goals={goals}
              today={today}
              autoFocus={!startOpen}
              onCancel={startOpen ? undefined : closeForm}
              onSaved={closeForm}
            />
          </div>
        </section>
      ) : null}
      <section
        className={isOpen ? "mt-9" : "mt-6"}
        aria-labelledby="past-decisions"
      >
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
          <h2 id="past-decisions" className="text-lg font-semibold">
            Your decisions
          </h2>
          {!isOpen ? (
            <Button
              type="button"
              aria-expanded="false"
              aria-controls="decision-create-form"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="size-4" />
              Record a decision
            </Button>
          ) : null}
        </div>
        {children}
      </section>
    </>
  );
}
