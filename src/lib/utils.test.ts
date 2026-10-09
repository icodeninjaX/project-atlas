import { describe, expect, it } from "vitest";
import { safeExternalHref } from "./utils";

describe("safeExternalHref", () => {
  it("keeps http and https links", () => {
    expect(safeExternalHref("https://jobs.example.test/42")).toBe(
      "https://jobs.example.test/42",
    );
    expect(safeExternalHref("http://jobs.example.test")).toBe(
      "http://jobs.example.test",
    );
  });

  it("drops script, data, relative, and empty links", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref(" JavaScript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<b>x</b>")).toBeNull();
    expect(safeExternalHref("/dashboard")).toBeNull();
    expect(safeExternalHref("")).toBeNull();
    expect(safeExternalHref(null)).toBeNull();
  });
});
