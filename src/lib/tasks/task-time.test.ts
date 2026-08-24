import { describe, expect, it } from "vitest";
import {
  formatTaskTime,
  getTaskTimeAvailability,
  taskTimeInputValue,
} from "./task-time";

describe("task time formatting", () => {
  it("formats stored Postgres times for people", () => {
    expect(formatTaskTime("00:05:00")).toBe("12:05 AM");
    expect(formatTaskTime("14:30:00")).toBe("2:30 PM");
  });

  it("normalizes stored Postgres times for a time input", () => {
    expect(taskTimeInputValue("14:30:00")).toBe("14:30");
    expect(taskTimeInputValue(null)).toBe("");
  });

  it("finds overlaps using each task's estimated duration", () => {
    const availability = getTaskTimeAvailability({
      scheduledFor: "2026-08-25",
      scheduledTime: "09:30",
      estimatedMinutes: 45,
      scheduledTasks: [
        {
          id: "first-task",
          title: "Planning session",
          scheduled_for: "2026-08-25",
          scheduled_time: "09:00:00",
          estimated_minutes: 60,
        },
        {
          id: "another-day",
          title: "Tomorrow's work",
          scheduled_for: "2026-08-26",
          scheduled_time: "09:30:00",
          estimated_minutes: 60,
        },
      ],
    });

    expect(availability.conflicts.map((task) => task.id)).toEqual([
      "first-task",
    ]);
    expect(availability.durationMinutes).toBe(45);
    expect(availability.recommendations[0]).toBe("10:00");
    expect(availability.recommendations).not.toContain("09:30");
  });

  it("ignores the task being edited and falls back to 30-minute durations", () => {
    const scheduledTasks = [
      {
        id: "current-task",
        title: "Current task",
        scheduled_for: "2026-08-25",
        scheduled_time: "14:00:00",
        estimated_minutes: null,
      },
    ];

    expect(
      getTaskTimeAvailability({
        scheduledTasks,
        scheduledFor: "2026-08-25",
        scheduledTime: "14:00",
        estimatedMinutes: null,
        excludeTaskId: "current-task",
      }).conflicts,
    ).toEqual([]);
    expect(
      getTaskTimeAvailability({
        scheduledTasks,
        scheduledFor: "2026-08-25",
        scheduledTime: "14:15",
        estimatedMinutes: null,
      }).conflicts,
    ).toHaveLength(1);
  });

  it("recommends exact task boundaries as well as half-hour times", () => {
    const availability = getTaskTimeAvailability({
      scheduledFor: "2026-08-25",
      scheduledTime: "09:15",
      estimatedMinutes: 30,
      scheduledTasks: [
        {
          id: "irregular-task",
          title: "Short call",
          scheduled_for: "2026-08-25",
          scheduled_time: "09:10:00",
          estimated_minutes: 30,
        },
      ],
    });

    expect(availability.recommendations[0]).toBe("09:40");
  });
});
