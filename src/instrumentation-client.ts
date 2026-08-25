import {
  DEFAULT_FONT_PREFERENCE,
  FONT_STORAGE_KEY,
  isFontPreference,
} from "@/lib/font-preferences";

try {
  const storedFont = window.localStorage.getItem(FONT_STORAGE_KEY);
  document.documentElement.dataset.font = isFontPreference(storedFont)
    ? storedFont
    : DEFAULT_FONT_PREFERENCE;
} catch {
  document.documentElement.dataset.font = DEFAULT_FONT_PREFERENCE;
}
