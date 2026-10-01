import { describe, expect, it } from "vitest";
import {
  getTaskPriorityBadgeClass,
  getTaskPriorityTone,
} from "@/lib/tasks/priority";

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

describe("task priority tones", () => {
  it.each([
    ["medium", "amber"],
    ["high", "orange"],
    ["critical", "red"],
  ])("rings %s priority in the %s family", (priority, color) => {
    const tone = getTaskPriorityTone(priority);
    expect(tone.ring).toContain(color);
    expect(tone.text).toContain(color);
  });

  it("keeps low and unknown priorities neutral rather than green", () => {
    expect(getTaskPriorityTone("low").ring).toContain("slate");
    expect(getTaskPriorityTone("low").ring).not.toContain("emerald");
    expect(getTaskPriorityTone("unknown")).toEqual(getTaskPriorityTone("low"));
    expect(getTaskPriorityTone("HIGH")).toEqual(getTaskPriorityTone("high"));
  });
});
