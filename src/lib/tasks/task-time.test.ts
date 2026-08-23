import { describe, expect, it } from "vitest";
import { formatTaskTime, taskTimeInputValue } from "./task-time";

describe("task time formatting", () => {
  it("formats stored Postgres times for people", () => {
    expect(formatTaskTime("00:05:00")).toBe("12:05 AM");
    expect(formatTaskTime("14:30:00")).toBe("2:30 PM");
  });

  it("normalizes stored Postgres times for a time input", () => {
    expect(taskTimeInputValue("14:30:00")).toBe("14:30");
    expect(taskTimeInputValue(null)).toBe("");
  });
});
