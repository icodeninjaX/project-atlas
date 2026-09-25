import { describe, expect, it } from "vitest";
import { prepareCaptureBatch, rankTaskCandidates } from "./batch";

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    kind: "expense",
    confidence: "high",
    amountText: "380",
    currency: "PHP",
    dateText: "today",
    date: "2026-09-25",
    dateRole: "transaction",
    title: null,
    description: "groceries",
    accountText: "GCash",
    merchantOrSource: null,
    categorySuggestion: "Food",
    companyName: null,
    roleTitle: null,
    notes: null,
    ambiguities: [],
    ...overrides,
  };
}

describe("Capture 2.0 batch preparation", () => {
  it("grounds each amount and date only in its own source phrase", () => {
    const text =
      "Spent ₱380 on groceries using GCash today and earned ₱2,500 yesterday";
    const items = prepareCaptureBatch(
      text,
      {
        items: [
          {
            sourcePhrase: "Spent ₱380 on groceries using GCash today",
            operation: "create",
            targetText: null,
            proposal: proposal({ amountText: "380" }),
          },
          {
            sourcePhrase: "earned ₱2,500 yesterday",
            operation: "create",
            targetText: null,
            proposal: proposal({
              kind: "income",
              amountText: "2,500",
              dateText: "yesterday",
              dateRole: "transaction",
              description: null,
              accountText: null,
            }),
          },
        ],
      },
      "2026-09-25",
    );
    expect(items.map((item) => item.proposal.amount)).toEqual([
      "380.00",
      "2500.00",
    ]);
    expect(items.map((item) => item.proposal.date)).toEqual([
      "2026-09-25",
      "2026-09-24",
    ]);
    expect(items[0]?.proposal.accountHint).toBe("GCash");
  });

  it("rejects overlapping spans and fabricated source phrases", () => {
    const item = {
      sourcePhrase: "Paid 380 today",
      operation: "create",
      targetText: null,
      proposal: proposal(),
    };
    expect(() =>
      prepareCaptureBatch(
        "Paid 380 today",
        { items: [item, item] },
        "2026-09-25",
      ),
    ).toThrow();
    expect(() =>
      prepareCaptureBatch(
        "Paid 380 today",
        { items: [{ ...item, sourcePhrase: "Paid 500 today" }] },
        "2026-09-25",
      ),
    ).toThrow();
  });

  it("requires a grounded task reference for rescheduling", () => {
    const task = proposal({
      kind: "task",
      amountText: null,
      currency: null,
      dateText: "tomorrow",
      dateRole: "scheduled",
      title: "interview prep",
      accountText: null,
    });
    expect(() =>
      prepareCaptureBatch(
        "Move interview prep to tomorrow",
        {
          items: [
            {
              sourcePhrase: "Move interview prep to tomorrow",
              operation: "reschedule_task",
              targetText: "different task",
              proposal: task,
            },
          ],
        },
        "2026-09-25",
      ),
    ).toThrow();
  });

  it("presents ambiguous task matches without auto-selecting one", () => {
    const tasks = [
      { id: "1", title: "Interview prep", updatedAt: "a", scheduledFor: null },
      { id: "2", title: "Interview prep", updatedAt: "b", scheduledFor: null },
      { id: "3", title: "Other", updatedAt: "c", scheduledFor: null },
    ];
    expect(
      rankTaskCandidates("interview prep", tasks).map((task) => task.id),
    ).toEqual(["1", "2"]);
    expect(rankTaskCandidates("in", tasks)).toEqual([]);
  });
});
