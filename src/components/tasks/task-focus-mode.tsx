"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Expand,
  Flame,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
  X,
} from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import type { OfflineActionState } from "@/lib/offline/types";
import { playFocusActivationSound } from "@/lib/tasks/focus-sound";

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
      className={
        menuItem
          ? "w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
          : "min-h-11 sm:min-h-9"
      }
    >
      <TimerReset className="size-3.5" />
      Set focus minutes
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
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const { submit } = useOfflineSync();
  const gradientId = useId().replaceAll(":", "");
  const menuItem = triggerPresentation === "menu";
  const finished = remainingSeconds === 0;
  const progress = remainingSeconds / totalSeconds;
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
    if (running) return "Stay with this one task";
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
          className={
            menuItem
              ? "w-full justify-start text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
              : "min-h-11 sm:min-h-9"
          }
        >
          <Flame className="size-3.5" />
          Focus
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#020611]/90 backdrop-blur-xl" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (!onCloseAutoFocus) return;
            event.preventDefault();
            onCloseAutoFocus();
          }}
          className="fixed inset-0 z-50 flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#07101f] text-white outline-none sm:inset-5 sm:h-auto sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-2xl"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute right-[-8rem] bottom-[-8rem] h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="atlas-grid absolute inset-0 opacity-20" />
          </div>

          <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 pt-[max(0.875rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] sm:p-6">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.18em] text-blue-200 uppercase">
              <span className="relative flex size-2">
                {running && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-300 opacity-75" />
                )}
                <span className="relative inline-flex size-2 rounded-full bg-blue-300" />
              </span>
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
                className="hidden size-11 text-blue-100 hover:bg-white/10 hover:text-white sm:inline-flex sm:size-10"
              >
                <Expand className="size-4" />
              </Button>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close Focus mode"
                  className="size-11 text-blue-100 hover:bg-white/10 hover:text-white sm:size-10"
                >
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          </header>

          <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain pt-2 pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] text-center sm:px-10 sm:py-4 [@media(max-height:680px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Dialog.Description className="font-mono text-[10px] tracking-[0.16em] text-blue-200 uppercase">
              {scheduledLabel ?? "Start when you are ready"}
            </Dialog.Description>
            <Dialog.Title className="mt-2 max-w-2xl text-[clamp(1.35rem,6.5vw,2.25rem)] leading-tight font-semibold tracking-[-0.04em] text-balance sm:mt-3 sm:text-4xl">
              {title}
            </Dialog.Title>
            {description && (
              <p className="mt-2 max-h-12 max-w-lg overflow-hidden text-sm leading-6 text-slate-300 sm:mt-3 sm:max-h-none">
                {description}
              </p>
            )}

            <div className="relative mt-[clamp(0.875rem,3dvh,2.5rem)] grid size-[min(75vw,38dvh,20rem)] shrink-0 place-items-center sm:mt-10 sm:size-80">
              <div className="absolute inset-8 rounded-full bg-blue-500/15 blur-2xl" />
              <svg
                viewBox="0 0 240 240"
                className="absolute inset-0 size-full -rotate-90 drop-shadow-[0_0_24px_rgba(96,165,250,0.28)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="55%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeWidth="7"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-[stroke-dashoffset] duration-300 ease-linear"
                />
              </svg>
              <div className="relative">
                <p
                  role="timer"
                  aria-label={`${remainingSeconds} seconds remaining`}
                  className="font-mono text-[clamp(2.65rem,13vw,3.75rem)] font-semibold tracking-[-0.06em] tabular-nums sm:text-6xl"
                >
                  {formatCountdown(remainingSeconds)}
                </p>
                <p
                  aria-live="polite"
                  className="mt-3 text-xs font-medium text-blue-200"
                >
                  {sessionLabel}
                </p>
              </div>
            </div>

            <div className="mt-[clamp(0.875rem,3dvh,2rem)] w-full max-w-80 rounded-[1.4rem] border border-white/10 bg-white/[0.06] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                {running ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={pauseTimer}
                    className="w-full rounded-2xl bg-white text-slate-950 hover:bg-blue-50"
                  >
                    <Pause className="size-4" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={startTimer}
                    className="w-full rounded-2xl bg-white text-slate-950 hover:bg-blue-50"
                  >
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
                  variant="ghost"
                  size="lg"
                  onClick={resetTimer}
                  className="rounded-2xl px-4 text-blue-100 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>

              <form action={completeTaskAction} className="mt-1">
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="status" value="completed" />
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={completingTask}
                  className="min-h-11 w-full rounded-2xl text-blue-200 hover:bg-emerald-400/10 hover:text-emerald-200"
                >
                  <Check className="size-4" />
                  {completingTask ? "Marking complete…" : "Mark task complete"}
                </Button>
              </form>
            </div>
          </main>

          <footer className="relative z-10 shrink-0 pt-2 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-center font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase sm:p-5 [@media(max-height:680px)]:hidden">
            One task. One timer. Everything else can wait.
          </footer>
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
