import { describe, expect, it } from "vitest";
import { pathWithNext, safeRedirectPath } from "./redirects";

describe("safe redirect paths", () => {
  it.each([
    "/\t/attacker.invalid",
    "/\n/attacker.invalid",
    "/\r/attacker.invalid",
    "/a/..//attacker.invalid",
    "/\\attacker.invalid",
    "/\u0000/attacker.invalid",
  ])("rejects normalized external destination %j", (path) => {
    const destination = safeRedirectPath(path, "/dashboard");
    expect(destination).toBe("/dashboard");
    expect(new URL(destination, "https://atlas.invalid").origin).toBe(
      "https://atlas.invalid",
    );
  });
  it("preserves encoded local routes, query strings and fragments", () => {
    expect(safeRedirectPath("/tasks?q=hello%20world#today", "/dashboard")).toBe(
      "/tasks?q=hello%20world#today",
    );
  });
  it("accepts a local application path", () => {
    expect(safeRedirectPath("/dashboard?welcome=true", "/dashboard")).toBe(
      "/dashboard?welcome=true",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeRedirectPath("https://example.com", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("//example.com", "/dashboard")).toBe("/dashboard");
  });
});

describe("pathWithNext", () => {
  it("attaches an encoded local destination", () => {
    expect(pathWithNext("/onboarding", "/tasks?view=today#top")).toBe(
      "/onboarding?next=%2Ftasks%3Fview%3Dtoday%23top",
    );
  });

  it.each([null, undefined, "", "https://attacker.invalid", "//attacker"])(
    "drops a missing or unsafe destination %j",
    (next) => {
      expect(pathWithNext("/signup", next)).toBe("/signup");
    },
  );

  it("drops a destination that is the page itself", () => {
    expect(pathWithNext("/onboarding", "/onboarding?step=2")).toBe(
      "/onboarding",
    );
  });

  it("round-trips through a callback's next parameter", () => {
    const callback = new URL(
      `https://atlas.invalid/auth/callback?next=${encodeURIComponent(
        pathWithNext("/reset-password", "/money/budget?month=2026-10"),
      )}`,
    );
    const landing = new URL(
      safeRedirectPath(callback.searchParams.get("next"), "/dashboard"),
      "https://atlas.invalid",
    );
    expect(landing.pathname).toBe("/reset-password");
    expect(landing.searchParams.get("next")).toBe(
      "/money/budget?month=2026-10",
    );
  });
});
