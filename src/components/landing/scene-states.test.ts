import { describe, expect, it } from "vitest";
import {
  CORE_DOMAINS,
  LANDING_CHAPTERS,
  ROUTE_STOPS,
  SCENE_STATES,
  chapterBlend,
  resolveChapterBlend,
} from "./scene-states";

const anchors = [
  { chapter: "hero", scrollY: 0 },
  { chapter: "fracture", scrollY: 1000 },
  { chapter: "money", scrollY: 2000 },
] as const;

describe("landing scene choreography", () => {
  it("defines a state for every chapter and a route stop per domain", () => {
    for (const chapter of LANDING_CHAPTERS) {
      expect(SCENE_STATES[chapter]).toBeDefined();
    }
    expect(ROUTE_STOPS).toHaveLength(CORE_DOMAINS.length);
    const focused = [
      "money",
      "tasks",
      "goals",
      "career",
      "reflection",
    ] as const;
    focused.forEach((chapter, index) => {
      expect(SCENE_STATES[chapter]).toMatchObject({
        layout: "focus",
        focus: index,
      });
    });
  });

  it("holds each chapter's state near its anchor and eases between them", () => {
    expect(chapterBlend(0)).toBe(0);
    expect(chapterBlend(0.15)).toBe(0);
    expect(chapterBlend(0.5)).toBeCloseTo(0.5);
    expect(chapterBlend(0.85)).toBe(1);
    expect(chapterBlend(1.4)).toBe(1);
    expect(chapterBlend(0.3)).toBeLessThan(chapterBlend(0.4));
  });

  it("resolves the surrounding chapters for a scroll position", () => {
    expect(resolveChapterBlend(anchors, -50)).toEqual({
      from: "hero",
      to: "hero",
      weight: 0,
    });
    expect(resolveChapterBlend(anchors, 1500)).toMatchObject({
      from: "fracture",
      to: "money",
    });
    expect(resolveChapterBlend(anchors, 1500).weight).toBeCloseTo(0.5);
    expect(resolveChapterBlend(anchors, 9000)).toEqual({
      from: "money",
      to: "money",
      weight: 0,
    });
    expect(resolveChapterBlend([], 100)).toEqual({
      from: "hero",
      to: "hero",
      weight: 0,
    });
  });
});
