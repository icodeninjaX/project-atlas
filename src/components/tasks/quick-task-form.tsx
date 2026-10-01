"use client";

import {
  CalendarDays,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskActionState } from "@/lib/tasks/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { TaskTimeRecommendations } from "@/components/tasks/task-time-recommendations";
import { shiftIsoDate } from "@/lib/money/history";
import {
  EMPTY_SCHEDULED_TASKS,
  type ScheduledTaskSlot,
} from "@/lib/tasks/task-time";
import { manilaIsoDate } from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";

const initialState: TaskActionState = { success: false, message: "" };

const fieldLabelClass =
  "text-muted-foreground mb-1.5 block text-xs font-medium";

const selectClass =
  "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm";

export function QuickTaskForm({
  defaultPriority = "medium",
  defaultEstimatedMinutes = null,
  scheduledTasks = EMPTY_SCHEDULED_TASKS,
  today,
  autoFocus = false,
  focusRequest = 0,
  onCancel,
  onCreated,
}: {
  defaultPriority?: string;
  defaultEstimatedMinutes?: number | null;
  scheduledTasks?: ScheduledTaskSlot[];
  /** Today in Asia/Manila as `YYYY-MM-DD`, for the date shortcuts. */
  today?: string;
  autoFocus?: boolean;
  focusRequest?: number;
  onCancel?: () => void;
  onCreated?: () => void;
}) {
  const [state, action, pending] = useOfflineActionState(
    "task.create",
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    defaultEstimatedMinutes?.toString() ?? "",
  );
  const [planningDetailsOpen, setPlanningDetailsOpen] = useState(false);
  const [shortcutToday] = useState(
    () => today ?? manilaIsoDate(new Date()) ?? "",
  );
  const dateShortcuts = shortcutToday
    ? [
        { label: "Today", value: shortcutToday },
        { label: "Tomorrow", value: shiftIsoDate(shortcutToday, 1) },
      ]
    : [];
  const planningDetailsVisible =
    planningDetailsOpen || Boolean(state.message && !state.success);

  useEffect(() => {
    if (focusRequest > 0) titleRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      onCreated?.();
    } else {
      toast.error(state.message);
    }
  }, [onCreated, state]);

  return (
    <form
      id="quick-task-form"
      ref={formRef}
      action={action}
      onReset={() => {
        setScheduledFor("");
        setScheduledTime("");
        setEstimatedMinutes(defaultEstimatedMinutes?.toString() ?? "");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onCancel) {
          event.preventDefault();
          onCancel();
        }
      }}
      className="border-border bg-card relative overflow-hidden rounded-[1.5rem] border shadow-[0_24px_70px_rgb(7_10_15/0.12)]"
    >
      <div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent"
      />
      <div className="relative p-4 sm:p-6">
        <p className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
          <Sparkles className="size-3.5" aria-hidden="true" />
          New task
        </p>
        <div className="mt-3">
          <label htmlFor="quick-task-title" className={fieldLabelClass}>
            Task title
          </label>
          <Input
            ref={titleRef}
            autoFocus={autoFocus}
            id="quick-task-title"
            name="title"
            required
            maxLength={160}
            placeholder="What needs to get done?"
            className="min-h-12 rounded-2xl px-4 font-medium sm:min-h-13 sm:text-base"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-end">
          <div>
            <label htmlFor="quick-task-date" className={fieldLabelClass}>
              Scheduled date
            </label>
            <Input
              id="quick-task-date"
              name="scheduledFor"
              type="date"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </div>
          {dateShortcuts.length > 0 ? (
            <div
              role="group"
              aria-label="Date shortcuts"
              className="flex flex-wrap gap-2"
            >
              {dateShortcuts.map((shortcut) => {
                const pressed = scheduledFor === shortcut.value;
                return (
                  <button
                    key={shortcut.label}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() =>
                      setScheduledFor(pressed ? "" : shortcut.value)
                    }
                    className={cn(
                      "focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold ring-1 transition-colors [-webkit-tap-highlight-color:transparent] ring-inset focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100 sm:min-h-10",
                      pressed
                        ? "bg-primary/10 text-primary ring-primary/45"
                        : "bg-background text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {shortcut.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="border-border mt-4 border-t pt-3">
          <button
            type="button"
            aria-expanded={planningDetailsVisible}
            aria-controls="quick-task-planning-details"
            onClick={() => setPlanningDetailsOpen((open) => !open)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Planning details
            <ChevronDown
              className={`size-3.5 transition-transform ${planningDetailsVisible ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {!planningDetailsVisible && (
            <>
              <input type="hidden" name="priority" value={defaultPriority} />
              <input type="hidden" name="energyRequired" value="medium" />
              {defaultEstimatedMinutes ? (
                <input
                  type="hidden"
                  name="estimatedMinutes"
                  value={defaultEstimatedMinutes}
                />
              ) : null}
            </>
          )}
        </div>

        {planningDetailsVisible && (
          <div
            id="quick-task-planning-details"
            className="bg-muted/40 border-border mt-2 grid gap-3 rounded-2xl border p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label htmlFor="quick-task-time" className={fieldLabelClass}>
                Exact time
              </label>
              <Input
                ref={timeRef}
                id="quick-task-time"
                name="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="quick-task-priority" className={fieldLabelClass}>
                Priority
              </label>
              <select
                id="quick-task-priority"
                name="priority"
                defaultValue={defaultPriority}
                className={selectClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="quick-task-estimated-minutes"
                className={fieldLabelClass}
              >
                Estimated minutes
              </label>
              <Input
                id="quick-task-estimated-minutes"
                name="estimatedMinutes"
                type="number"
                inputMode="numeric"
                min="1"
                max="1440"
                placeholder="30"
                value={estimatedMinutes}
                onChange={(event) => setEstimatedMinutes(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="quick-task-energy" className={fieldLabelClass}>
                Energy needed
              </label>
              <select
                id="quick-task-energy"
                name="energyRequired"
                defaultValue="medium"
                className={selectClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <TaskTimeRecommendations
              scheduledTasks={scheduledTasks}
              scheduledFor={scheduledFor}
              scheduledTime={scheduledTime}
              estimatedMinutes={
                estimatedMinutes ? Number(estimatedMinutes) : null
              }
              onSelectTime={(time) => {
                setScheduledTime(time);
                timeRef.current?.focus();
              }}
              className="md:col-span-2 xl:col-span-4"
            />
          </div>
        )}

        <div className="border-border mt-4 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[0.6875rem] leading-5">
            Press{" "}
            <kbd className="border-border bg-background text-foreground mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded-md border px-1 text-[0.625rem] font-semibold shadow-[0_1px_0_var(--border)]">
              N
            </kbd>{" "}
            from any quiet area to focus quick capture. Exact times use
            Asia/Manila.
          </p>
          <div className="flex shrink-0 gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              pending={pending}
              pendingLabel="Adding…"
              className="min-h-12 flex-1 sm:min-h-10 sm:flex-none sm:px-5"
            >
              Add task
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
