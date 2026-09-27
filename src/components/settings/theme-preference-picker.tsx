"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

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
        className="grid grid-cols-3 gap-2"
      >
        {themes.map(({ value, label, icon: Icon }) => {
          const selected = selectedTheme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(value)}
              className={`focus-visible:ring-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
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
