"use client";

import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";

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

function TaskStatusButton({
  title,
  completed,
  completionSucceeded,
  className,
}: {
  title: string;
  completed: boolean;
  completionSucceeded: boolean;
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
      className={className}
    >
      {completionSucceeded ? (
        <TaskCompletionSuccessMark />
      ) : pending ? (
        <AtlasMark className="size-4 animate-spin [animation-duration:1.1s] motion-reduce:animate-none" />
      ) : completed ? (
        <RotateCcw className="size-4" />
      ) : (
        <Check className="size-4" />
      )}
    </Button>
  );
}

export function TaskStatusForm({
  taskId,
  title,
  completed,
  className,
  buttonClassName,
}: {
  taskId: string;
  title: string;
  completed: boolean;
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
        className={buttonClassName}
      />
    </form>
  );
}
