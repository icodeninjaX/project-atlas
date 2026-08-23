"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlarmClock, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskFocusMode } from "@/components/tasks/task-focus-mode";
import { Button } from "@/components/ui/button";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  scheduled_time: string | null;
  estimated_minutes: number | null;
  status: string;
};

type EditorMode = "edit" | "reminder" | null;

export function TaskActionsMenu({
  task,
  scheduledLabel,
}: {
  task: Task;
  scheduledLabel: string | null;
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
  const editorDescription =
    editorMode === "reminder"
      ? "Choose the date and exact time for this task."
      : "Update the task details, schedule, priority, or focus time.";

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
      <div ref={menuRef} className="relative shrink-0 sm:hidden">
        <Button
          ref={menuButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Open actions for ${task.title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
          className="-mt-2 -mr-2 size-10 sm:size-10"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>

        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${task.title}`}
          hidden={!menuOpen}
          onKeyDown={moveMenuFocus}
          className="absolute top-9 right-0 z-30 w-52 rounded-2xl border border-slate-300 bg-white p-1.5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)] dark:ring-white/10"
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
            className="w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <AlarmClock className="size-4" aria-hidden="true" />
            Set reminder
          </Button>
          <Button
            type="button"
            variant="ghost"
            role="menuitem"
            onClick={() => openEditor("edit")}
            className="w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit task
          </Button>
          <div className="border-border my-1 border-t" />
          <OfflineMutationForm mutation="task.delete">
            <input type="hidden" name="taskId" value={task.id} />
            <Button
              type="submit"
              variant="ghost"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete task
            </Button>
          </OfflineMutationForm>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm sm:hidden" />
        <Dialog.Content
          ref={editorContentRef}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const fieldName =
              editorMode === "reminder" ? "scheduledFor" : "title";
            editorContentRef.current
              ?.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)
              ?.focus();
          }}
          className="border-border bg-card text-card-foreground fixed right-0 bottom-0 left-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:hidden"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                {editorTitle}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-xs leading-5">
                {editorDescription}
              </Dialog.Description>
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
          {editorMode && <TaskEditForm task={task} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
