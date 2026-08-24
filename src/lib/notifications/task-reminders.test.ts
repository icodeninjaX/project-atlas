import { describe, expect, it } from "vitest";
import {
  buildTaskReminderPayload,
  isTaskReminderDue,
  taskReminderDeliveryKey,
  type ScheduledTaskReminder,
} from "./task-reminders";

const task: ScheduledTaskReminder = {
  id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
  user_id: "10000000-0000-4000-8000-000000000001",
  title: "Write proposal",
  scheduled_for: "2026-08-24",
  scheduled_time: "09:00:00",
  estimated_minutes: 25,
};

describe("task reminders", () => {
  it("recognizes tasks due within the retry window", () => {
    expect(isTaskReminderDue(task, new Date("2026-08-24T01:00:30Z"))).toBe(
      true,
    );
    expect(isTaskReminderDue(task, new Date("2026-08-24T01:09:59Z"))).toBe(
      true,
    );
    expect(isTaskReminderDue(task, new Date("2026-08-24T01:10:01Z"))).toBe(
      false,
    );
    expect(isTaskReminderDue(task, new Date("2026-08-24T00:59:59Z"))).toBe(
      false,
    );
  });

  it("builds a stable delivery key and phone-friendly payload", () => {
    expect(taskReminderDeliveryKey(task)).toBe(
      "task:1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb:2026-08-24:09:00:00",
    );
    expect(buildTaskReminderPayload(task)).toEqual({
      title: "Time to focus",
      body: "Write proposal · 25 min",
      url: "/tasks?view=today",
      tag: "atlas-task-1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    });
  });
});
