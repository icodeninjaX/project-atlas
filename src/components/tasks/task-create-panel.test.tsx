import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskCreatePanel } from "./task-create-panel";

afterEach(cleanup);

function renderPanel({ initiallyOpen = false } = {}) {
  return render(
    <TaskCreatePanel
      heading={<h1>Tasks</h1>}
      description={<p>Capture quickly.</p>}
      initiallyOpen={initiallyOpen}
    />,
  );
}

describe("TaskCreatePanel", () => {
  it("keeps the task form collapsed until Add task is selected", () => {
    renderPanel();

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();

    const heading = screen.getByRole("heading", { name: "Tasks" });
    const addTaskButton = screen.getByRole("button", { name: "Add task" });

    expect(heading.parentElement).toContainElement(addTaskButton);
    fireEvent.click(addTaskButton);

    expect(screen.getByLabelText("Task title")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("opens immediately when requested by a deep link", () => {
    renderPanel({ initiallyOpen: true });

    expect(screen.getByLabelText("Task title")).toBeVisible();
  });

  it("opens with the N keyboard shortcut", () => {
    renderPanel();

    fireEvent.keyDown(window, { key: "n" });

    expect(screen.getByLabelText("Task title")).toHaveFocus();
  });

  it("collapses when Cancel is selected", () => {
    renderPanel({ initiallyOpen: true });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add task" })).toBeVisible();
  });

  it("keeps advanced task planning collapsed until it is requested", () => {
    renderPanel({ initiallyOpen: true });

    expect(screen.queryByLabelText("Exact time")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Planning details" }));

    expect(screen.getByLabelText("Exact time")).toBeVisible();
    expect(screen.getByLabelText("Priority")).toBeVisible();
    expect(screen.getByLabelText("Estimated minutes")).toBeVisible();
  });
});
