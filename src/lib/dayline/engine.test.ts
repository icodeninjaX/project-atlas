import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAYLINE_CAPACITY_MINUTES,
  generateDayline,
  type DaylineSourceData,
  type DaylineTask,
} from "./engine";

const now = new Date("2026-09-04T01:00:00.000Z");

function task(id: string, overrides: Partial<DaylineTask> = {}): DaylineTask {
  return {
    id,
    title: `Task ${id}`,
    status: "planned",
    priority: "medium",
    dueAt: null,
    scheduledFor: null,
    estimatedMinutes: 30,
    energyRequired: "medium",
    relatedGoalId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function source(overrides: Partial<DaylineSourceData> = {}): DaylineSourceData {
  return {
    capacityMinutes: 120,
    energyLevel: "medium",
    tasks: [],
    debts: [],
    applications: [],
    milestones: [],
    ...overrides,
  };
}

describe("capacity-aware Dayline", () => {
  it("puts overdue work ahead of important work that is not yet urgent", () => {
    const result = generateDayline(
      source({
        tasks: [
          task("important", {
            priority: "critical",
            dueAt: "2026-09-09T09:00:00.000Z",
          }),
          task("overdue", {
            priority: "low",
            scheduledFor: "2026-09-03",
          }),
        ],
      }),
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "overdue",
      "important",
    ]);
    expect(result.items[0]?.reason).toContain("Overdue by 1 day");
  });

  it("chooses a short urgent task over long non-urgent work when capacity is tight", () => {
    const result = generateDayline(
      source({
        capacityMinutes: 30,
        tasks: [
          task("long", {
            priority: "critical",
            dueAt: "2026-09-09T09:00:00.000Z",
            estimatedMinutes: 120,
          }),
          task("short", {
            priority: "high",
            scheduledFor: "2026-09-04",
            estimatedMinutes: 20,
          }),
        ],
      }),
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(["short"]);
    expect(result.plannedMinutes).toBe(20);
  });

  it("uses a stable title and id tie-break when priorities are equal", () => {
    const data = source({
      tasks: [
        task("z-id", { title: "Write notes", scheduledFor: "2026-09-04" }),
        task("a-id", { title: "Answer email", scheduledFor: "2026-09-04" }),
      ],
    });

    expect(generateDayline(data, now).items.map((item) => item.id)).toEqual([
      "a-id",
      "z-id",
    ]);
    expect(generateDayline(data, now).items.map((item) => item.id)).toEqual(
      generateDayline(data, now).items.map((item) => item.id),
    );
  });

  it("uses a documented 30-minute estimate when a task has no estimate", () => {
    const result = generateDayline(
      source({
        capacityMinutes: DEFAULT_DAYLINE_CAPACITY_MINUTES,
        tasks: [
          task("missing", {
            scheduledFor: "2026-09-04",
            estimatedMinutes: null,
          }),
        ],
      }),
      now,
    );

    expect(result.items[0]).toMatchObject({
      id: "missing",
      durationMinutes: 30,
    });
    expect(result.items[0]?.reason).toContain("30 min estimated");
  });

  it("deprioritizes high-energy work when the current energy level is low", () => {
    const result = generateDayline(
      source({
        energyLevel: "low",
        tasks: [
          task("high-energy", {
            title: "Deep analysis",
            priority: "high",
            dueAt: "2026-09-06T09:00:00.000Z",
            energyRequired: "high",
          }),
          task("low-energy", {
            title: "Send update",
            priority: "high",
            dueAt: "2026-09-06T09:00:00.000Z",
            energyRequired: "low",
          }),
        ],
      }),
      now,
    );

    expect(result.items[0]?.id).toBe("low-energy");
    expect(result.items[1]?.reason).toContain("above your low-energy mode");
  });

  it("excludes completed and cancelled tasks", () => {
    const result = generateDayline(
      source({
        tasks: [
          task("completed", {
            status: "completed",
            scheduledFor: "2026-09-04",
          }),
          task("cancelled", {
            status: "cancelled",
            scheduledFor: "2026-09-04",
          }),
          task("open", { scheduledFor: "2026-09-04" }),
        ],
      }),
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(["open"]);
  });

  it("returns at most three items with NOW, NEXT, and LATER labels", () => {
    const result = generateDayline(
      source({
        capacityMinutes: 240,
        tasks: [1, 2, 3, 4].map((id) =>
          task(String(id), {
            title: `Task ${id}`,
            scheduledFor: "2026-09-04",
          }),
        ),
      }),
      now,
    );

    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.position)).toEqual([
      "NOW",
      "NEXT",
      "LATER",
    ]);
  });

  it("turns due debt, career, and goal records into linked actions", () => {
    const result = generateDayline(
      source({
        capacityMinutes: 120,
        debts: [
          {
            id: "debt-1",
            creditorName: "Maya Credit",
            status: "active",
            nextDueDate: "2026-09-04",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ],
        applications: [
          {
            id: "career-1",
            companyName: "Atlas Labs",
            stage: "interview",
            nextAction: "Send interview follow-up",
            nextActionAt: "2026-09-05T01:00:00.000Z",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ],
        milestones: [
          {
            id: "milestone-1",
            goalId: "goal-1",
            title: "Publish case study",
            targetDate: "2026-09-06",
            completedAt: null,
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      }),
      now,
    );

    expect(result.items.map((item) => item.kind)).toEqual([
      "debt",
      "career",
      "goal",
    ]);
    expect(result.items.map((item) => item.href)).toEqual([
      "/debts?highlight=debt-1",
      "/career?highlight=career-1",
      "/goals?highlight=goal-1",
    ]);
  });
});
