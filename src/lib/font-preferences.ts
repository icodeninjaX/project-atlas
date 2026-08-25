export const FONT_STORAGE_KEY = "atlas-font-family:v1";
export const DEFAULT_FONT_PREFERENCE = "geist";

export const FONT_PREFERENCES = [
  {
    value: "geist",
    label: "Geist",
    category: "Modern sans",
    description: "Balanced and precise",
    cssVariable: "--font-geist-sans",
  },
  {
    value: "inter",
    label: "Inter",
    category: "Modern sans",
    description: "Neutral and familiar",
    cssVariable: "--font-inter",
  },
  {
    value: "manrope",
    label: "Manrope",
    category: "Modern sans",
    description: "Geometric and polished",
    cssVariable: "--font-manrope",
  },
  {
    value: "dm-sans",
    label: "DM Sans",
    category: "Modern sans",
    description: "Warm and friendly",
    cssVariable: "--font-dm-sans",
  },
  {
    value: "source-sans",
    label: "Source Sans 3",
    category: "Reading",
    description: "Open and highly legible",
    cssVariable: "--font-source-sans",
  },
  {
    value: "atkinson",
    label: "Atkinson Hyperlegible",
    category: "Reading",
    description: "Accessibility first",
    cssVariable: "--font-atkinson",
  },
  {
    value: "lexend",
    label: "Lexend",
    category: "Reading",
    description: "Relaxed reading rhythm",
    cssVariable: "--font-lexend",
  },
  {
    value: "space-grotesk",
    label: "Space Grotesk",
    category: "Modern sans",
    description: "Expressive and technical",
    cssVariable: "--font-space-grotesk",
  },
  {
    value: "lora",
    label: "Lora",
    category: "Serif",
    description: "Editorial and contemporary",
    cssVariable: "--font-lora",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    category: "Serif",
    description: "Classic and comfortable",
    cssVariable: "--font-merriweather",
  },
  {
    value: "roboto-mono",
    label: "Roboto Mono",
    category: "Monospace",
    description: "Focused and structured",
    cssVariable: "--font-roboto-mono",
  },
] as const;

export type FontPreference = (typeof FONT_PREFERENCES)[number]["value"];

export function isFontPreference(
  value: string | null,
): value is FontPreference {
  return FONT_PREFERENCES.some((font) => font.value === value);
}
