type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Mixes `amount` (0–1) of `target` into `hex`. */
export function mixHex(hex: string, target: string, amount: number): string {
  const from = parseHex(hex);
  const to = parseHex(target);
  return toHex([
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ]);
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2 contrast ratio between two opaque colors. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((left, right) => right - left) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

export type WalletSurface = {
  /** Mid-tone of the card gradient. */
  base: string;
  /** Lightest stop, where the account name sits. */
  highlight: string;
  /** Darkest stop, also used for the card's colored shadow. */
  shadow: string;
};

/** Secondary card text is white at 85% opacity. */
export const WALLET_MUTED_TEXT_ALPHA = 0.85;
const HIGHLIGHT_LIFT = 0.12;
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Turns a brand color into a card gradient that white text can sit on.
 *
 * Brand colors range from deep navy to pale mint, so the color is deepened
 * in small steps until even the lightest stop keeps 85%-white secondary text
 * at WCAG AA (4.5:1). Deep brands pass unchanged; pale ones become a richer
 * shade of the same hue.
 */
export function walletSurface(brandHex: string): WalletSurface {
  let base = mixHex(brandHex, "#000000", 0);
  for (let step = 1; step <= 24; step += 1) {
    const highlight = mixHex(base, "#ffffff", HIGHLIGHT_LIFT);
    const mutedText = mixHex(highlight, "#ffffff", WALLET_MUTED_TEXT_ALPHA);
    if (contrastRatio(mutedText, highlight) >= MIN_TEXT_CONTRAST) break;
    base = mixHex(brandHex, "#000000", step * 0.035);
  }

  return {
    base,
    highlight: mixHex(base, "#ffffff", HIGHLIGHT_LIFT),
    shadow: mixHex(base, "#000000", 0.42),
  };
}
