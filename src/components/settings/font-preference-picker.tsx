"use client";

import { RotateCcw, Type } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  fieldHelpClass,
  fieldLabelClass,
  selectClass,
} from "@/components/settings/settings-chrome";
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
          className="shrink-0"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset font
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-stretch">
        <div className="space-y-1.5">
          <label htmlFor="app-font-preference" className={fieldLabelClass}>
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
            className={selectClass}
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
          <p className={fieldHelpClass}>
            {FONT_PREFERENCES.length} typefaces in {FONT_CATEGORIES.length}{" "}
            families.
          </p>
        </div>

        <div
          aria-live="polite"
          className="bg-background/55 ring-border/80 relative overflow-hidden rounded-2xl p-4 ring-1 sm:p-5"
          style={{ fontFamily: `var(${selected.cssVariable})` }}
        >
          <span
            aria-hidden="true"
            className="text-primary/[0.09] pointer-events-none absolute -top-6 -right-1 text-[7.5rem] leading-none font-semibold tracking-[-0.06em] select-none"
          >
            Aa
          </span>
          <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {selected.category}
          </p>
          <p className="relative mt-2 text-xl leading-7 font-semibold tracking-[-0.02em] text-balance">
            {selected.label} · Plan clearly, move intentionally.
          </p>
          <p className="text-muted-foreground relative mt-1.5 text-xs leading-5">
            {selected.description}
          </p>
          <p
            aria-hidden="true"
            className="text-muted-foreground/80 relative mt-3 truncate text-sm tracking-wide"
          >
            ABCDEFGHIJ abcdefghij 0123456789
          </p>
        </div>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Applies instantly throughout ATLAS and stays selected on this browser.
        Code, amounts, and keyboard shortcuts keep their fixed-width font for
        clarity.
      </p>
    </div>
  );
}
