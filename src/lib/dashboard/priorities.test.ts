import { describe, expect, it } from "vitest";
import { selectDailyPriorities } from "./priorities";

describe("daily priority rules", () => {
  it("returns at most three items in deterministic urgency order", () => {
    const result = selectDailyPriorities([
      { id: "goal", kind: "goal", urgency: 2, title: "Finish portfolio" },
      { id: "career", kind: "career", urgency: 2, title: "Reply to recruiter" },
      { id: "debt", kind: "debt", urgency: 1, title: "Pay installment" },
      {
        id: "task",
        kind: "overdue-critical",
        urgency: 3,
        title: "Send report",
      },
    ]);

    expect(result.map((item) => item.id)).toEqual(["task", "debt", "career"]);
    expect(result).toHaveLength(3);
    expect(result.every((item) => item.reason.length > 0)).toBe(true);
  });
});
