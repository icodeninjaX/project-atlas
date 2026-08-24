import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskCreatePanel } from "./task-create-panel";

afterEach(cleanup);

describe("TaskCreatePanel", () => {
  it("keeps the task form collapsed until Add task is selected", () => {
    render(<TaskCreatePanel />);

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    expect(screen.getByLabelText("Task title")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("opens immediately when requested by a deep link", () => {
    render(<TaskCreatePanel initiallyOpen />);

    expect(screen.getByLabelText("Task title")).toBeVisible();
  });

  it("opens with the N keyboard shortcut", () => {
    render(<TaskCreatePanel />);

    fireEvent.keyDown(window, { key: "n" });

    expect(screen.getByLabelText("Task title")).toHaveFocus();
  });

  it("collapses when Cancel is selected", () => {
    render(<TaskCreatePanel initiallyOpen />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add task" })).toBeVisible();
  });
});
