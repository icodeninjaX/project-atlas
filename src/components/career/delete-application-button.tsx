"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteApplicationAction } from "@/lib/career/actions";
import { cn } from "@/lib/utils";

type DeletableApplication = {
  id: string;
  company_name: string;
  role_title: string;
};

/**
 * Asks before deleting, then removes the application. The server action
 * revalidates the Career page, so the row leaves the list or board on its
 * own; `onDeleted` is for callers with more to tidy, like an open editor.
 */
export function useDeleteApplication(
  application: DeletableApplication,
  onDeleted?: () => void,
) {
  const [deleting, startDelete] = useTransition();
  const deleteApplication = () => {
    if (
      !window.confirm(
        `Delete ${application.company_name} – ${application.role_title}? Its stage history goes with it. This cannot be undone.`,
      )
    )
      return;
    startDelete(async () => {
      try {
        const result = await deleteApplicationAction(application.id);
        if (result.success) {
          toast.success(result.message);
          onDeleted?.();
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("The application could not be deleted.");
      }
    });
  };
  return { deleting, deleteApplication };
}

/** A round trash button, named for the company, for list rows and cards. */
export function DeleteApplicationButton({
  application,
  className,
}: {
  application: DeletableApplication;
  className?: string;
}) {
  const { deleting, deleteApplication } = useDeleteApplication(application);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      pending={deleting}
      onClick={deleteApplication}
      aria-label={`Delete ${application.company_name} application`}
      title="Delete application"
      className={cn(
        "text-muted-foreground shrink-0 rounded-full hover:bg-red-500/10 hover:text-red-700 sm:size-9 dark:hover:text-red-300",
        className,
      )}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );
}
