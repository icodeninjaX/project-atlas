"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Expand, Pause, Play, Timer, X } from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { taskMenuItemClass } from "@/components/tasks/task-menu";
import type { OfflineActionState } from "@/lib/offline/types";
import { playFocusActivationSound } from "@/lib/tasks/focus-sound";
import { cn } from "@/lib/utils";

type WakeLockHandle = {
  release: () => Promise<void>;
};

type TaskFocusModeProps = {
  taskId: string;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  scheduledLabel: string | null;
  triggerPresentation?: "button" | "menu";
  onTrigger?: () => void;
  onCloseAutoFocus?: () => void;
};

const initialCompletionState: OfflineActionState = {
  success: false,
  message: "",
};

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function UnavailableFocusButton({
  triggerPresentation = "button",
}: Pick<TaskFocusModeProps, "triggerPresentation">) {
  const menuItem = triggerPresentation === "menu";

  return (
    <Button
      type="button"
      variant={menuItem ? "ghost" : "secondary"}
      size="sm"
      disabled
      role={menuItem ? "menuitem" : undefined}
      title="Add estimated minutes to use Focus mode"
      className={menuItem ? taskMenuItemClass : "min-h-11 sm:min-h-9"}
    >
      {menuItem ? (
        <Timer className="text-muted-foreground size-4" aria-hidden="true" />
      ) : null}
      Add an estimate to focus
    </Button>
  );
}

function FocusTimer({
  taskId,
  title,
  description,
  estimatedMinutes,
  scheduledLabel,
  triggerPresentation = "button",
  onTrigger,
  onCloseAutoFocus,
}: Omit<TaskFocusModeProps, "estimatedMinutes"> & {
  estimatedMinutes: number;
}) {
  const totalSeconds = Math.max(1, estimatedMinutes * 60);
  const [open, setOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [trackedTotalSeconds, setTrackedTotalSeconds] = useState(totalSeconds);
  // An edited estimate resets a timer that has not started (or has
  // finished) to the new length. A paused session keeps its place, trimmed
  // to the new length; a running one is left alone.
  if (trackedTotalSeconds !== totalSeconds) {
    setTrackedTotalSeconds(totalSeconds);
    if (!running) {
      setRemainingSeconds(
        remainingSeconds === trackedTotalSeconds || remainingSeconds === 0
          ? totalSeconds
          : Math.min(remainingSeconds, totalSeconds),
      );
    }
  }
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const { submit } = useOfflineSync();
  const menuItem = triggerPresentation === "menu";
  const finished = remainingSeconds === 0;
  const progress = Math.min(1, remainingSeconds / totalSeconds);
  const circumference = 2 * Math.PI * 108;
  const strokeOffset = circumference * (1 - progress);

  const pauseTimer = useCallback(() => {
    if (deadlineRef.current !== null) {
      setRemainingSeconds(
        Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1_000)),
      );
    }
    deadlineRef.current = null;
    setRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    const nextRemaining =
      remainingSeconds > 0 ? remainingSeconds : totalSeconds;
    if (remainingSeconds === 0) setRemainingSeconds(totalSeconds);
    deadlineRef.current = Date.now() + nextRemaining * 1_000;
    setRunning(true);
  }, [remainingSeconds, totalSeconds]);

  const resetTimer = useCallback(() => {
    deadlineRef.current = null;
    setRunning(false);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!open || !running) return;

    const tick = () => {
      if (deadlineRef.current === null) return;
      const next = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1_000),
      );
      setRemainingSeconds(next);

      if (next === 0) {
        deadlineRef.current = null;
        setRunning(false);
        navigator.vibrate?.([180, 100, 180]);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [open, running]);

  useEffect(() => {
    if (!open) return;
    const previousTitle = document.title;
    document.title = `${formatCountdown(remainingSeconds)} · ${title}`;
    return () => {
      document.title = previousTitle;
    };
  }, [open, remainingSeconds, title]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const releaseWakeLock = async () => {
      const wakeLock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (wakeLock) await wakeLock.release().catch(() => undefined);
      if (!cancelled) setWakeLockActive(false);
    };

    const requestWakeLock = async () => {
      const wakeLockApi = (
        navigator as Navigator & {
          wakeLock?: {
            request: (type: "screen") => Promise<WakeLockHandle>;
          };
        }
      ).wakeLock;
      if (!wakeLockApi || document.visibilityState !== "visible") return;

      try {
        const handle = await wakeLockApi.request("screen");
        if (cancelled) {
          await handle.release().catch(() => undefined);
          return;
        }
        wakeLockRef.current = handle;
        setWakeLockActive(true);
      } catch {
        setWakeLockActive(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && open && running) {
        void requestWakeLock();
      }
    };

    if (open && running) void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void releaseWakeLock();
    };
  }, [open, running]);

  const sessionLabel = useMemo(() => {
    if (finished) return "Focus session complete";
    if (running) return "In progress";
    if (remainingSeconds < totalSeconds) return "Session paused";
    return `${estimatedMinutes}-minute focus session`;
  }, [estimatedMinutes, finished, remainingSeconds, running, totalSeconds]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (
        typeof document.documentElement.requestFullscreen === "function"
      ) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setFullscreen(false);
    }
  };

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && running) pauseTimer();
      if (!nextOpen && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
      setOpen(nextOpen);
    },
    [pauseTimer, running],
  );

  const completeTask = useCallback(
    async (_state: OfflineActionState, formData: FormData) => {
      const result = await submit("task.setStatus", formData);
      if (result.success) {
        toast.success(result.message);
        handleOpenChange(false);
      } else {
        toast.error(result.message);
      }
      return result;
    },
    [handleOpenChange, submit],
  );
  const [, completeTaskAction, completingTask] = useActionState(
    completeTask,
    initialCompletionState,
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant={menuItem ? "ghost" : "secondary"}
          size="sm"
          role={menuItem ? "menuitem" : undefined}
          onClick={() => {
            void playFocusActivationSound();
            onTrigger?.();
          }}
          aria-label={`Focus on ${title}`}
          className={menuItem ? taskMenuItemClass : "min-h-11 sm:min-h-9"}
        >
          {menuItem ? (
            <Timer
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
          ) : null}
          Focus
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-background fixed inset-0 z-50" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (!onCloseAutoFocus) return;
            event.preventDefault();
            onCloseAutoFocus();
          }}
          className="bg-background text-foreground fixed inset-0 z-50 flex h-[100dvh] min-h-0 flex-col overflow-hidden outline-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 pt-[max(0.875rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] sm:p-6">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  running
                    ? "bg-primary animate-pulse motion-reduce:animate-none"
                    : "bg-muted-foreground/50",
                )}
              />
              Focus mode
              {wakeLockActive ? " · screen awake" : ""}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                aria-label={
                  fullscreen ? "Exit full screen" : "Enter full screen"
                }
                title={fullscreen ? "Exit full screen" : "Enter full screen"}
                className="hidden sm:inline-flex"
              >
                <Expand className="size-4" />
              </Button>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close Focus mode"
                >
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain pt-2 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-center sm:px-10 sm:py-6">
            <Dialog.Description className="text-muted-foreground font-mono text-xs">
              {scheduledLabel ?? "No scheduled time"}
            </Dialog.Description>
            <Dialog.Title className="mt-2 max-w-2xl text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:mt-3 sm:text-[1.75rem]">
              {title}
            </Dialog.Title>
            {description && (
              <p className="text-muted-foreground mt-2 max-h-12 max-w-lg overflow-hidden text-sm leading-6 sm:mt-3 sm:max-h-none">
                {description}
              </p>
            )}

            <div className="relative mt-[clamp(0.875rem,3dvh,2.5rem)] grid size-[min(75vw,38dvh,20rem)] shrink-0 place-items-center sm:mt-10 sm:size-80">
              <svg
                viewBox="0 0 240 240"
                className="absolute inset-0 size-full -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  strokeWidth="7"
                  className="stroke-muted"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none"
                />
              </svg>
              <div className="relative">
                <p
                  role="timer"
                  aria-label={`${remainingSeconds} seconds remaining`}
                  className="font-mono text-[clamp(2.65rem,13vw,3.75rem)] font-semibold tracking-[-0.025em] tabular-nums"
                >
                  {formatCountdown(remainingSeconds)}
                </p>
                <p
                  aria-live="polite"
                  className="text-muted-foreground mt-3 text-xs font-medium"
                >
                  {sessionLabel}
                </p>
              </div>
            </div>

            <div className="mt-[clamp(0.875rem,3dvh,2rem)] grid w-full max-w-80 gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                {running ? (
                  <Button type="button" size="lg" onClick={pauseTimer}>
                    <Pause className="size-4" />
                    Pause
                  </Button>
                ) : (
                  <Button type="button" size="lg" onClick={startTimer}>
                    <Play className="size-4 fill-current" />
                    {finished
                      ? "Focus again"
                      : remainingSeconds < totalSeconds
                        ? "Resume"
                        : "Start focus"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={resetTimer}
                >
                  Reset
                </Button>
              </div>

              <form action={completeTaskAction}>
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="status" value="completed" />
                <Button
                  type="submit"
                  variant="ghost"
                  pending={completingTask}
                  pendingLabel="Marking complete…"
                  className="w-full"
                >
                  Mark task complete
                </Button>
              </form>
            </div>
          </main>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TaskFocusMode(props: TaskFocusModeProps) {
  if (!props.estimatedMinutes)
    return (
      <UnavailableFocusButton triggerPresentation={props.triggerPresentation} />
    );
  return <FocusTimer {...props} estimatedMinutes={props.estimatedMinutes} />;
}
