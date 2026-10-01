import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirects";

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
