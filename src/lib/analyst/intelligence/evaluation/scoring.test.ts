import { describe, expect, it } from "vitest";
import { EVALUATION_CORPUS, type EvalCase } from "./corpus";
import { EXPECTED_FACTS } from "./expected";
import { OWNER_A, OWNER_B } from "./fixtures";
import { scoreRun, summarizeScores, type ObservedRun } from "./scoring";

const find = (id: string) => EVALUATION_CORPUS.find((item) => item.id === id)!;

const run = (item: EvalCase, overrides: Partial<ObservedRun> = {}) =>
  ({
    caseId: item.id,
    implementation: "v2",
    model: { requested: "model-a", resolved: "model-a" },
    status: "answered",
    text: "Recorded expenses were ₱11,000.00 for 2026-09-01 to 2026-09-24.",
    claims: [
      {
        text: "Recorded expenses were ₱11,000.00.",
        requirementIds: item.requirements.map((req) => req.id),
        verified: true,
      },
    ],
    facts: Object.fromEntries(
      item.requiredFacts.map((key) => [key, EXPECTED_FACTS[key]!.value]),
    ),
    unresolvedRequirementIds: [],
    toolCalls: ["getMoneySummary"],
    modelCalls: 2,
    ownerIdsTouched: [item.owner],
    ...overrides,
  }) satisfies ObservedRun;

describe("Analyst evaluation scoring", () => {
  it("passes a complete, correct, in-scope answer", () => {
    const score = scoreRun(find("Q01"), run(find("Q01")));
    expect(score.deterministicPass).toBe(true);
    expect(score.dimensions.fact_accuracy).toBe("passed");
    expect(score.dimensions.evidence_relevance).toBe("needs_review");
  });

  it("fails a correct-looking value for the wrong period", () => {
    const score = scoreRun(
      find("Q02"),
      run(find("Q02"), {
        facts: {
          "expense.current": 1_100_000,
          "expense.previous_aligned":
            EXPECTED_FACTS["expense.previous_full_month"]!.value,
          "expense.change": 190_000,
        },
      }),
    );
    expect(score.checks.facts.mismatched).toEqual(["expense.previous_aligned"]);
    expect(score.failureCategories).toContain("wrong_entity");
  });

  it("accepts a partial answer only when it names what is unresolved", () => {
    const item = find("Q57");
    const claims = [
      {
        text: "Recorded expenses were ₱11,000.00.",
        requirementIds: ["total"],
        verified: true,
      },
    ];
    const silent = scoreRun(
      item,
      run(item, { status: "partial_answer", claims }),
    );
    expect(silent.dimensions.question_coverage).toBe("failed");
    const explained = scoreRun(
      item,
      run(item, {
        status: "partial_answer",
        claims,
        unresolvedRequirementIds: ["category"],
      }),
    );
    expect(explained.dimensions.question_coverage).toBe("passed");
    expect(explained.hardGateFailures).toEqual([]);
  });

  it("makes cross-owner reads and security violations hard-gate failures", () => {
    const item = find("Q51");
    const score = scoreRun(
      item,
      run(item, {
        status: "insufficient_evidence",
        text: "Linked tasks include Update resume.",
        ownerIdsTouched: [OWNER_B, OWNER_A],
      }),
    );
    expect(score.hardGateFailures).toEqual(
      expect.arrayContaining(["owner_isolation", "security_forbidden_claim"]),
    );
    expect(score.dimensions.scope_integrity).toBe("failed");
  });

  it("classifies excessive clarification and budget overruns", () => {
    const item = find("Q01");
    const score = scoreRun(
      item,
      run(item, {
        status: "clarification_required",
        toolCalls: ["a", "b", "c", "d"],
      }),
    );
    expect(score.failureCategories).toContain("excessive_clarification");
    expect(score.dimensions.efficiency).toBe("failed");
  });

  it("summarizes rates without averaging hard gates away", () => {
    const cases = [find("Q01"), find("Q39"), find("Q51")];
    const scores = [
      scoreRun(cases[0]!, run(cases[0]!)),
      scoreRun(cases[1]!, run(cases[1]!)),
      scoreRun(
        cases[2]!,
        run(cases[2]!, { status: "error", ownerIdsTouched: [OWNER_A] }),
      ),
    ];
    const summary = summarizeScores(cases, scores);
    expect(summary.rates.conversationContinuity).toBe(1);
    expect(summary.hardGateFailures).toEqual(["Q51:owner_isolation"]);
    expect(summary.meetsDeterministicTargets).toBe(false);
  });

  it("refuses to score a run against a different case", () => {
    expect(() => scoreRun(find("Q01"), run(find("Q02")))).toThrow();
  });
});
