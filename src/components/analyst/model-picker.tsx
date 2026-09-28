"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Gem, Zap } from "lucide-react";
import {
  AI_MODELS,
  ANALYST_MODEL_OPTIONS,
  type AnalystModelId,
} from "@/lib/ai/models";
import { FREE_POOL_DAILY_TOKENS, type FreePool } from "@/lib/ai/pools";
import { cn } from "@/lib/utils";

type PoolStatus = Record<
  FreePool,
  {
    used: number;
    budget: number;
    dailyTokens: number;
    /** When OpenAI's own count was last read, if the sync is set up. */
    syncedAt?: string | null;
  }
>;

// Room one question needs: the planner and answer (small) or an answer with
// its repair attempt (large). Below this a pool reads as used up; the server
// enforces the real limit either way.
const QUESTION_TOKENS: Record<FreePool, number> = {
  small: 60_000,
  large: 35_000,
};

const groups: Array<{ pool: FreePool; title: string }> = [
  { pool: "small", title: "Everyday" },
  { pool: "large", title: "Flagship" },
];

const PANEL_WIDTH = 368;

function compactTokens(value: number) {
  return value >= 1_000_000
    ? `${Number((value / 1_000_000).toFixed(1))}M`
    : `${Math.round(value / 1_000)}K`;
}

export function optionFor(id: string) {
  return (
    ANALYST_MODEL_OPTIONS.find((option) => option.id === id) ??
    ANALYST_MODEL_OPTIONS[0]
  );
}

function PoolMeter({ status }: { status: PoolStatus[FreePool] | undefined }) {
  if (!status) return null;
  const share = status.budget > 0 ? status.used / status.budget : 1;
  const percent = Math.min(100, Math.round(share * 100));
  return (
    <span
      className="ml-auto flex items-center gap-1.5"
      title={`${compactTokens(status.used)} of ${compactTokens(status.budget)} free tokens used today`}
    >
      <span
        role="meter"
        aria-label="Free tokens used today"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-muted block h-1 w-14 overflow-hidden rounded-full"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500",
            percent >= 90 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </span>
      <span className="text-muted-foreground text-[11px] tabular-nums">
        {percent}%
      </span>
    </span>
  );
}

/**
 * A compact model button for the Analyst composer. It opens an anchored panel
 * on larger screens and a bottom sheet on phones, grouped by OpenAI's free
 * daily pools with today's use of each.
 */
export function ModelPicker({
  value,
  onChange,
  compact = false,
  disabled = false,
}: {
  value: AnalystModelId;
  onChange: (id: AnalystModelId) => void;
  /** The one-row follow-up composer uses a taller, tighter trigger. */
  compact?: boolean;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const [pools, setPools] = useState<PoolStatus | null>(null);
  const [resetsAt, setResetsAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const selected = optionFor(value);

  function show(next: boolean) {
    if (next) {
      const rect = trigger.current?.getBoundingClientRect();
      const phone = !window.matchMedia?.("(min-width: 640px)")?.matches;
      setSheet(phone);
      if (rect && !phone) {
        const left = Math.min(
          Math.max(16, rect.left),
          window.innerWidth - PANEL_WIDTH - 16,
        );
        // Open towards the side with more room, and scroll within it.
        const above = rect.top > window.innerHeight - rect.bottom;
        setPlace(
          above
            ? {
                left,
                bottom: window.innerHeight - rect.top + 10,
                maxHeight: rect.top - 26,
              }
            : {
                left,
                top: rect.bottom + 10,
                maxHeight: window.innerHeight - rect.bottom - 26,
              },
        );
      }
      setUsage("loading");
      fetch("/api/analyst/pools", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("unavailable");
          const body = (await response.json()) as {
            pools: PoolStatus;
            resetsAt: string;
          };
          setPools(body.pools);
          setResetsAt(body.resetsAt);
          setUsage("ready");
        })
        .catch(() => setUsage("unavailable"));
    }
    setOpen(next);
  }

  const resetLabel = resetsAt
    ? new Date(resetsAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const usedUp = (pool: FreePool) =>
    usage === "ready" &&
    !!pools &&
    pools[pool].budget - pools[pool].used < QUESTION_TOKENS[pool];

  // Arrow keys move between models, as in a native radio group.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const radios = Array.from(
      list.current?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]:not(:disabled)',
      ) ?? [],
    );
    const index = radios.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? radios.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + radios.length) %
            radios.length;
    event.preventDefault();
    radios[next]?.focus();
  }

  return (
    <Dialog.Root open={open} onOpenChange={show}>
      <Dialog.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          disabled={disabled}
          aria-label={`Model: ${selected.label}. Change model`}
          className={cn(
            "group border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40 focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
            compact ? "h-10 px-3" : "h-8 px-2.5",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              selected.pool === "large"
                ? "bg-gradient-to-br from-violet-400 to-[var(--primary)]"
                : "bg-primary",
            )}
          />
          <span className="max-w-[6.5rem] truncate">{selected.short}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-3 transition-transform group-aria-expanded:rotate-180"
          />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[60]",
            sheet
              ? "motion-safe:animate-analyst-fade bg-black/45 backdrop-blur-[2px]"
              : "bg-transparent",
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            list.current
              ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
              ?.focus();
          }}
          style={sheet ? undefined : { ...place, width: PANEL_WIDTH }}
          className={cn(
            "border-border bg-card text-card-foreground fixed z-[60] border shadow-[0_28px_80px_rgb(7_10_15/0.32)] outline-none",
            sheet
              ? "motion-safe:animate-analyst-sheet inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[1.75rem] px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
              : "motion-safe:animate-analyst-rise overflow-y-auto overscroll-contain rounded-[1.25rem] p-1.5",
          )}
        >
          {sheet && (
            <div
              aria-hidden="true"
              className="bg-muted mx-auto mt-0.5 mb-1 h-1 w-10 rounded-full"
            />
          )}
          <div className="flex items-baseline justify-between gap-3 px-3 pt-2 pb-1">
            <Dialog.Title className="text-sm font-semibold tracking-[-0.01em]">
              Explain with
            </Dialog.Title>
            <p className="text-muted-foreground text-[11px]">
              {usage === "unavailable"
                ? "Today's usage is unavailable"
                : `Free daily tokens${resetLabel ? ` · resets ${resetLabel}` : ""}`}
            </p>
          </div>
          <div
            ref={list}
            role="radiogroup"
            aria-label="Analyst model"
            onKeyDown={onKeyDown}
          >
            {groups.map((group) => {
              const Icon = group.pool === "large" ? Gem : Zap;
              const exhausted = usedUp(group.pool);
              return (
                <section
                  key={group.pool}
                  aria-labelledby={`model-pool-${group.pool}`}
                >
                  <header className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                    <p
                      id={`model-pool-${group.pool}`}
                      className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase"
                    >
                      {group.title}
                    </p>
                    <span className="text-muted-foreground/80 text-[11px]">
                      {compactTokens(
                        pools?.[group.pool].dailyTokens ??
                          FREE_POOL_DAILY_TOKENS[group.pool],
                      )}{" "}
                      a day
                    </span>
                    {usage === "loading" ? (
                      <span
                        aria-hidden="true"
                        className="bg-muted ml-auto h-1 w-20 rounded-full motion-safe:animate-pulse"
                      />
                    ) : (
                      <PoolMeter status={pools?.[group.pool]} />
                    )}
                  </header>
                  <div className="space-y-0.5">
                    {ANALYST_MODEL_OPTIONS.filter(
                      (option) => option.pool === group.pool,
                    ).map((option) => {
                      const checked = option.id === value;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          disabled={exhausted && !checked}
                          tabIndex={checked ? 0 : -1}
                          onClick={() => {
                            onChange(option.id);
                            show(false);
                          }}
                          className={cn(
                            "focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:py-1.5",
                            checked
                              ? "bg-primary/8 ring-primary/25 ring-1"
                              : "hover:bg-muted/70",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                              checked
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              {option.label}
                              {option.id === AI_MODELS.analyst && (
                                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[10px] font-semibold">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground block text-xs leading-4">
                              {exhausted
                                ? `Used up today${resetLabel ? ` · resets ${resetLabel}` : ""}`
                                : option.hint}
                            </span>
                          </span>
                          {checked && (
                            <Check
                              aria-hidden="true"
                              className="text-primary size-4 shrink-0"
                              strokeWidth={2.5}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="text-muted-foreground px-3 pt-3 pb-1.5 text-[11px] leading-4">
            {usage === "ready" &&
            (pools?.small.syncedAt || pools?.large.syncedAt)
              ? "Usage includes OpenAI’s own count, refreshed every few minutes. "
              : null}
            Every figure is checked against your records whichever model
            explains. GPT-5.4 mini always plans which records to read.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
