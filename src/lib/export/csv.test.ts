import { describe, expect, it } from "vitest";
import { createCsv } from "./csv";

describe("CSV export", () => {
  it("quotes commas and prevents spreadsheet formulas", () => {
    expect(
      createCsv(
        [{ title: '=HYPERLINK("https://bad.test")', notes: "Food, travel" }],
        ["title", "notes"],
      ),
    ).toBe(
      'title,notes\r\n"\'=HYPERLINK(""https://bad.test"")","Food, travel"',
    );
  });

  it("uses stable columns for an empty export", () => {
    expect(createCsv([], ["title", "status"])).toBe("title,status");
  });
});
