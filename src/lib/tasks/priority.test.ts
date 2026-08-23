import { describe, expect, it } from "vitest";
import { getTaskPriorityBadgeClass } from "@/lib/tasks/priority";

describe("task priority badge colors", () => {
  it.each([
    ["low", "emerald"],
    ["medium", "amber"],
    ["high", "orange"],
    ["critical", "red"],
  ])("maps %s priority to the %s severity family", (priority, color) => {
    expect(getTaskPriorityBadgeClass(priority)).toContain(color);
  });

  it("normalizes priority casing and safely styles unknown values", () => {
    expect(getTaskPriorityBadgeClass("CRITICAL")).toContain("red");
    expect(getTaskPriorityBadgeClass("unknown")).toContain(
      "text-muted-foreground",
    );
  });
});
