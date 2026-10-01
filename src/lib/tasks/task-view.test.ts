import { describe, expect, it } from "vitest";
import {
  daysOverdue,
  formatTaskMinutes,
  groupTasksForView,
  manilaClock,
  manilaIsoDate,
  manilaTimeLabel,
  parseTaskView,
  summarizeTodayPlan,
  taskDayLabel,
} from "@/lib/tasks/task-view";

const today = "2026-10-01";

function task(
  overrides: Partial<{
    id: string;
    scheduled_for: string | null;
    scheduled_time: string | null;
    completed_at: string | null;
  }> = {},
) {
  return {
    id: "task",
    scheduled_for: null,
    scheduled_time: null,
    completed_at: null,
    ...overrides,
  };
}

describe("parseTaskView", () => {
  it("accepts the five views and opens Today otherwise", () => {
    expect(parseTaskView("overdue")).toBe("overdue");
    expect(parseTaskView("completed")).toBe("completed");
    expect(parseTaskView(undefined)).toBe("today");
    expect(parseTaskView("everything")).toBe("today");
  });
});

describe("task dates and times", () => {
  it("labels nearby days relative to today", () => {
    expect(taskDayLabel("2026-10-01", today)).toBe("Today");
    expect(taskDayLabel("2026-09-30", today)).toBe("Yesterday");
    expect(taskDayLabel("2026-10-02", today)).toBe("Tomorrow");
    expect(taskDayLabel("2026-10-05", today)).toBe("Mon, Oct 5");
  });

  it("counts whole days overdue and never goes negative", () => {
    expect(daysOverdue("2026-09-30", today)).toBe(1);
    expect(daysOverdue("2026-09-24", today)).toBe(7);
    expect(daysOverdue("2026-10-03", today)).toBe(0);
    expect(daysOverdue("not a date", today)).toBe(0);
  });

  it("reads timestamps on the Manila calendar and clock", () => {
    // 16:30 UTC on Sep 30 is 00:30 on Oct 1 in Manila.
    expect(manilaIsoDate("2026-09-30T16:30:00Z")).toBe("2026-10-01");
    expect(manilaClock("2026-09-30T16:30:00Z")).toBe("00:30");
    expect(manilaTimeLabel("2026-10-01T07:42:00Z")).toBe("3:42 PM");
    expect(manilaIsoDate("nope")).toBeNull();
    expect(manilaTimeLabel("nope")).toBeNull();
  });

  it("formats durations in full and compact forms", () => {
    expect(formatTaskMinutes(25)).toBe("25 min");
    expect(formatTaskMinutes(60)).toBe("1 h");
    expect(formatTaskMinutes(135)).toBe("2 h 15 min");
    expect(formatTaskMinutes(135, { compact: true })).toBe("2h 15m");
    expect(formatTaskMinutes(0, { compact: true })).toBe("0m");
  });
});

describe("groupTasksForView", () => {
  it("splits Today into scheduled and anytime tasks", () => {
    const groups = groupTasksForView(
      "today",
      [
        task({ id: "a", scheduled_time: "09:30:00" }),
        task({ id: "b" }),
        task({ id: "c", scheduled_time: "13:00:00" }),
      ],
      today,
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Scheduled",
      "Anytime",
    ]);
    expect(groups[0]!.tasks.map((item) => item.id)).toEqual(["a", "c"]);
    expect(groups[1]!.tasks.map((item) => item.id)).toEqual(["b"]);
  });

  it("drops an empty Today section", () => {
    const groups = groupTasksForView("today", [task({ id: "a" })], today);

    expect(groups.map((group) => group.id)).toEqual(["anytime"]);
  });

  it("groups Upcoming by day with the date beside relative labels", () => {
    const groups = groupTasksForView(
      "upcoming",
      [
        task({ id: "a", scheduled_for: "2026-10-02" }),
        task({ id: "b", scheduled_for: "2026-10-02" }),
        task({ id: "c", scheduled_for: "2026-10-05" }),
      ],
      today,
    );

    expect(
      groups.map(({ label, detail, tasks }) => [label, detail, tasks.length]),
    ).toEqual([
      ["Tomorrow", "Oct 2", 2],
      ["Mon, Oct 5", null, 1],
    ]);
  });

  it("groups Completed by the Manila day each task was finished", () => {
    const groups = groupTasksForView(
      "completed",
      [
        task({ id: "a", completed_at: "2026-09-30T16:30:00Z" }),
        task({ id: "b", completed_at: "2026-09-30T10:00:00Z" }),
      ],
      today,
    );

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday"]);
  });

  it("keeps the Inbox as one newest-first list", () => {
    const groups = groupTasksForView(
      "inbox",
      [task({ id: "a" }), task({ id: "b" })],
      today,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]!.tasks).toHaveLength(2);
  });

  it("returns no sections for an empty view", () => {
    expect(groupTasksForView("today", [], today)).toEqual([]);
  });
});

describe("summarizeTodayPlan", () => {
  it("counts progress, time left, and the next exact time still ahead", () => {
    const summary = summarizeTodayPlan(
      [
        {
          status: "completed",
          scheduled_time: "08:00:00",
          estimated_minutes: 30,
        },
        {
          status: "planned",
          scheduled_time: "09:00:00",
          estimated_minutes: 45,
        },
        {
          status: "planned",
          scheduled_time: "14:30:00",
          estimated_minutes: 90,
        },
        { status: "inbox", scheduled_time: null, estimated_minutes: null },
        {
          status: "cancelled",
          scheduled_time: "11:00:00",
          estimated_minutes: 60,
        },
      ],
      "10:15",
    );

    expect(summary).toEqual({
      total: 4,
      done: 1,
      remaining: 3,
      minutesLeft: 135,
      nextTime: "14:30",
    });
  });

  it("has no next time once every exact time has passed", () => {
    expect(
      summarizeTodayPlan(
        [{ status: "planned", scheduled_time: "09:00", estimated_minutes: 30 }],
        "21:00",
      ).nextTime,
    ).toBeNull();
  });
});
