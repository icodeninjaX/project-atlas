import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskCreatePanel } from "./task-create-panel";
import { TaskCreateTrigger } from "./task-create-trigger";

afterEach(cleanup);

function renderPanel({ initiallyOpen = false } = {}) {
  return render(
    <TaskCreatePanel
      title="Tasks"
      description="Capture quickly."
      initiallyOpen={initiallyOpen}
    />,
  );
}

describe("TaskCreatePanel", () => {
  it("keeps the task form collapsed until Add task is selected", () => {
    renderPanel();

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();

    const heading = screen.getByRole("heading", { name: "Tasks" });
    const header = heading.closest("header")!;
    const addTaskButton = within(header).getByRole("button", {
      name: "Add task",
    });

    expect(header).toContainElement(addTaskButton);
    fireEvent.click(addTaskButton);

    expect(screen.getByLabelText("Task title")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("opens immediately when requested by a deep link", () => {
    renderPanel({ initiallyOpen: true });

    expect(screen.getByLabelText("Task title")).toBeVisible();
  });

  it("opens from the empty-state Add task control", () => {
    render(
      <>
        <TaskCreatePanel title="Tasks" description="Capture quickly." />
        <TaskCreateTrigger />
      </>,
    );

    // The page heading, the phone button, then the empty state's own.
    fireEvent.click(screen.getAllByRole("button", { name: "Add task" })[2]!);

    expect(screen.getByLabelText("Task title")).toHaveFocus();
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
    expect(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Add task",
      }),
    ).toBeVisible();
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

describe("TaskCreatePanel on phones", () => {
  it("offers a floating Add task button that opens and focuses capture", () => {
    renderPanel();

    // The floating button sits outside the page heading and the form.
    const floatingButtons = () =>
      screen
        .getAllByRole("button", { name: "Add task" })
        .filter((button) => !button.closest("header, form"));
    fireEvent.click(floatingButtons()[0]!);

    expect(screen.getByLabelText("Task title")).toHaveFocus();
    expect(floatingButtons()).toHaveLength(0);
  });

  it("closes the form with Escape", () => {
    renderPanel({ initiallyOpen: true });

    fireEvent.keyDown(screen.getByLabelText("Task title"), { key: "Escape" });

    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
  });

  it("fills and clears the date from the Today and Tomorrow shortcuts", () => {
    render(
      <TaskCreatePanel
        title="Tasks"
        description="Capture quickly."
        today="2026-10-01"
        initiallyOpen
      />,
    );

    const date = screen.getByLabelText("Scheduled date");
    const tomorrow = screen.getByRole("button", { name: "Tomorrow" });
    fireEvent.click(tomorrow);
    expect(date).toHaveValue("2026-10-02");
    expect(tomorrow).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(date).toHaveValue("2026-10-01");
    expect(tomorrow).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(date).toHaveValue("");
  });
});
