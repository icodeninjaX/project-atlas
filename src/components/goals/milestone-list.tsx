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
import { Input } from "@/components/ui/input";
import { TooltipHint } from "@/components/ui/tooltip";
import { formatCalendarDate } from "@/lib/dates/dates";

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

const actionMenuClassName =
  "bg-card text-card-foreground absolute top-10 right-0 z-30 w-52 rounded-xl border p-1 shadow-lg";

const menuItemClassName =
  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

const menuIconClassName = "text-muted-foreground size-4";

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
          <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : (
          <Circle
            className="text-muted-foreground/70 size-5"
            strokeWidth={1.75}
          />
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
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setMenuOpen(false);
            onToggleAdd();
          }}
          className={menuItemClassName}
        >
          <Plus className={menuIconClassName} aria-hidden="true" />
          {addMilestoneOpen ? "Cancel adding milestone" : "Add milestone"}
        </button>
        <div className="my-1 border-t" />
        <button
          type="button"
          role="menuitem"
          disabled={!hasMilestones}
          onClick={() => chooseMode("edit")}
          className={menuItemClassName}
        >
          <Pencil className={menuIconClassName} aria-hidden="true" />
          {actionMode === "edit" ? "Finish editing" : "Edit milestones"}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={!hasMilestones}
          onClick={() => chooseMode("remove")}
          className={`${menuItemClassName} text-destructive`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {actionMode === "remove" ? "Finish removing" : "Remove milestones"}
        </button>
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          ref={dialogContentRef}
          {...(editing ? { "aria-describedby": undefined } : {})}
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
          className="bg-background fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border shadow-2xl outline-none"
        >
          {reading ? (
            <>
              <header className="bg-background sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Milestone
                  </p>
                  <Dialog.Title className="text-foreground text-xl leading-tight font-semibold tracking-[-0.025em]">
                    {milestone.title}
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Read milestone details and learning notes.
                  </Dialog.Description>
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.6875rem]">
                    <div className="flex items-center gap-1.5">
                      {milestone.completed_at ? (
                        <Check
                          className="text-positive size-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle className="size-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {milestone.completed_at
                          ? `Completed ${formatCalendarDate(milestone.completed_at)}`
                          : "In progress"}
                      </span>
                    </div>
                    {milestone.target_date ? (
                      <span>
                        Target: {formatCalendarDate(milestone.target_date)}
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
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Close milestone details"
                      className="shrink-0"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </Dialog.Close>
                </div>
              </header>
              <article className="px-5 pt-6 pb-8 sm:px-6 sm:pt-7 sm:pb-10">
                <MilestoneRichTextReader
                  content={milestone.description}
                  emptyFallback={
                    <p className="text-muted-foreground text-sm leading-6">
                      <span className="text-foreground font-medium">
                        No notes yet.
                      </span>{" "}
                      Use Edit when you are ready to capture context, lessons,
                      or anything worth remembering.
                    </p>
                  }
                />
              </article>
            </>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title
                    className={
                      editing
                        ? "text-xl font-semibold tracking-[-0.025em]"
                        : "text-lg font-semibold"
                    }
                  >
                    {dialogTitle}
                  </Dialog.Title>
                  {editing ? null : (
                    <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                      Remove “{milestone.title}”? Goal progress will be
                      recalculated and this cannot be undone.
                    </Dialog.Description>
                  )}
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
                  <label className="block text-sm font-medium">
                    Title
                    <Input
                      name="title"
                      required
                      maxLength={160}
                      defaultValue={milestone.title}
                      className="mt-1.5 font-normal"
                    />
                  </label>
                  <div>
                    <label
                      htmlFor={descriptionId}
                      className="block text-sm font-medium"
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
                      className="text-muted-foreground mt-1.5 text-xs"
                    >
                      You can come back and add to these notes before completing
                      the milestone.
                    </p>
                  </div>
                  <label className="block text-sm font-medium">
                    Target date
                    <Input
                      name="targetDate"
                      type="date"
                      defaultValue={milestone.target_date ?? ""}
                      className="mt-1.5 font-normal"
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
                    <Button type="button" size="sm" variant="secondary">
                      Keep milestone
                    </Button>
                  </Dialog.Close>
                  <MilestoneMutationButton
                    idleLabel={`Remove ${milestone.title}`}
                    pendingLabel={`Removing ${milestone.title}`}
                    idleText="Remove milestone"
                    pendingText="Removing…"
                    variant="destructive"
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
  goalTitle,
  milestones,
  highlightMilestoneId,
}: {
  goalId: string;
  /** Names the goal in the show/hide button's accessible label. */
  goalTitle?: string;
  milestones: Milestone[];
  highlightMilestoneId?: string;
}) {
  const [milestonesOpen, setMilestonesOpen] = useState(() =>
    Boolean(
      highlightMilestoneId &&
      milestones.some((milestone) => milestone.id === highlightMilestoneId),
    ),
  );
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [actionMode, setActionMode] = useState<MilestoneActionMode | null>(
    null,
  );
  // Arriving from a link to one milestone (the Dayline's "Open this next")
  // opens it straight away.
  const [dialogState, setDialogState] = useState<MilestoneDialogState>(() => {
    const milestone = milestones.find(({ id }) => id === highlightMilestoneId);
    return milestone ? { mode: "view", milestone } : null;
  });
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const milestonesId = `milestones-${goalId}`;
  const addMilestoneId = `add-milestone-${goalId}`;

  // Keep the linked row in view behind the dialog, and hand focus back to it
  // when the dialog closes.
  useEffect(() => {
    if (!highlightMilestoneId) return;
    const row = document.getElementById(`milestone-${highlightMilestoneId}`);
    if (!row) return;
    row.scrollIntoView?.({ block: "center" });
    actionButtonRef.current ??= row.querySelector<HTMLButtonElement>(
      "[data-milestone-open]",
    );
  }, [highlightMilestoneId]);

  const changeActionMode = (mode: MilestoneActionMode | null) => {
    setActionMode(mode);
    setAddMilestoneOpen(false);
    if (mode) setMilestonesOpen(true);
  };

  return (
    <div className="border-border/70 mt-5 border-t pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-muted-foreground text-xs font-semibold">
            Milestones
          </p>
          <span
            className="text-muted-foreground font-mono text-xs tabular-nums"
            aria-label={`${milestones.length} ${milestones.length === 1 ? "milestone" : "milestones"}`}
          >
            {milestones.length}
          </span>
          {actionMode && (
            <span
              aria-live="polite"
              className={`rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold ring-1 ${actionMode === "remove" ? "bg-destructive/10 text-destructive ring-destructive/25" : "bg-background/60 text-muted-foreground ring-border"}`}
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
            aria-label={`${milestonesOpen ? "Hide" : "View"} milestones${goalTitle ? ` for ${goalTitle}` : ""}`}
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
        <div id={milestonesId} className="mt-2">
          {milestones.length ? (
            <div className="space-y-0.5">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  id={`milestone-${milestone.id}`}
                  className={`flex items-center gap-1 rounded-xl pr-1 transition-colors ${highlightMilestoneId === milestone.id ? "ring-primary/50 ring-1" : "[@media(hover:hover)]:hover:bg-muted/50"}`}
                >
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
                      data-milestone-open
                      aria-label={`Open milestone ${milestone.title}`}
                      onClick={(event) => {
                        actionButtonRef.current = event.currentTarget;
                        setDialogState({ mode: "view", milestone });
                      }}
                      className={`hover:text-foreground focus-visible:ring-ring block max-w-full rounded text-left text-[0.8125rem] leading-5 outline-none hover:underline focus-visible:ring-2 sm:text-xs ${milestone.completed_at ? "text-muted-foreground decoration-muted-foreground/60 line-through" : ""}`}
                    >
                      {milestone.title}
                    </button>
                  </div>
                  {milestone.target_date && !milestone.completed_at ? (
                    <time
                      dateTime={milestone.target_date}
                      className="text-muted-foreground shrink-0 font-mono text-[0.625rem] tabular-nums"
                    >
                      {formatCalendarDate(milestone.target_date).replace(
                        /, \d{4}$/,
                        "",
                      )}
                    </time>
                  ) : null}
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
          className="bg-muted/20 mt-3 space-y-3 rounded-xl p-3"
        >
          <input type="hidden" name="goalId" value={goalId} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block min-w-0 text-sm font-medium">
              New milestone
              <Input
                name="title"
                required
                maxLength={160}
                className="mt-1.5 font-normal"
              />
            </label>
            <label className="block text-sm font-medium">
              Target date
              <Input
                name="targetDate"
                type="date"
                className="mt-1.5 font-normal"
              />
            </label>
          </div>
          <div>
            <label
              htmlFor={`add-milestone-description-${goalId}`}
              className="block text-sm font-medium"
            >
              Description or learning notes
            </label>
            <MilestoneRichTextEditor
              id={`add-milestone-description-${goalId}`}
              describedBy={`add-milestone-description-help-${goalId}`}
            />
            <p
              id={`add-milestone-description-help-${goalId}`}
              className="text-muted-foreground mt-1.5 text-xs"
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
