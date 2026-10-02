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
                "focus-visible:ring-ring group flex flex-col gap-2.5 rounded-2xl p-2 text-left ring-1 transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none sm:p-2.5",
                selected
                  ? "bg-primary/[0.07] ring-primary/60 shadow-[0_10px_30px_-18px_color-mix(in_srgb,var(--primary)_80%,transparent)]"
                  : "bg-background/55 ring-border/80 hover:ring-primary/35",
              )}
            >
              <ThemePreview value={value} />
              <span className="flex items-center gap-1.5 px-0.5 pb-0.5">
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 shrink-0",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
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
        className="relative block aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-black/10"
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
      className="relative block aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-black/10"
    >
      <MiniWindow mode={value} />
    </span>
  );
}

function MiniWindow({ mode }: { mode: "light" | "dark" }) {
  const dark = mode === "dark";
  return (
    <span
      className={cn(
        "absolute inset-0 flex gap-[6%] p-[7%]",
        dark ? "bg-[#0b0f17]" : "bg-[#f4f6fa]",
      )}
    >
      <span className="flex w-[22%] flex-col gap-[14%]">
        <span className="h-[10%] w-3/4 rounded-full bg-[#3b82f6]" />
        <span
          className={cn(
            "h-[7%] rounded-full",
            dark ? "bg-white/15" : "bg-black/10",
          )}
        />
        <span
          className={cn(
            "h-[7%] w-5/6 rounded-full",
            dark ? "bg-white/10" : "bg-black/[0.07]",
          )}
        />
        <span
          className={cn(
            "h-[7%] w-2/3 rounded-full",
            dark ? "bg-white/10" : "bg-black/[0.07]",
          )}
        />
      </span>
      <span
        className={cn(
          "flex flex-1 flex-col gap-[10%] rounded-[6px] p-[8%]",
          dark
            ? "bg-[#141a25] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
            : "bg-white shadow-[0_1px_3px_rgb(7_10_15/0.12)]",
        )}
      >
        <span
          className={cn(
            "h-[12%] w-1/2 rounded-full",
            dark ? "bg-white/70" : "bg-[#0b0f17]/75",
          )}
        />
        <span
          className={cn(
            "h-[8%] w-5/6 rounded-full",
            dark ? "bg-white/15" : "bg-black/10",
          )}
        />
        <span className="mt-auto flex h-[34%] items-end gap-[6%]">
          {[45, 70, 55, 90, 65].map((height) => (
            <span
              key={height}
              className="flex-1 rounded-[2px] bg-[#3b82f6]"
              style={{ height: `${height}%`, opacity: 0.35 + height / 160 }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
