"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const themes = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const subscribeToNothing = () => () => {};

export function ThemePreferencePicker() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser; render no selection on the
  // server so hydration matches, then reveal the saved choice.
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const selectedTheme = hydrated ? (theme ?? "system") : undefined;

  return (
    <div>
      <div
        role="group"
        aria-label="Color theme"
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        {themes.map(({ value, label, icon: Icon }) => {
          const selected = selectedTheme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "focus-visible:ring-ring flex flex-col gap-2.5 rounded-xl p-2 text-left transition-shadow focus-visible:ring-2 focus-visible:outline-none sm:p-2.5",
                selected
                  ? "ring-primary ring-2"
                  : "ring-border/80 hover:ring-foreground/25 ring-1",
              )}
            >
              <ThemePreview value={value} />
              <span className="flex items-center gap-1.5 px-0.5 pb-0.5">
                <Icon
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors",
                    selected
                      ? "bg-primary-solid ring-primary-solid text-primary-solid-foreground"
                      : "ring-border",
                  )}
                >
                  {selected ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Applies instantly on this browser. System follows your device setting.
      </p>
    </div>
  );
}

/** A tiny ATLAS window drawn in the theme's colors. */
function ThemePreview({ value }: { value: (typeof themes)[number]["value"] }) {
  if (value === "system") {
    return (
      <span
        aria-hidden="true"
        className="ring-border relative block aspect-[16/10] overflow-hidden rounded-lg ring-1"
      >
        <span className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]">
          <MiniWindow mode="light" />
        </span>
        <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
          <MiniWindow mode="dark" />
        </span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="ring-border relative block aspect-[16/10] overflow-hidden rounded-lg ring-1"
    >
      <MiniWindow mode={value} />
    </span>
  );
}

/**
 * The theme's own palette, so each preview shows that theme whichever one
 * is active: background, card, muted lines, foreground, and primary.
 */
const palettes = {
  light: {
    background: "bg-[#f4f7fb]",
    card: "bg-[#ffffff] ring-1 ring-[#dce3ed]",
    line: "bg-[#e9eef6]",
    text: "bg-[#111827]/75",
    primary: "bg-[#2867e8]",
  },
  dark: {
    background: "bg-[#070a0f]",
    card: "bg-[#0e131c] ring-1 ring-[#202a39]",
    line: "bg-[#182131]",
    text: "bg-[#f4f7fb]/75",
    primary: "bg-[#84afff]",
  },
} as const;

function MiniWindow({ mode }: { mode: "light" | "dark" }) {
  const palette = palettes[mode];
  return (
    <span
      className={cn(
        "absolute inset-0 flex gap-[6%] p-[7%]",
        palette.background,
      )}
    >
      <span className="flex w-[22%] flex-col gap-[14%]">
        <span className={cn("h-[10%] w-3/4 rounded-full", palette.primary)} />
        <span className={cn("h-[7%] rounded-full", palette.line)} />
        <span className={cn("h-[7%] w-5/6 rounded-full", palette.line)} />
        <span className={cn("h-[7%] w-2/3 rounded-full", palette.line)} />
      </span>
      <span
        className={cn(
          "flex flex-1 flex-col gap-[10%] rounded-[6px] p-[8%]",
          palette.card,
        )}
      >
        <span className={cn("h-[12%] w-1/2 rounded-full", palette.text)} />
        <span className={cn("h-[8%] w-5/6 rounded-full", palette.line)} />
        <span className="mt-auto flex h-[34%] items-end gap-[6%]">
          {[45, 70, 55, 90, 65].map((height) => (
            <span
              key={height}
              className={cn("flex-1 rounded-[2px]", palette.primary)}
              style={{ height: `${height}%` }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
