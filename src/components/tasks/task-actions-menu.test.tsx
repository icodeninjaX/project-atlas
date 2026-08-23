import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { TaskActionsMenu } from "./task-actions-menu";

const task = {
  id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
  title: "Write proposal",
  description: "Draft the opening section",
  priority: "medium",
  scheduled_for: "2026-08-23",
  scheduled_time: "09:30:00",
  estimated_minutes: 25,
  status: "inbox",
};

afterEach(cleanup);

describe("TaskActionsMenu", () => {
  it("groups the mobile task actions behind an accessible overflow menu", () => {
    render(
      <TaskActionsMenu task={task} scheduledLabel="2026-08-23 at 9:30 AM" />,
    );

    const trigger = screen.getByRole("button", {
      name: "Open actions for Write proposal",
    });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu", {
      name: "Actions for Write proposal",
    });
    expect(menu).toBeVisible();
    expect(menu).toHaveClass("bg-white", "dark:bg-slate-800");
    const focusItem = screen.getByRole("menuitem", {
      name: "Focus on Write proposal",
    });
    const reminderItem = screen.getByRole("menuitem", {
      name: "Set reminder",
    });
    expect(focusItem).toBeVisible();
    expect(focusItem).toHaveFocus();
    expect(reminderItem).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Edit task" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Delete task" })).toBeVisible();

    fireEvent.keyDown(focusItem, { key: "ArrowDown" });
    expect(reminderItem).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens reminder scheduling in a compact mobile sheet", () => {
    render(
      <TaskActionsMenu task={task} scheduledLabel="2026-08-23 at 9:30 AM" />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for Write proposal",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Set reminder" }));

    expect(screen.getByRole("dialog", { name: "Set reminder" })).toBeVisible();
    expect(screen.getByLabelText("Scheduled date")).toHaveFocus();
    expect(screen.getByLabelText("Exact time")).toHaveValue("09:30");
  });

  it("opens Focus mode without leaving the overflow menu visible", async () => {
    render(
      <TaskActionsMenu task={task} scheduledLabel="2026-08-23 at 9:30 AM" />,
    );

    const trigger = screen.getByRole("button", {
      name: "Open actions for Write proposal",
    });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Focus on Write proposal" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Write proposal" }),
    ).toBeVisible();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Focus mode" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
