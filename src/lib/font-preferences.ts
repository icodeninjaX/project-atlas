export const FONT_STORAGE_KEY = "atlas-font-family:v1";
export const DEFAULT_FONT_PREFERENCE = "geist";

export const FONT_PREFERENCES = [
  {
    value: "roboto",
    label: "Roboto",
    category: "Popular sans",
    description: "Familiar, versatile, and highly readable",
    cssVariable: "--font-roboto",
  },
  {
    value: "open-sans",
    label: "Open Sans",
    category: "Popular sans",
    description: "Friendly and clear at every size",
    cssVariable: "--font-open-sans",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    category: "Popular sans",
    description: "Confident and geometric",
    cssVariable: "--font-montserrat",
  },
  {
    value: "poppins",
    label: "Poppins",
    category: "Popular sans",
    description: "Rounded, modern, and approachable",
    cssVariable: "--font-poppins",
  },
  {
    value: "lato",
    label: "Lato",
    category: "Popular sans",
    description: "Professional with a warm personality",
    cssVariable: "--font-lato",
  },
  {
    value: "noto-sans",
    label: "Noto Sans",
    category: "Popular sans",
    description: "Clean and dependable for long reading",
    cssVariable: "--font-noto-sans",
  },
  {
    value: "nunito-sans",
    label: "Nunito Sans",
    category: "Popular sans",
    description: "Soft, balanced, and friendly",
    cssVariable: "--font-nunito-sans",
  },
  {
    value: "raleway",
    label: "Raleway",
    category: "Popular sans",
    description: "Elegant and distinctive",
    cssVariable: "--font-raleway",
  },
  {
    value: "work-sans",
    label: "Work Sans",
    category: "Popular sans",
    description: "Practical and optimized for screens",
    cssVariable: "--font-work-sans",
  },
  {
    value: "ubuntu",
    label: "Ubuntu",
    category: "Popular sans",
    description: "Humanist, recognizable, and expressive",
    cssVariable: "--font-ubuntu",
  },
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
    category: "Modern sans",
    description: "Open and highly legible",
    cssVariable: "--font-source-sans",
  },
  {
    value: "atkinson",
    label: "Atkinson Hyperlegible",
    category: "Reading & accessibility",
    description: "Accessibility first",
    cssVariable: "--font-atkinson",
  },
  {
    value: "lexend",
    label: "Lexend",
    category: "Reading & accessibility",
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
    value: "playfair-display",
    label: "Playfair Display",
    category: "Serif",
    description: "Sophisticated and high-contrast",
    cssVariable: "--font-playfair-display",
  },
  {
    value: "roboto-slab",
    label: "Roboto Slab",
    category: "Serif",
    description: "Strong, contemporary, and readable",
    cssVariable: "--font-roboto-slab",
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
