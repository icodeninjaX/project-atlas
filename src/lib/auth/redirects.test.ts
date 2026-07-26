import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirects";

describe("safe redirect paths", () => {
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
