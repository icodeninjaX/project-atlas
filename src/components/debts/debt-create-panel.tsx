"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { DebtForm } from "@/components/debts/debt-form";
import { Button } from "@/components/ui/button";

export function DebtCreatePanel({
  heading,
  description,
  summary,
}: {
  heading: ReactNode;
  description: ReactNode;
  summary: ReactNode;
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
            aria-controls="debt-create-form"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="size-4" />
            Add debt
          </Button>
        ) : null}
      </div>
      {description}
      {summary}
      {isOpen ? (
        <div className="mt-4">
          <DebtForm autoFocus onCancel={closeForm} onCreated={closeForm} />
        </div>
      ) : null}
    </>
  );
}
