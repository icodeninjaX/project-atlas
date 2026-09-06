import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  getPhilippineAccountProvider,
  isPhilippineAccountProviderId,
  matchPhilippineAccountProvider,
  PHILIPPINE_ACCOUNT_PROVIDERS,
} from "./ph-account-providers";

describe("Philippine account providers", () => {
  it("keeps stable unique IDs for the Wave 1 catalog", () => {
    const ids = PHILIPPINE_ACCOUNT_PROVIDERS.map((provider) => provider.id);

    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves providers by stable ID", () => {
    expect(getPhilippineAccountProvider("bpi")?.legalName).toBe(
      "Bank of the Philippine Islands",
    );
    expect(getPhilippineAccountProvider(null)).toBeNull();
    expect(getPhilippineAccountProvider("custom-bank")).toBeNull();
    expect(isPhilippineAccountProviderId("gcash")).toBe(true);
    expect(isPhilippineAccountProviderId("custom-bank")).toBe(false);
  });

  it("matches exact normalized display, legal, and alias names", () => {
    expect(matchPhilippineAccountProvider("  G-Cash ")?.id).toBe("gcash");
    expect(
      matchPhilippineAccountProvider("Bank of the Philippine Islands")?.id,
    ).toBe("bpi");
    expect(matchPhilippineAccountProvider("PayMaya")?.id).toBe("maya");
  });

  it("does not guess from partial or unknown names", () => {
    expect(matchPhilippineAccountProvider("My BPI Payroll")).toBeNull();
    expect(matchPhilippineAccountProvider("Unknown Wallet")).toBeNull();
  });

  it("references a valid local PNG for every ready icon", () => {
    const ready = PHILIPPINE_ACCOUNT_PROVIDERS.filter(
      (provider) => provider.iconStatus === "ready",
    );

    expect(ready).toHaveLength(PHILIPPINE_ACCOUNT_PROVIDERS.length);

    for (const provider of ready) {
      expect(provider.iconPath, provider.id).not.toBeNull();
      const relativePath = provider.iconPath!.replace(/^\//, "");
      const absolutePath = path.join(process.cwd(), "public", relativePath);

      expect(existsSync(absolutePath), provider.id).toBe(true);
      const icon = readFileSync(absolutePath);
      expect(icon.subarray(0, 8), `${provider.id} must be a PNG`).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(icon.readUInt32BE(16), `${provider.id} width`).toBe(256);
      expect(icon.readUInt32BE(20), `${provider.id} height`).toBe(256);
    }
  });
});
