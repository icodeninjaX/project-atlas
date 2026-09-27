import { describe, expect, it } from "vitest";
import {
  ALL_FOLLOW_UPS,
  FOLLOW_UP_LIMITS,
  suggestFollowUps,
} from "./suggestions";

describe("follow-up suggestions", () => {
  it("are short questions without recorded figures or dates", () => {
    for (const text of ALL_FOLLOW_UPS) {
      expect(text.length).toBeLessThanOrEqual(FOLLOW_UP_LIMITS.chars);
      expect(text).toMatch(/\?$/);
      // Only a stated what-if percentage, never an amount or date.
      expect(text.replace(/^What if .* by \d{1,2}%\?$/, "")).not.toMatch(
        /\d|₱|peso/i,
      );
      // No literal IDs, which the planner would need clarified.
      expect(text).not.toMatch(/\bthese\b|\bthis goal\b/i);
    }
  });
  it("follow the tools used and alternate between domains", () => {
    expect(
      suggestFollowUps({
        question: "How did my spending compare to my income last month?",
        calls: [{ tool: "getMoneySummary", input: { kind: "expense" } }],
      }),
    ).toEqual([
      "How does this compare to last month?",
      "How has my spending changed over the last six months?",
      "What needs my attention across money and goals?",
    ]);
    expect(
      suggestFollowUps({
        question: "What needs attention?",
        calls: [
          { tool: "getTaskFocus", input: {} },
          { tool: "getRunway", input: {} },
        ],
      }).slice(0, 2),
    ).toEqual([
      "How many tasks did I complete each week this month?",
      "What if my monthly income falls by 20%?",
    ]);
  });
  it("skips the question just asked and earlier ones", () => {
    const suggestions = suggestFollowUps({
      question: "what if my monthly income falls by 20%",
      history: [{ question: "What does my current runway look like?" }],
      calls: [{ tool: "getRunway", input: {} }],
    });
    expect(suggestions).not.toContain(
      "What if my monthly income falls by 20%?",
    );
    expect(suggestions).not.toContain("What does my current runway look like?");
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });
  it("offers general questions when no tool ran", () => {
    expect(suggestFollowUps({ question: "Anything?", calls: [] })).toHaveLength(
      3,
    );
  });
});
