"use client";

import { CalendarDays } from "lucide-react";
import { forwardRef, useId } from "react";
import { Input } from "@/components/ui/input";
import {
  formatPesoInput,
  sanitizePesoInput,
  shiftIsoDate,
} from "@/lib/money/history";
import { cn } from "@/lib/utils";

/**
 * Moves focus back to the amount for the next entry, but only with a mouse
 * or trackpad: on touch screens it would reopen the keyboard uninvited.
 */
export function focusForNextEntry(input: HTMLInputElement | null) {
  if (typeof window.matchMedia === "function") {
    if (!window.matchMedia("(pointer: fine)").matches) return;
  }
  input?.focus();
}

/**
 * The amount as the hero of a money form: large tabular figures beside a
 * peso sign, kept to digits and two decimals as it is typed.
 */
export const AmountField = forwardRef<
  HTMLInputElement,
  {
    name: string;
    value: string;
    onValueChange: (value: string) => void;
    label: string;
    ariaLabel: string;
    hint?: string;
    size?: "hero" | "compact";
  }
>(function AmountField(
  { name, value, onValueChange, label, ariaLabel, hint, size = "hero" },
  ref,
) {
  const id = useId();
  const hero = size === "hero";

  return (
    <div className="text-center">
      <label
        htmlFor={id}
        className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase"
      >
        {label}
      </label>
      <div className="focus-within:ring-ring/40 mx-auto mt-2 flex max-w-full items-baseline justify-center gap-1.5 rounded-2xl px-3 py-1 transition-shadow focus-within:ring-2">
        <span
          aria-hidden="true"
          className={cn(
            "text-muted-foreground font-semibold",
            hero ? "text-[clamp(1.75rem,8vw,2.5rem)]" : "text-2xl",
          )}
        >
          ₱
        </span>
        <input
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={(event) =>
            onValueChange(sanitizePesoInput(event.target.value))
          }
          onBlur={() => onValueChange(formatPesoInput(value))}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          required
          placeholder="0.00"
          aria-label={ariaLabel}
          aria-describedby={hint ? `${id}-hint` : undefined}
          style={{ width: `${Math.max(value.length, 4) + 0.5}ch` }}
          className={cn(
            "placeholder:text-muted-foreground/40 max-w-full min-w-0 bg-transparent text-left font-mono font-semibold tracking-[-0.04em] outline-none",
            hero
              ? "text-[clamp(2.5rem,12vw,3.75rem)] leading-tight"
              : "text-4xl",
          )}
        />
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground mt-1 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/**
 * A peso amount in a compact field: the peso sign, then right-aligned
 * figures kept to digits and two decimals as they are typed.
 */
export function PesoInput({
  id,
  name,
  value,
  onValueChange,
  describedBy,
  placeholder = "0.00",
  disabled = false,
  large = false,
}: {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  describedBy?: string;
  placeholder?: string;
  disabled?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-background/60 focus-within:border-primary focus-within:ring-primary/15 flex min-w-0 items-center gap-1.5 rounded-xl border px-3 transition-[border-color,box-shadow] focus-within:ring-4",
        large ? "h-14" : "h-11",
        disabled && "opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "text-muted-foreground font-medium",
          large ? "text-lg" : "text-sm",
        )}
      >
        ₱
      </span>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(event) =>
          onValueChange(sanitizePesoInput(event.target.value))
        }
        onBlur={() => onValueChange(formatPesoInput(value))}
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={describedBy}
        className={cn(
          "placeholder:text-muted-foreground/45 min-w-0 flex-1 bg-transparent text-right font-mono font-semibold outline-none disabled:cursor-not-allowed",
          large ? "text-xl tracking-[-0.02em]" : "text-sm",
        )}
      />
    </div>
  );
}

/** Today and Yesterday as one tap, with a calendar for anything older. */
export function DateField({
  name,
  value,
  onValueChange,
  today,
  legend,
  ariaLabel,
}: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  today: string;
  legend: string;
  ariaLabel: string;
}) {
  const yesterday = shiftIsoDate(today, -1);
  const shortcuts = [
    { label: "Today", date: today },
    { label: "Yesterday", date: yesterday },
  ];

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            aria-pressed={value === shortcut.date}
            onClick={() => onValueChange(shortcut.date)}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10",
              value === shortcut.date
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {shortcut.label}
          </button>
        ))}
        <label className="relative min-w-[10.5rem] flex-1">
          <span className="sr-only">{ariaLabel}</span>
          <CalendarDays
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            name={name}
            type="date"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            required
            aria-label={ariaLabel}
            className={cn(
              "rounded-full pl-9",
              value !== today && value !== yesterday && "border-primary",
            )}
          />
        </label>
      </div>
    </fieldset>
  );
}
