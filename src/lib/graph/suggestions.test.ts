import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  goalKeywords,
  rankGoalSuggestions,
  type SuggestionCandidate,
} from "./suggestions";

function candidate(
  type: SuggestionCandidate["summary"]["type"],
  id: string,
  title: string,
  extra = "",
): SuggestionCandidate {
  return {
    summary: { type, id, title, subtitle: null, href: `/${type}/${id}` },
    text: `${title} ${extra}`,
  };
}

describe("Graph link suggestions", () => {
  it("keeps meaningful, filter-safe keywords", () => {
    expect(extractKeywords("Pay off the Car Loans by 2027!")).toEqual([
      "pay",
      "car",
      "loan",
    ]);
    expect(extractKeywords("Pass the class")).toEqual(["pass", "class"]);
    expect(
      goalKeywords({
        title: "Land a frontend job",
        description: "Strong React portfolio",
        success_definition: null,
      }),
    ).toEqual(["land", "frontend", "job", "strong", "react", "portfolio"]);
  });

  it("ranks shared keywords above area matches and explains each", () => {
    const ranked = rankGoalSuggestions(
      { title: "Pay off car loan", area: "finance" },
      [
        candidate("debt", "credit", "BPI Credit Card"),
        candidate("transaction", "tx", "Toyota", "car loan payment"),
        candidate("debt", "car", "Car loan", "auto loan"),
        candidate("knowledge_concept", "k", "TypeScript generics"),
      ],
      new Set(),
    );
    expect(ranked.map((item) => item.item.id)).toEqual(["car", "tx", "credit"]);
    expect(ranked[0]?.reason).toBe("Mentions “car”, “loan”");
    expect(ranked[2]?.reason).toBe("Same area as this goal");
  });

  it("skips linked, dismissed and duplicate records and respects the limit", () => {
    const records = [
      candidate("knowledge_concept", "a", "React hooks"),
      candidate("knowledge_concept", "a", "React hooks"),
      candidate("knowledge_concept", "b", "React server components"),
      candidate("knowledge_concept", "c", "React testing"),
    ];
    const ranked = rankGoalSuggestions(
      { title: "Learn React", area: "personal" },
      records,
      new Set(["knowledge_concept:b"]),
      1,
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.item.id).toBe("a");
    expect(
      rankGoalSuggestions(
        { title: "Learn React" },
        records,
        new Set([
          "knowledge_concept:a",
          "knowledge_concept:b",
          "knowledge_concept:c",
        ]),
      ),
    ).toEqual([]);
  });
});
