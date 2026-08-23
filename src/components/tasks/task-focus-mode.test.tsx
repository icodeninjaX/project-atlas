import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskFocusMode } from "./task-focus-mode";

vi.mock("@/lib/tasks/actions", () => ({
  setTaskStatusAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TaskFocusMode", () => {
  it("asks for an estimate before enabling a focus session", () => {
    render(
      <TaskFocusMode
        taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        title="Write proposal"
        description={null}
        estimatedMinutes={null}
        scheduledLabel={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Set focus minutes" }),
    ).toBeDisabled();
  });

  it("counts down from the task estimate and can pause", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T01:00:00.000Z"));

    render(
      <TaskFocusMode
        taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        title="Write proposal"
        description="Draft the opening section"
        estimatedMinutes={25}
        scheduledLabel="2026-08-14 at 9:00 AM"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Focus on Write proposal" }),
    );
    expect(screen.getByRole("timer")).toHaveTextContent("25:00");

    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("timer")).toHaveTextContent("24:59");

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole("timer")).toHaveTextContent("24:59");
  });
});
