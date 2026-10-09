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

  it("neutralizes tab and carriage-return formula prefixes", () => {
    expect(createCsv([{ a: "\t=1+1", b: "\r=1+1" }], ["a", "b"])).toBe(
      "a,b\r\n'\t=1+1,\"'\r=1+1\"",
    );
  });

  it("uses stable columns for an empty export", () => {
    expect(createCsv([], ["title", "status"])).toBe("title,status");
  });

  it("serializes activity metadata as JSON instead of a generic object label", () => {
    expect(
      createCsv(
        [{ metadata: { from: "applied", to: "interview" } }],
        ["metadata"],
      ),
    ).toBe(
      'metadata\r\n"{\"\"from\"\":\"\"applied\"\",\"\"to\"\":\"\"interview\"\"}"',
    );
  });
});
