"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { GoalForm } from "@/components/goals/goal-form";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  status: string;
  target_date: string | null;
  success_definition: string | null;
};

const goalAreaBadgeStyles: Record<string, string> = {
  finance:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  career:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  health:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  relationship:
    "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-800 dark:bg-pink-950/60 dark:text-pink-300",
  family:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  business:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  learning:
    "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  personal:
    "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
};

const fallbackGoalAreaBadgeStyle =
  "border-border bg-muted text-muted-foreground";

function GoalAreaBadge({ area }: { area: string }) {
  const areaLabel = area.charAt(0).toUpperCase() + area.slice(1);

  return (
    <span
      aria-label={`Goal category: ${areaLabel}`}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${goalAreaBadgeStyles[area] ?? fallbackGoalAreaBadgeStyle}`}
    >
      {areaLabel}
    </span>
  );
}

function DeleteGoalButton({ title }: { title: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? `Deleting ${title}` : `Delete ${title}`}
    >
      {pending ? (
        <AtlasMark className="size-4 animate-spin [animation-duration:1.1s] motion-reduce:animate-none" />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
      {pending ? "Deleting…" : "Delete goal"}
    </Button>
  );
}

export function GoalCardHeader({ goal }: { goal: Goal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const editorId = `edit-goal-${goal.id}`;

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
    <Dialog.Root open={deleteOpen} onOpenChange={(open) => setDeleteOpen(open)}>
      <div className="flex items-center justify-between gap-3">
        <GoalAreaBadge area={goal.area} />
        <div ref={menuRef} className="relative shrink-0">
          <TooltipHint label="Goal actions" side="left">
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-1 size-8 min-h-8 rounded-lg sm:size-8"
              aria-label={`Open actions for goal ${goal.title}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </Button>
          </TooltipHint>
          <div
            id={menuId}
            role="menu"
            aria-label={`Actions for goal ${goal.title}`}
            hidden={!menuOpen}
            onKeyDown={moveMenuFocus}
            className="absolute top-9 right-0 z-30 w-48 rounded-2xl border border-slate-300 bg-white p-1.5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)] dark:ring-white/10"
          >
            <Button
              type="button"
              variant="ghost"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setEditorOpen((open) => !open);
              }}
              className="w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <Pencil className="size-4" aria-hidden="true" />
              {editorOpen ? "Close editor" : "Edit goal"}
            </Button>
            <div className="border-border my-1 border-t" />
            <Button
              type="button"
              variant="ghost"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete goal
            </Button>
          </div>
        </div>
      </div>
      <h2 className="mt-3 text-base font-semibold">{goal.title}</h2>
      {goal.success_definition ? (
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          {goal.success_definition}
        </p>
      ) : null}
      {editorOpen ? (
        <div id={editorId} className="mt-4">
          <GoalForm goal={goal} />
        </div>
      ) : null}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuButtonRef.current?.focus();
          }}
          className="border-border bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                Delete goal?
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-xs leading-5">
                Delete “{goal.title}”? Its milestones will also be deleted.
                Related tasks will stay but will no longer be linked. This
                cannot be undone.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close delete goal confirmation"
                className="-mt-2 -mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <OfflineMutationForm
            mutation="goal.delete"
            onResult={(result) => {
              if (result.success) setDeleteOpen(false);
            }}
            className="mt-5 flex justify-end gap-2"
          >
            <input type="hidden" name="goalId" value={goal.id} />
            <Dialog.Close asChild>
              <Button type="button" size="sm" variant="ghost">
                Keep goal
              </Button>
            </Dialog.Close>
            <DeleteGoalButton title={goal.title} />
          </OfflineMutationForm>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
