"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlarmClock, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskFocusMode } from "@/components/tasks/task-focus-mode";
import { taskMenuItemClass } from "@/components/tasks/task-menu";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { ScheduledTaskSlot } from "@/lib/tasks/task-time";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  scheduled_time: string | null;
  estimated_minutes: number | null;
  energy_required: string;
  status: string;
};

type EditorMode = "edit" | "reminder" | null;

export function TaskActionsMenu({
  task,
  scheduledLabel,
  scheduledTasks = [],
}: {
  task: Task;
  scheduledLabel: string | null;
  scheduledTasks?: ScheduledTaskSlot[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOnPointerAway = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnPointerAway);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnPointerAway);
    };
  }, [menuOpen]);

  const openEditor = (mode: Exclude<EditorMode, null>) => {
    setMenuOpen(false);
    setEditorMode(mode);
  };

  const editorTitle = editorMode === "reminder" ? "Set reminder" : "Edit task";
  // Only the reminder needs a note: when the notification goes out.
  const editorDescription =
    editorMode === "reminder"
      ? "Choose the date and exact time. Devices you subscribed get a notification when reminders are on."
      : null;

  const moveMenuFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ),
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (currentIndex - 1 + items.length) % items.length
            : (currentIndex + 1) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <Dialog.Root
      open={editorMode !== null}
      onOpenChange={(open) => {
        if (!open) setEditorMode(null);
      }}
    >
      <div ref={menuRef} className="relative shrink-0">
        <Button
          ref={menuButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          title="Task actions"
          aria-label={`Open actions for ${task.title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>

        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${task.title}`}
          hidden={!menuOpen}
          onKeyDown={moveMenuFocus}
          className="bg-card text-card-foreground absolute top-full right-0 z-30 mt-1 w-52 rounded-xl border p-1 shadow-lg"
        >
          {task.status !== "completed" && task.status !== "cancelled" && (
            <TaskFocusMode
              taskId={task.id}
              title={task.title}
              description={task.description}
              estimatedMinutes={task.estimated_minutes}
              scheduledLabel={scheduledLabel}
              triggerPresentation="menu"
              onTrigger={() => setMenuOpen(false)}
              onCloseAutoFocus={() => menuButtonRef.current?.focus()}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            role="menuitem"
            onClick={() => openEditor("reminder")}
            className={taskMenuItemClass}
          >
            <AlarmClock
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
            Set reminder
          </Button>
          <Button
            type="button"
            variant="ghost"
            role="menuitem"
            onClick={() => openEditor("edit")}
            className={taskMenuItemClass}
          >
            <Pencil
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
            Edit task
          </Button>
          <div role="separator" className="bg-border mx-1 my-1 h-px" />
          <OfflineMutationForm
            mutation="task.delete"
            onResult={(result) => {
              if (result.success) setMenuOpen(false);
            }}
          >
            <input type="hidden" name="taskId" value={task.id} />
            <FormSubmitButton
              variant="ghost"
              role="menuitem"
              pendingLabel="Deleting…"
              className={cn(
                taskMenuItemClass,
                "text-destructive hover:text-destructive",
              )}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete task
            </FormSubmitButton>
          </OfflineMutationForm>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          ref={editorContentRef}
          {...(editorDescription ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const fieldName =
              editorMode === "reminder" ? "scheduledFor" : "title";
            editorContentRef.current
              ?.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)
              ?.focus();
          }}
          className="border-border bg-background text-foreground fixed right-0 bottom-0 left-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-h-[80dvh] sm:w-[min(90vw,640px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.025em]">
                {editorTitle}
              </Dialog.Title>
              {editorDescription ? (
                <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                  {editorDescription}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Close ${editorTitle.toLowerCase()}`}
                className="-mt-2 -mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          {editorMode && (
            <TaskEditForm
              task={task}
              scheduledTasks={scheduledTasks}
              onCancel={() => setEditorMode(null)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
