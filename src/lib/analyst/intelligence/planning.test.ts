import { describe, expect, it } from "vitest";
import { deterministicBrief } from "./planning";

const now = new Date("2026-09-24T04:00:00.000Z");
const capabilities = (question: string) =>
  deterministicBrief({ question, plan: null, now }).requirements.map(
    (item) => item.evidenceNeeded,
  );

/**
 * Capability routing for whole-domain questions: they go to the existing
 * aggregate tools instead of a name lookup that cannot match a sentence.
 */
describe("deterministic brief capability routing", () => {
  it("reads goals and tasks as a whole when none is named", () => {
    expect(
      capabilities(
        "Which of my goals should get my limited attention this week?",
      ),
    ).toEqual([["goal.overview", "task.ranking"]]);
    expect(capabilities("Which task should I do first?")).toEqual([
      ["task.ranking"],
    ]);
  });

  it("keeps a named goal's own context", () => {
    expect(
      capabilities("How is my Land a developer job goal going this month?"),
    ).toContainEqual(["goal.linked_activity"]);
  });

  it("answers an explicit payment scenario with the runway engine", () => {
    const brief = deterministicBrief({
      question:
        "Compare paying an extra ₱2,000 monthly versus ₱4,000 monthly on my Synthetic Card debt.",
      plan: null,
      now,
    });
    expect(brief.requirements.map((item) => item.evidenceNeeded)).toEqual([
      ["debt.scenario"],
    ]);
  });

  it("treats a decision about studying as a decision, not knowledge", () => {
    for (const question of [
      "What changed after my decision to study part-time?",
      "Was studying part-time the right call?",
    ])
      expect(capabilities(question)).toEqual([["decision.context"]]);
    expect(
      deterministicBrief({
        question: "What changed after my decision to study part-time?",
        plan: null,
        now,
      }).unresolvedReferences,
    ).toEqual(["study part-time"]);
  });

  it("recognizes signals and cash questions", () => {
    expect(
      capabilities(
        "My overdue signal and my overdue interview task both say I'm behind. How strong is that evidence?",
      ),
    ).toContainEqual(["signals.current"]);
    expect(
      capabilities(
        "How has my available cash changed while I pay down my card?",
      ).flat(),
    ).toEqual(expect.arrayContaining(["money.totals", "debt.payments"]));
  });
});
