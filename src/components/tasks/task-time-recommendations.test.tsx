import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickTaskForm } from "./quick-task-form";
import { TaskTimeRecommendations } from "./task-time-recommendations";

afterEach(cleanup);

describe("TaskTimeRecommendations", () => {
  it("shows selectable openings when the requested time overlaps", () => {
    const onSelectTime = vi.fn();
    render(
      <TaskTimeRecommendations
        scheduledTasks={[
          {
            id: "scheduled-task",
            title: "Project review",
            scheduled_for: "2026-08-25",
            scheduled_time: "09:00:00",
            estimated_minutes: 60,
          },
        ]}
        scheduledFor="2026-08-25"
        scheduledTime="09:30"
        estimatedMinutes={30}
        onSelectTime={onSelectTime}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "9:30 AM Overlaps “Project review”",
    );
    fireEvent.click(screen.getByRole("button", { name: "Use 10:00 AM" }));
    expect(onSelectTime).toHaveBeenCalledWith("10:00");
  });

  it("stays hidden when the requested time is free", () => {
    const { container } = render(
      <TaskTimeRecommendations
        scheduledTasks={[]}
        scheduledFor="2026-08-25"
        scheduledTime="09:30"
        estimatedMinutes={30}
        onSelectTime={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("applies a recommendation to the quick-task time field", () => {
    render(
      <QuickTaskForm
        scheduledTasks={[
          {
            id: "scheduled-task",
            title: "Project review",
            scheduled_for: "2026-08-25",
            scheduled_time: "09:00:00",
            estimated_minutes: 60,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Planning details" }));

    fireEvent.change(screen.getByLabelText("Scheduled date"), {
      target: { value: "2026-08-25" },
    });
    fireEvent.change(screen.getByLabelText("Exact time"), {
      target: { value: "09:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use 10:00 AM" }));

    expect(screen.getByLabelText("Exact time")).toHaveValue("10:00");
    expect(screen.getByLabelText("Exact time")).toHaveFocus();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
