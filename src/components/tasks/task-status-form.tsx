"use client";

import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { getTaskPriorityTone } from "@/lib/tasks/priority";
import { cn } from "@/lib/utils";

const successAnimationMs = 900;

function TaskCompletionSuccessMark() {
  return (
    <span aria-hidden="true" className="atlas-task-success-mark">
      <span className="atlas-task-success-logo" />
      <span className="atlas-task-success-check">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </span>
  );
}

/**
 * A round checkbox: the ring takes the task's priority color, a check
 * appears on hover or focus, and a finished task shows a filled circle that
 * turns into a reopen arrow on hover.
 */
function TaskCheckCircle({
  completed,
  priority,
}: {
  completed: boolean;
  priority?: string;
}) {
  if (completed) {
    return (
      <span
        aria-hidden="true"
        className="grid size-[1.375rem] place-items-center rounded-full bg-green-600 text-white shadow-[0_4px_10px_-4px_rgb(22_163_74/0.8)] transition-colors group-hover/check:bg-green-700"
      >
        <Check
          className="size-3.5 group-hover/check:hidden group-focus-visible/check:hidden"
          strokeWidth={3}
        />
        <RotateCcw
          className="hidden size-3 group-hover/check:block group-focus-visible/check:block"
          strokeWidth={2.75}
        />
      </span>
    );
  }

  const tone = getTaskPriorityTone(priority ?? "low");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-[1.375rem] place-items-center rounded-full ring-2 transition-colors ring-inset",
        tone.ring,
        tone.wash,
        tone.text,
      )}
    >
      <Check
        className="size-3 opacity-0 transition-opacity group-hover/check:opacity-100 group-focus-visible/check:opacity-100"
        strokeWidth={3.25}
      />
    </span>
  );
}

function TaskStatusButton({
  title,
  completed,
  completionSucceeded,
  priority,
  className,
}: {
  title: string;
  completed: boolean;
  completionSucceeded: boolean;
  priority?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const action = completed ? "Reopen" : "Complete";
  const pendingAction = completed ? "Reopening" : "Completing";
  const buttonLabel = completionSucceeded
    ? `Completed ${title}`
    : `${pending ? pendingAction : action} ${title}`;

  return (
    <Button
      variant="ghost"
      size="icon"
      type="submit"
      disabled={pending || completionSucceeded}
      aria-busy={pending}
      aria-label={buttonLabel}
      title={
        completionSucceeded
          ? "Task completed"
          : pending
            ? `${pendingAction} task…`
            : `${action} task`
      }
      className={cn(
        "group/check rounded-full hover:bg-transparent disabled:opacity-100",
        className,
      )}
    >
      {completionSucceeded ? (
        <TaskCompletionSuccessMark />
      ) : pending ? (
        <AtlasMark className="size-4 animate-spin [animation-duration:1.1s] motion-reduce:animate-none" />
      ) : (
        <TaskCheckCircle completed={completed} priority={priority} />
      )}
    </Button>
  );
}

export function TaskStatusForm({
  taskId,
  title,
  completed,
  priority,
  className,
  buttonClassName,
}: {
  taskId: string;
  title: string;
  completed: boolean;
  /** Colors the open circle's ring; finished tasks are always green. */
  priority?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const { submit } = useOfflineSync();
  const router = useRouter();
  const [completionSucceeded, setCompletionSucceeded] = useState(false);
  const successTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const action = useCallback(
    async (formData: FormData) => {
      const result = completed
        ? await submit("task.setStatus", formData)
        : await submit("task.setStatus", formData, { refresh: false });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      if (completed) return;

      setCompletionSucceeded(true);
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setCompletionSucceeded(false);
        successTimerRef.current = null;
        if (!result.queued) router.refresh();
      }, successAnimationMs);
    },
    [completed, router, submit],
  );

  return (
    <form action={action} className={className}>
      <input type="hidden" name="taskId" value={taskId} />
      <input
        type="hidden"
        name="status"
        value={completed ? "inbox" : "completed"}
      />
      <TaskStatusButton
        title={title}
        completed={completed}
        completionSucceeded={completionSucceeded}
        priority={priority}
        className={buttonClassName}
      />
    </form>
  );
}
