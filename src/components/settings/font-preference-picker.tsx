"use client";

import { RotateCcw, Type } from "lucide-react";
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
const FONT_CATEGORIES = [
  "Popular sans",
  "Modern sans",
  "Reading & accessibility",
  "Serif",
  "Monospace",
] as const;
const FONT_GROUPS = FONT_CATEGORIES.map((label) => ({
  label,
  fonts: FONT_PREFERENCES.filter((font) => font.category === label),
}));

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

      <label
        htmlFor="app-font-preference"
        className="mt-4 block text-xs font-semibold"
      >
        Font family
      </label>
      <select
        id="app-font-preference"
        value={selectedFont}
        onChange={(event) => {
          if (isFontPreference(event.target.value)) {
            applyFont(event.target.value);
          }
        }}
        className="border-border bg-background focus-visible:ring-ring mt-2 min-h-11 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.fonts.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div
        aria-live="polite"
        className="border-border bg-muted/40 mt-3 flex items-center gap-3 rounded-xl border p-3"
        style={{ fontFamily: `var(${selected.cssVariable})` }}
      >
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg text-base font-semibold">
          Aa
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">
            {selected.label} · Plan clearly, move intentionally.
          </span>
          <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
            {selected.description}
          </span>
        </span>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Applies instantly throughout ATLAS and stays selected on this browser.
        Code, amounts, and keyboard shortcuts keep their fixed-width font for
        clarity.
      </p>
    </div>
  );
}
