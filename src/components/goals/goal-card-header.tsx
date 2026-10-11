"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Archive,
  CalendarDays,
  CircleCheck,
  CirclePause,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { GoalForm } from "@/components/goals/goal-form";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { calendarDaysBetween, formatCalendarDate } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  status: string;
  target_date: string | null;
  success_definition: string | null;
  target_amount_centavos?: number | null;
  saved_amount_centavos?: number | null;
};

/** Each area's text color; each keeps 4.5:1 on the card in both themes. */
const goalAreaBadgeStyles: Record<string, string> = {
  finance: "text-emerald-700 dark:text-emerald-300",
  career: "text-blue-700 dark:text-blue-300",
  health: "text-rose-700 dark:text-rose-300",
  relationship: "text-pink-700 dark:text-pink-300",
  family: "text-amber-800 dark:text-amber-300",
  business: "text-violet-700 dark:text-violet-300",
  learning: "text-cyan-700 dark:text-cyan-300",
  personal: "text-orange-700 dark:text-orange-300",
};

const fallbackGoalAreaBadgeStyle = "text-muted-foreground";

function GoalAreaBadge({ area }: { area: string }) {
  const areaLabel = area.charAt(0).toUpperCase() + area.slice(1);

  return (
    <span
      aria-label={`Goal category: ${areaLabel}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${goalAreaBadgeStyles[area] ?? fallbackGoalAreaBadgeStyle}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {areaLabel}
    </span>
  );
}

const goalStatusPills: Record<
  string,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  paused: {
    label: "Paused",
    icon: CirclePause,
    className:
      "border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    icon: CircleCheck,
    className:
      "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  abandoned: {
    label: "Abandoned",
    icon: Archive,
    className: "border-border bg-muted text-muted-foreground",
  },
};

function GoalStatusPill({ status }: { status: string }) {
  const pill = goalStatusPills[status];
  if (!pill) return null;
  const Icon = pill.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold ${pill.className}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {pill.label}
    </span>
  );
}

function deadlineLabel(daysLeft: number) {
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  if (daysLeft > 1) return `${daysLeft} days left`;
  return daysLeft === -1 ? "1 day overdue" : `${-daysLeft} days overdue`;
}

function GoalDeadline({
  targetDate,
  status,
  today,
}: {
  targetDate: string;
  status: string;
  today?: string;
}) {
  const open = status === "active" || status === "paused";
  const daysLeft =
    open && today ? calendarDaysBetween(today, targetDate) : undefined;
  const tone =
    daysLeft === undefined
      ? "text-muted-foreground"
      : daysLeft < 0
        ? "text-destructive"
        : daysLeft <= 14
          ? "text-amber-700 dark:text-amber-300"
          : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${tone}`}>
      <CalendarDays className="size-3.5" aria-hidden="true" />
      Target {formatCalendarDate(targetDate)}
      {daysLeft !== undefined ? (
        <>
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span className="font-semibold">{deadlineLabel(daysLeft)}</span>
        </>
      ) : null}
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

export function GoalCardHeader({
  goal,
  today,
}: {
  goal: Goal;
  /** Today's `YYYY-MM-DD` date, used for the target-date countdown. */
  today?: string;
}) {
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
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <GoalAreaBadge area={goal.area} />
            <GoalStatusPill status={goal.status} />
          </div>
          <h2 className="mt-1.5 text-[1.0625rem] leading-snug font-semibold tracking-[-0.02em] text-balance sm:text-lg">
            {goal.title}
          </h2>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <TooltipHint label="Goal actions" side="left">
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="-mt-1.5 -mr-2 rounded-lg sm:-mt-0.5 sm:-mr-1.5 sm:size-8 sm:min-h-8"
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
            className="absolute top-11 right-0 z-30 w-48 rounded-2xl border border-slate-300 bg-white p-1.5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10 sm:top-9 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)] dark:ring-white/10"
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
      {goal.success_definition ? (
        <p className="text-muted-foreground border-border mt-4 border-l-2 pl-3 text-[0.8125rem] leading-6">
          {goal.success_definition}
        </p>
      ) : null}
      {goal.target_date || goal.target_amount_centavos ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {goal.target_date ? (
            <GoalDeadline
              targetDate={goal.target_date}
              status={goal.status}
              today={today}
            />
          ) : null}
          {goal.target_amount_centavos ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <PiggyBank className="size-3.5" aria-hidden="true" />
              <SensitiveValue>
                {formatCentavos(goal.saved_amount_centavos ?? 0)}
              </SensitiveValue>{" "}
              of{" "}
              <SensitiveValue>
                {formatCentavos(goal.target_amount_centavos)}
              </SensitiveValue>{" "}
              saved
            </span>
          ) : null}
        </div>
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
