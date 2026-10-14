"use client";

import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const closeForm = useCallback(() => {
    returnFocus.current = true;
    setIsOpen(false);
  }, []);

  // The button is replaced by the form while it is open; once it is back,
  // hand focus to it so keyboard users are not dropped at the top of the page.
  useEffect(() => {
    if (isOpen || !returnFocus.current) return;
    returnFocus.current = false;
    openButtonRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          isOpen ? undefined : (
            <Button
              ref={openButtonRef}
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
          <GoalForm autoFocus onCancel={closeForm} onSaved={closeForm} />
        </div>
      ) : null}
    </>
  );
}
