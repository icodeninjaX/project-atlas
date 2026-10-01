import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPE_DETAILS } from "./account-types";
import { PHILIPPINE_ACCOUNT_PROVIDERS } from "./ph-account-providers";
import {
  contrastRatio,
  mixHex,
  WALLET_MUTED_TEXT_ALPHA,
  walletSurface,
} from "./wallet-colors";

describe("walletSurface", () => {
  const brandColors = [
    ...PHILIPPINE_ACCOUNT_PROVIDERS.map((provider) => provider.brandColor),
    ...Object.values(ACCOUNT_TYPE_DETAILS).map((type) => type.cardColor),
  ];

  it.each(brandColors)(
    "keeps secondary card text readable on %s",
    (brandColor) => {
      const surface = walletSurface(brandColor);
      const mutedText = mixHex(
        surface.highlight,
        "#ffffff",
        WALLET_MUTED_TEXT_ALPHA,
      );

      expect(contrastRatio("#ffffff", surface.highlight)).toBeGreaterThan(4.5);
      expect(
        contrastRatio(mutedText, surface.highlight),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("leaves an already deep brand color untouched", () => {
    expect(walletSurface("#003F87").base).toBe("#003f87");
  });

  it("deepens a pale brand color instead of switching to dark text", () => {
    const surface = walletSurface("#9FE870");

    expect(surface.base).not.toBe("#9fe870");
    expect(contrastRatio("#ffffff", surface.base)).toBeGreaterThan(4.5);
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
