"use client";

import { Check, RotateCcw, Type } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_FONT_PREFERENCE,
  FONT_PREFERENCES,
  FONT_STORAGE_KEY,
  isFontPreference,
  type FontPreference,
} from "@/lib/font-preferences";

const FONT_CHANGE_EVENT = "atlas-font-change";

function getAppliedFont(): FontPreference {
  if (typeof document === "undefined") return DEFAULT_FONT_PREFERENCE;

  const applied = document.documentElement.dataset.font ?? null;
  return isFontPreference(applied) ? applied : DEFAULT_FONT_PREFERENCE;
}

function subscribeToFontPreference(onStoreChange: () => void) {
  function syncAcrossTabs(event: StorageEvent) {
    if (event.key !== FONT_STORAGE_KEY) return;
    document.documentElement.dataset.font = isFontPreference(event.newValue)
      ? event.newValue
      : DEFAULT_FONT_PREFERENCE;
    onStoreChange();
  }

  window.addEventListener("storage", syncAcrossTabs);
  window.addEventListener(FONT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", syncAcrossTabs);
    window.removeEventListener(FONT_CHANGE_EVENT, onStoreChange);
  };
}

export function FontPreferencePicker() {
  const selectedFont = useSyncExternalStore(
    subscribeToFontPreference,
    getAppliedFont,
    () => DEFAULT_FONT_PREFERENCE,
  );

  const selected =
    FONT_PREFERENCES.find((font) => font.value === selectedFont) ??
    FONT_PREFERENCES[0];

  function applyFont(font: FontPreference) {
    document.documentElement.dataset.font = font;

    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, font);
    } catch {
      // The preference still applies for this session when storage is blocked.
    }

    window.dispatchEvent(new Event(FONT_CHANGE_EVENT));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Type className="text-primary size-4" aria-hidden="true" />
            <h3 className="text-sm font-semibold">App font</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Choose one typeface for navigation, pages, forms, and cards.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={selectedFont === DEFAULT_FONT_PREFERENCE}
          onClick={() => applyFont(DEFAULT_FONT_PREFERENCE)}
          className="self-start"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset font
        </Button>
      </div>

      <div
        aria-live="polite"
        className="border-primary/20 bg-primary/5 relative mt-4 overflow-hidden rounded-2xl border p-4 sm:p-5"
        style={{ fontFamily: `var(${selected.cssVariable})` }}
      >
        <div className="bg-primary/10 text-primary absolute top-3 right-3 grid size-10 place-items-center rounded-xl text-lg font-semibold sm:top-4 sm:right-4">
          Aa
        </div>
        <p className="text-primary text-[11px] font-semibold tracking-[0.16em] uppercase">
          Live preview · {selected.label}
        </p>
        <p className="mt-3 max-w-xl pr-12 text-lg leading-7 font-semibold tracking-tight sm:text-xl">
          Plan clearly. Spend intentionally. Move what matters forward.
        </p>
        <p className="text-muted-foreground mt-2 max-w-xl text-xs leading-5">
          Today, you have 4 priorities and one meaningful next step.
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Choose an app font</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_PREFERENCES.map((font) => {
            const isSelected = selectedFont === font.value;

            return (
              <label
                key={font.value}
                className={`focus-within:ring-ring relative flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:outline-none sm:p-4 ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/60"
                }`}
                style={{ fontFamily: `var(${font.cssVariable})` }}
              >
                <input
                  type="radio"
                  name="app-font"
                  value={font.value}
                  checked={isSelected}
                  onChange={() => applyFont(font.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-base font-semibold ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {isSelected ? <Check className="size-4" /> : "Aa"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold">{font.label}</span>
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      {font.category}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">
                    {font.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Applies instantly throughout ATLAS and stays selected on this browser.
        Code, amounts, and keyboard shortcuts keep their fixed-width font for
        clarity.
      </p>
    </div>
  );
}
