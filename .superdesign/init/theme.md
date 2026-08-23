# Theme and Design Tokens

## Compact token summary

- Framework: Tailwind CSS 4 through `@import "tailwindcss"`; no `tailwind.config.*` file.
- Fonts: Geist Sans for UI, Geist Mono for money, dates, labels, and compact metadata.
- Type scale in use: 10–11px metadata, 12px supporting copy, 14px default UI copy, 16–18px body/lead, 24–36px application headings, 48–72px landing hero.
- Shape: 8px compact controls; 12px buttons, inputs, and icon wells; 16px cards; 28px landing preview.
- Spacing: Tailwind default scale, commonly 4/8/12/16/20/24/32px. Mobile page gutter 12–16px; `sm` 24px; `lg` 32px.
- Touch targets: shared inputs are at least 44px, standard buttons 40px, large buttons 48px; mobile navigation items are 68px tall.
- Layout breakpoints: Tailwind defaults (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px).
- Elevation: cards primarily use borders rather than shadows; landing preview uses `shadow-2xl`; mobile chrome uses translucent background plus backdrop blur.
- Light palette: background `#f4f7fb`, foreground `#111827`, card `#ffffff`, primary `#2867e8`, muted foreground `#5f6b7d`, border `#dce3ed`.
- Dark palette: background `#070a0f`, foreground `#f4f7fb`, card `#0e131c`, primary `#84afff`, muted foreground `#8d99aa`, border `#202a39`.
- Motion: simple color transitions; all animation and transition durations collapse under `prefers-reduced-motion`.
- Safe areas: authenticated content and bottom nav include `env(safe-area-inset-bottom)`.

## Raw source: `src/app/globals.css`

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --color-destructive: var(--destructive);
  --color-sidebar: var(--sidebar);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  color-scheme: light;
  --background: #f4f7fb;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --primary: #2867e8;
  --primary-foreground: #ffffff;
  --secondary: #edf2f9;
  --secondary-foreground: #182131;
  --muted: #e9eef6;
  --muted-foreground: #5f6b7d;
  --border: #dce3ed;
  --ring: #3977f6;
  --destructive: #c83a4a;
  --sidebar: #f9fbfe;
}

.dark {
  color-scheme: dark;
  --background: #070a0f;
  --foreground: #f4f7fb;
  --card: #0e131c;
  --card-foreground: #f4f7fb;
  --primary: #84afff;
  --primary-foreground: #070a0f;
  --secondary: #151d2a;
  --secondary-foreground: #f4f7fb;
  --muted: #182131;
  --muted-foreground: #8d99aa;
  --border: #202a39;
  --ring: #84afff;
  --destructive: #e04f5f;
  --sidebar: #0a0e15;
}

* {
  border-color: var(--border);
}

html {
  background: var(--background);
}

body {
  min-height: 100dvh;
  background: var(--background);
  color: var(--foreground);
  text-rendering: optimizeLegibility;
}

::selection {
  background: color-mix(in srgb, var(--primary) 35%, transparent);
}

.atlas-grid {
  background-image:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--border) 55%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--border) 55%, transparent) 1px,
      transparent 1px
    );
  background-size: 32px 32px;
  mask-image: linear-gradient(to bottom, black 20%, transparent 90%);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

## Theme provider: `src/components/atlas/theme-provider.tsx`

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return <NextThemesProvider {...props} />;
}
```
