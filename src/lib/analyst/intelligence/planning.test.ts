import { describe, expect, it } from "vitest";
import { asksMoneyRanking, deterministicBrief } from "./planning";

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
    expect(capabilities("How are my goals going?")).toEqual([
      ["goal.overview"],
    ]);
    // Ranking unnamed goals is unsupported: the overview and task focus are
    // context and cannot answer which goal to prioritize.
    const brief = deterministicBrief({
      question: "Which of my goals should get my limited attention this week?",
      plan: null,
      now,
    });
    expect(
      brief.requirements.map(({ evidenceNeeded, essential }) => [
        evidenceNeeded,
        essential,
      ]),
    ).toEqual([
      [["goal.ranking"], true],
      [["goal.overview", "task.ranking"], false],
    ]);
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

  it("records a one-time payoff as unsupported", () => {
    expect(
      capabilities(
        "What if I pay off my card with a one-time ₱40,000 payment?",
      ),
    ).toEqual([["debt.one_time_payoff"]]);
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

describe("money ranking questions", () => {
  it("asks for the category ranking, not the total", () => {
    expect(capabilities("Where do you think I overspend the most?")).toEqual([
      ["money.category_ranking"],
    ]);
    expect(capabilities("What is my biggest expense category?")).toEqual([
      ["money.category_ranking"],
    ]);
    expect(
      deterministicBrief({
        question: "Where do I spend the most?",
        plan: null,
        now,
      }).requirements[0]?.question,
    ).toMatch(/categories hold the most/);
  });

  it("leaves totals, changes and single days alone", () => {
    expect(asksMoneyRanking("How much did I spend this month?", "lookup")).toBe(
      false,
    );
    expect(asksMoneyRanking("Which day did I spend the most?", "lookup")).toBe(
      false,
    );
    expect(
      asksMoneyRanking("Which category increased the most?", "explain_change"),
    ).toBe(false);
  });
});
