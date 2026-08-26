"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  ChevronDown,
  Circle,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { MilestoneRichTextEditor } from "@/components/goals/milestone-rich-text-editor";
import { MilestoneRichTextReader } from "@/components/goals/milestone-rich-text-reader";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";

type Milestone = {
  id: string;
  title: string;
  description?: unknown;
  target_date: string | null;
  completed_at: string | null;
};

type MilestoneActionMode = "edit" | "remove";
type MilestoneDialogMode = "view" | MilestoneActionMode;
type MilestoneDialogState = {
  mode: MilestoneDialogMode;
  milestone: Milestone;
} | null;

const milestoneDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatMilestoneDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+08:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : milestoneDate.format(date);
}

const actionMenuClassName =
  "absolute top-10 right-0 z-30 w-52 rounded-2xl border border-slate-300 bg-white p-1.5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)] dark:ring-white/10";

function PendingAtlasMark() {
  return (
    <AtlasMark className="size-4 animate-spin [animation-duration:1.1s] motion-reduce:animate-none" />
  );
}

function useActionMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  return {
    menuOpen,
    setMenuOpen,
    menuId,
    menuRef,
    menuButtonRef,
    moveMenuFocus,
  };
}

function MilestoneMutationButton({
  idleLabel,
  pendingLabel,
  idleText,
  pendingText,
  icon,
  variant = "secondary",
}: {
  idleLabel: string;
  pendingLabel: string;
  idleText: string;
  pendingText: string;
  icon?: React.ReactNode;
  variant?: "secondary" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? pendingLabel : idleLabel}
    >
      {pending ? <PendingAtlasMark /> : icon}
      {pending ? pendingText : idleText}
    </Button>
  );
}

function MilestoneToggleButton({ milestone }: { milestone: Milestone }) {
  const { pending } = useFormStatus();
  const completed = Boolean(milestone.completed_at);
  const action = completed ? "Reopen" : "Complete";
  const pendingAction = completed ? "Reopening" : "Completing";

  return (
    <TooltipHint
      label={pending ? `${pendingAction} milestone…` : `${action} milestone`}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-busy={pending}
        aria-label={`${pending ? pendingAction : action} milestone ${milestone.title}`}
      >
        {pending ? (
          <PendingAtlasMark />
        ) : completed ? (
          <Check className="text-primary size-4" />
        ) : (
          <Circle className="size-4" />
        )}
      </Button>
    </TooltipHint>
  );
}

function MilestoneSectionMenu({
  addMilestoneOpen,
  actionMode,
  hasMilestones,
  onToggleAdd,
  onChangeMode,
}: {
  addMilestoneOpen: boolean;
  actionMode: MilestoneActionMode | null;
  hasMilestones: boolean;
  onToggleAdd: () => void;
  onChangeMode: (mode: MilestoneActionMode | null) => void;
}) {
  const {
    menuOpen,
    setMenuOpen,
    menuId,
    menuRef,
    menuButtonRef,
    moveMenuFocus,
  } = useActionMenu();

  const chooseMode = (mode: MilestoneActionMode) => {
    setMenuOpen(false);
    onChangeMode(actionMode === mode ? null : mode);
  };

  return (
    <div ref={menuRef} className="relative shrink-0">
      <TooltipHint label="Milestone actions">
        <Button
          ref={menuButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          title="Milestone actions"
          aria-label="Open milestone actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </TooltipHint>
      <div
        id={menuId}
        role="menu"
        aria-label="Milestone actions"
        hidden={!menuOpen}
        onKeyDown={moveMenuFocus}
        className={actionMenuClassName}
      >
        <Button
          type="button"
          variant="ghost"
          role="menuitem"
          onClick={() => {
            setMenuOpen(false);
            onToggleAdd();
          }}
          className="w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          {addMilestoneOpen ? "Cancel adding milestone" : "Add milestone"}
        </Button>
        <div className="border-border my-1 border-t" />
        <Button
          type="button"
          variant="ghost"
          role="menuitem"
          disabled={!hasMilestones}
          onClick={() => chooseMode("edit")}
          className="w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Pencil className="size-4" aria-hidden="true" />
          {actionMode === "edit" ? "Finish editing" : "Edit milestones"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          role="menuitem"
          disabled={!hasMilestones}
          onClick={() => chooseMode("remove")}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {actionMode === "remove" ? "Finish removing" : "Remove milestones"}
        </Button>
      </div>
    </div>
  );
}

function MilestoneActionDialog({
  state,
  returnFocusRef,
  onClose,
  onEdit,
}: {
  state: MilestoneDialogState;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const descriptionHelpId = useId();

  useEffect(() => {
    if (state?.mode !== "edit") return;
    dialogContentRef.current
      ?.querySelector<HTMLInputElement>('[name="title"]')
      ?.focus();
  }, [state?.milestone.id, state?.mode]);

  if (!state) return null;

  const { milestone, mode } = state;
  const editing = mode === "edit";
  const reading = mode === "view";
  const dialogTitle = reading
    ? milestone.title
    : editing
      ? "Milestone details"
      : "Remove milestone?";

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          ref={dialogContentRef}
          onOpenAutoFocus={(event) => {
            if (!editing) return;
            event.preventDefault();
            dialogContentRef.current
              ?.querySelector<HTMLInputElement>('[name="title"]')
              ?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocusRef.current?.isConnected) {
              returnFocusRef.current.focus();
            }
          }}
          className="border-border bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border shadow-2xl outline-none"
        >
          {reading ? (
            <>
              <header className="border-border bg-card/95 sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-5 py-4 backdrop-blur-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
                    Milestone
                  </p>
                  <Dialog.Title className="text-foreground text-lg leading-tight font-semibold tracking-tight">
                    {milestone.title}
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Read milestone details and learning notes.
                  </Dialog.Description>
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {milestone.completed_at ? (
                        <Check
                          className="text-primary size-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle className="size-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {milestone.completed_at
                          ? `Completed ${formatMilestoneDate(milestone.completed_at)}`
                          : "In progress"}
                      </span>
                    </div>
                    {milestone.target_date ? (
                      <span>
                        Target: {formatMilestoneDate(milestone.target_date)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Edit milestone"
                    aria-label="Edit milestone"
                    onClick={onEdit}
                    className="shrink-0"
                  >
                    <Pencil className="size-4.5" aria-hidden="true" />
                  </Button>
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Close milestone details"
                      className="shrink-0"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </Button>
                  </Dialog.Close>
                </div>
              </header>
              <article className="px-5 pt-6 pb-8 sm:px-6 sm:pt-7 sm:pb-10">
                <MilestoneRichTextReader
                  content={milestone.description}
                  emptyFallback={
                    <div className="border-border/80 bg-muted/20 rounded-xl border border-dashed px-5 py-8 text-center">
                      <p className="text-foreground text-sm font-medium">
                        No notes yet.
                      </p>
                      <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-xs leading-5">
                        Use Edit when you are ready to capture context, lessons,
                        or anything worth remembering.
                      </p>
                    </div>
                  }
                />
              </article>
            </>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-base font-semibold">
                    {dialogTitle}
                  </Dialog.Title>
                  <Dialog.Description className="text-muted-foreground mt-1 text-xs leading-5">
                    {editing
                      ? "Keep what this means, what you learn, and anything you want to remember here."
                      : `Remove “${milestone.title}”? Goal progress will be recalculated and this cannot be undone.`}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Close ${dialogTitle.toLowerCase()}`}
                    className="-mt-2 -mr-2 shrink-0"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>

              {editing ? (
                <OfflineMutationForm
                  mutation="milestone.update"
                  onResult={(result) => {
                    if (result.success) onClose();
                  }}
                  className="mt-5 space-y-4"
                >
                  <input
                    type="hidden"
                    name="milestoneId"
                    value={milestone.id}
                  />
                  <label className="block text-xs font-medium">
                    Title
                    <input
                      name="title"
                      required
                      maxLength={160}
                      defaultValue={milestone.title}
                      className="border-border bg-background mt-1 min-h-10 w-full rounded-lg border px-3 text-sm"
                    />
                  </label>
                  <div>
                    <label
                      htmlFor={descriptionId}
                      className="block text-xs font-medium"
                    >
                      Description or learning notes
                    </label>
                    <MilestoneRichTextEditor
                      id={descriptionId}
                      initialContent={milestone.description}
                      describedBy={descriptionHelpId}
                    />
                    <p
                      id={descriptionHelpId}
                      className="text-muted-foreground mt-1 text-[10px] font-normal"
                    >
                      You can come back and add to these notes before completing
                      the milestone.
                    </p>
                  </div>
                  <label className="block text-xs font-medium">
                    Target date
                    <input
                      name="targetDate"
                      type="date"
                      defaultValue={milestone.target_date ?? ""}
                      className="border-border bg-background mt-1 min-h-10 w-full rounded-lg border px-3 text-sm"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Dialog.Close asChild>
                      <Button type="button" size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <MilestoneMutationButton
                      idleLabel={`Save changes to ${milestone.title}`}
                      pendingLabel={`Saving changes to ${milestone.title}`}
                      idleText="Save changes"
                      pendingText="Saving…"
                      icon={<Pencil className="size-4" aria-hidden="true" />}
                    />
                  </div>
                </OfflineMutationForm>
              ) : (
                <OfflineMutationForm
                  mutation="milestone.delete"
                  onResult={(result) => {
                    if (result.success) onClose();
                  }}
                  className="mt-5 flex justify-end gap-2"
                >
                  <input
                    type="hidden"
                    name="milestoneId"
                    value={milestone.id}
                  />
                  <Dialog.Close asChild>
                    <Button type="button" size="sm" variant="ghost">
                      Keep milestone
                    </Button>
                  </Dialog.Close>
                  <MilestoneMutationButton
                    idleLabel={`Remove ${milestone.title}`}
                    pendingLabel={`Removing ${milestone.title}`}
                    idleText="Remove milestone"
                    pendingText="Removing…"
                    variant="destructive"
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                  />
                </OfflineMutationForm>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MilestoneList({
  goalId,
  milestones,
}: {
  goalId: string;
  milestones: Milestone[];
}) {
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [actionMode, setActionMode] = useState<MilestoneActionMode | null>(
    null,
  );
  const [dialogState, setDialogState] = useState<MilestoneDialogState>(null);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const milestonesId = `milestones-${goalId}`;
  const addMilestoneId = `add-milestone-${goalId}`;

  const changeActionMode = (mode: MilestoneActionMode | null) => {
    setActionMode(mode);
    setAddMilestoneOpen(false);
    if (mode) setMilestonesOpen(true);
  };

  return (
    <div className="border-border mt-5 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Milestones
          </p>
          <span
            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px]"
            aria-label={`${milestones.length} ${milestones.length === 1 ? "milestone" : "milestones"}`}
          >
            {milestones.length}
          </span>
          {actionMode && (
            <span
              aria-live="polite"
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionMode === "remove" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {actionMode === "edit" ? "Editing" : "Removing"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={milestonesOpen}
            aria-controls={milestonesId}
            onClick={() => setMilestonesOpen((open) => !open)}
          >
            {milestonesOpen ? "Hide" : "View"}
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 transition-transform ${milestonesOpen ? "rotate-180" : ""}`}
            />
          </Button>
          <MilestoneSectionMenu
            addMilestoneOpen={addMilestoneOpen}
            actionMode={actionMode}
            hasMilestones={milestones.length > 0}
            onToggleAdd={() => {
              setActionMode(null);
              setAddMilestoneOpen((open) => !open);
            }}
            onChangeMode={changeActionMode}
          />
        </div>
      </div>
      {milestonesOpen && (
        <div id={milestonesId} className="mt-3">
          {milestones.length ? (
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start gap-2">
                  <OfflineMutationForm mutation="milestone.toggle">
                    <input
                      type="hidden"
                      name="milestoneId"
                      value={milestone.id}
                    />
                    <input
                      type="hidden"
                      name="completed"
                      value={milestone.completed_at ? "false" : "true"}
                    />
                    <MilestoneToggleButton milestone={milestone} />
                  </OfflineMutationForm>
                  <div className="min-w-0 flex-1 px-1 py-1">
                    <button
                      type="button"
                      aria-label={`Open milestone ${milestone.title}`}
                      onClick={(event) => {
                        actionButtonRef.current = event.currentTarget;
                        setDialogState({ mode: "view", milestone });
                      }}
                      className={`hover:text-foreground focus-visible:ring-ring block max-w-full text-left text-xs outline-none hover:underline focus-visible:ring-2 ${milestone.completed_at ? "text-muted-foreground line-through" : ""}`}
                    >
                      {milestone.title}
                    </button>
                  </div>
                  {actionMode === "edit" && (
                    <TooltipHint label={`Edit ${milestone.title}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit milestone ${milestone.title}`}
                        onClick={(event) => {
                          actionButtonRef.current = event.currentTarget;
                          setDialogState({ mode: "edit", milestone });
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    </TooltipHint>
                  )}
                  {actionMode === "remove" && (
                    <TooltipHint label={`Remove ${milestone.title}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove milestone ${milestone.title}`}
                        onClick={(event) => {
                          actionButtonRef.current = event.currentTarget;
                          setDialogState({ mode: "remove", milestone });
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </TooltipHint>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-xs">
              No milestones yet.
            </p>
          )}
        </div>
      )}
      {addMilestoneOpen && (
        <OfflineMutationForm
          id={addMilestoneId}
          mutation="milestone.create"
          onResult={(result) => {
            if (result.success) setAddMilestoneOpen(false);
          }}
          className="border-border bg-muted/20 mt-3 space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="goalId" value={goalId} />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              name="title"
              required
              maxLength={160}
              placeholder="Add a milestone"
              aria-label="New milestone"
              className="border-border bg-background min-h-10 min-w-0 rounded-lg border px-3 text-xs"
            />
            <input
              name="targetDate"
              type="date"
              aria-label="Milestone target date"
              className="border-border bg-background min-h-10 rounded-lg border px-3 text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={`add-milestone-description-${goalId}`}
              className="block text-xs font-medium"
            >
              Description or learning notes
            </label>
            <MilestoneRichTextEditor
              id={`add-milestone-description-${goalId}`}
              describedBy={`add-milestone-description-help-${goalId}`}
            />
            <p
              id={`add-milestone-description-help-${goalId}`}
              className="text-muted-foreground mt-1 text-[10px]"
            >
              Add context now or keep building these notes as you make progress.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAddMilestoneOpen(false)}
            >
              Cancel
            </Button>
            <MilestoneMutationButton
              idleLabel="Add milestone"
              pendingLabel="Adding milestone"
              idleText="Add"
              pendingText="Adding…"
            />
          </div>
        </OfflineMutationForm>
      )}
      <MilestoneActionDialog
        state={dialogState}
        returnFocusRef={actionButtonRef}
        onClose={() => setDialogState(null)}
        onEdit={() =>
          setDialogState((current) =>
            current ? { ...current, mode: "edit" } : null,
          )
        }
      />
    </div>
  );
}
