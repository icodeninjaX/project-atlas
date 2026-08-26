import { describe, expect, it } from "vitest";
import {
  generateSignals,
  rankSignals,
  selectDashboardSignals,
  type Signal,
  type SignalSourceData,
} from "./engine";

const now = new Date("2026-08-26T04:00:00.000Z");

function source(overrides: Partial<SignalSourceData> = {}): SignalSourceData {
  return {
    transactions: [],
    categories: [],
    currentBudget: null,
    debts: [],
    debtPayments: [],
    tasks: [],
    applications: [],
    applicationEvents: [],
    goals: [],
    milestones: [],
    ...overrides,
  };
}

function expense(
  transactionDate: string,
  amountCentavos: number,
  categoryId = "food",
) {
  return { transactionDate, amountCentavos, categoryId };
}

function sampleSignal(
  id: string,
  severity: Signal["severity"],
  category: Signal["category"] = "Money",
): Signal {
  return {
    id,
    type: "money.spending-increase",
    category,
    severity,
    title: id,
    message: "A factual change.",
    reason: "Current data differs from the comparison period.",
    href: "/money/transactions",
    generatedAt: now.toISOString(),
    sensitive: false,
  };
}

describe("deterministic signal rules", () => {
  it("does not compare spending without three completed historical months", () => {
    const noHistory = generateSignals(
      source({ transactions: [expense("2026-08-20", 500_000)] }),
      now,
    );
    const oneMonth = generateSignals(
      source({
        transactions: [
          expense("2026-07-20", 200_000),
          expense("2026-08-20", 500_000),
        ],
      }),
      now,
    );

    expect(
      [...noHistory, ...oneMonth].some(
        (signal) => signal.type === "money.spending-increase",
      ),
    ).toBe(false);
  });

  it("skips zero and tiny baselines even when the percentage change is large", () => {
    const signals = generateSignals(
      source({
        transactions: [
          expense("2026-05-05", 1_000),
          expense("2026-06-05", 1_000),
          expense("2026-07-05", 1_000),
          expense("2026-08-05", 10_000),
        ],
        categories: [{ id: "food", name: "Food" }],
      }),
      now,
    );

    expect(
      signals.some(
        (signal) =>
          signal.type === "money.spending-increase" ||
          signal.type === "money.category-spike",
      ),
    ).toBe(false);
  });

  it.each([
    [750_000, "info"],
    [900_000, "warning"],
    [1_000_000, "critical"],
  ] as const)(
    "applies the budget threshold exactly at %s centavos",
    (spent, severity) => {
      const signals = generateSignals(
        source({
          transactions: [expense("2026-08-12", spent)],
          currentBudget: {
            monthStart: "2026-08-01",
            plannedCentavos: 1_000_000,
          },
        }),
        now,
      );

      expect(
        signals.find((signal) => signal.type === "money.budget-threshold")
          ?.severity,
      ).toBe(severity);
    },
  );

  it("prefers a critical budget signal over an overlapping spending increase", () => {
    const signals = generateSignals(
      source({
        transactions: [
          expense("2026-05-05", 500_000),
          expense("2026-06-05", 500_000),
          expense("2026-07-05", 500_000),
          expense("2026-08-05", 1_000_000),
        ],
        categories: [{ id: "food", name: "Food" }],
        currentBudget: {
          monthStart: "2026-08-01",
          plannedCentavos: 800_000,
        },
      }),
      now,
    );

    expect(
      signals.some((signal) => signal.type === "money.budget-threshold"),
    ).toBe(true);
    expect(
      signals.some((signal) => signal.type === "money.spending-increase"),
    ).toBe(false);
  });

  it("detects net debt reduction and ignores inactive debt deadlines", () => {
    const signals = generateSignals(
      source({
        debts: [
          {
            id: "loan",
            creditorName: "JuanHand",
            currentBalanceCentavos: 900_000,
            nextDueDate: null,
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "paid",
            creditorName: "Paid card",
            currentBalanceCentavos: 0,
            nextDueDate: "2026-08-20",
            status: "paid",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        debtPayments: [
          {
            debtId: "loan",
            amountCentavos: 100_000,
            paymentDate: "2026-08-10",
          },
        ],
      }),
      now,
    );

    expect(
      signals.find((signal) => signal.type === "debt.progress")?.severity,
    ).toBe("positive");
    expect(signals.some((signal) => signal.type === "debt.deadline")).toBe(
      false,
    );
  });

  it("returns no debt, career, or overdue-task signal for empty samples", () => {
    const signals = generateSignals(source(), now);
    expect(
      signals.some((signal) =>
        ["Debt", "Career", "Tasks"].includes(signal.category),
      ),
    ).toBe(false);
  });

  it("does not report low career conversion from a tiny sample", () => {
    const applications = Array.from({ length: 3 }, (_, index) => ({
      id: `app-${index}`,
      stage: "applied",
      appliedAt: `2026-08-${String(index + 10).padStart(2, "0")}T02:00:00.000Z`,
      nextActionAt: null,
      updatedAt: "2026-08-20T02:00:00.000Z",
    }));

    const signals = generateSignals(source({ applications }), now);
    expect(
      signals.some((signal) => signal.type === "career.low-conversion"),
    ).toBe(false);
  });

  it("reports low career conversion once the sample is meaningful", () => {
    const applications = Array.from({ length: 10 }, (_, index) => ({
      id: `app-${index}`,
      stage: index === 0 ? "interview" : "applied",
      appliedAt: `2026-08-${String(index + 10).padStart(2, "0")}T02:00:00.000Z`,
      nextActionAt: null,
      updatedAt: "2026-08-20T02:00:00.000Z",
    }));

    const signals = generateSignals(source({ applications }), now);
    expect(
      signals.find((signal) => signal.type === "career.low-conversion")
        ?.message,
    ).toContain("10 applications");
  });

  it("reconstructs a meaningful increase in overdue tasks", () => {
    const tasks = Array.from({ length: 5 }, (_, index) => ({
      id: `task-${index}`,
      status: "planned",
      dueAt: null,
      scheduledFor: "2026-08-20",
      completedAt: null,
      createdAt: "2026-08-01T00:00:00.000Z",
    }));

    const signals = generateSignals(source({ tasks }), now);
    expect(
      signals.find((signal) => signal.type === "tasks.overdue-increase")
        ?.message,
    ).toContain("up from 0 last week");
  });

  it("detects a strongest completion week as a positive trend", () => {
    const completed = (
      prefix: string,
      dates: string[],
    ): SignalSourceData["tasks"] =>
      dates.map((date, index) => ({
        id: `${prefix}-${index}`,
        status: "completed",
        dueAt: null,
        scheduledFor: null,
        completedAt: `${date}T03:00:00.000Z`,
        createdAt: "2026-07-01T00:00:00.000Z",
      }));
    const tasks = [
      ...completed("current", [
        "2026-08-24",
        "2026-08-24",
        "2026-08-25",
        "2026-08-25",
        "2026-08-26",
        "2026-08-26",
      ]),
      ...completed("last", ["2026-08-17", "2026-08-18", "2026-08-19"]),
      ...completed("two", ["2026-08-10", "2026-08-11"]),
      ...completed("three", ["2026-08-03"]),
    ];

    const signals = generateSignals(source({ tasks }), now);
    expect(
      signals.find((signal) => signal.type === "tasks.strong-execution")
        ?.severity,
    ).toBe("positive");
  });

  it("detects a goal with exactly 21 days without a change", () => {
    const signals = generateSignals(
      source({
        goals: [
          {
            id: "portfolio",
            title: "Portfolio Launch",
            status: "active",
            targetDate: null,
            progressPercent: 20,
            updatedAt: "2026-08-05T04:00:00.000Z",
          },
        ],
      }),
      now,
    );

    expect(
      signals.find((signal) => signal.type === "goals.stalled")?.message,
    ).toContain("21 days");
  });
});

describe("signal ranking and noise control", () => {
  it("ranks critical and warning ahead of positive and informational signals", () => {
    const ranked = rankSignals([
      sampleSignal("info", "info"),
      sampleSignal("positive", "positive"),
      sampleSignal("critical", "critical"),
      sampleSignal("warning", "warning"),
    ]);

    expect(ranked.map((signal) => signal.severity)).toEqual([
      "critical",
      "warning",
      "positive",
      "info",
    ]);
  });

  it("deduplicates overlapping IDs and keeps the more severe version", () => {
    const ranked = rankSignals([
      sampleSignal("same", "info"),
      sampleSignal("same", "critical"),
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.severity).toBe("critical");
  });

  it("limits dashboard noise and prevents one category from taking over", () => {
    const signals = [
      sampleSignal("money-1", "critical", "Money"),
      sampleSignal("money-2", "warning", "Money"),
      sampleSignal("money-3", "warning", "Money"),
      sampleSignal("debt", "warning", "Debt"),
      sampleSignal("tasks", "positive", "Tasks"),
      sampleSignal("career", "info", "Career"),
      sampleSignal("goals", "info", "Goals"),
    ];

    const selected = selectDashboardSignals(signals);
    expect(selected).toHaveLength(5);
    expect(
      selected.filter((signal) => signal.category === "Money"),
    ).toHaveLength(2);
  });
});
