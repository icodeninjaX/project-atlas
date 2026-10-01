import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupTasksForView, type TaskListItem } from "@/lib/tasks/task-view";
import { renderWithProviders as render } from "@/test/render";
import { TaskList } from "./task-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(cleanup);

const today = "2026-10-01";

function task(
  id: number,
  overrides: Partial<TaskListItem> & Pick<TaskListItem, "title">,
): TaskListItem {
  return {
    id: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    description: null,
    status: "planned",
    priority: "medium",
    scheduled_for: today,
    scheduled_time: null,
    due_at: null,
    estimated_minutes: null,
    energy_required: "medium",
    completed_at: null,
    ...overrides,
  };
}

function rowFor(title: string) {
  const row = screen.getByText(title, { exact: true }).closest("li");
  expect(row).not.toBeNull();
  return within(row!);
}

describe("TaskList", () => {
  it("shows Today as scheduled and anytime sections with times only", () => {
    const tasks = [
      task(1, {
        title: "Send budget draft",
        scheduled_time: "09:30:00",
        estimated_minutes: 45,
        priority: "high",
        energy_required: "high",
      }),
      task(2, { title: "Plan groceries" }),
    ];
    render(
      <TaskList
        groups={groupTasksForView("today", tasks, today)}
        today={today}
        scheduledTasks={[]}
      />,
    );

    expect(screen.getByRole("region", { name: "Scheduled" })).toHaveTextContent(
      "1 task · 45 min",
    );
    expect(screen.getByRole("region", { name: "Anytime" })).toBeVisible();

    const budget = rowFor("Send budget draft");
    expect(budget.getByText("9:30 AM")).toBeVisible();
    expect(budget.getByText("45 min")).toBeVisible();
    expect(budget.getByText("High")).toBeVisible();
    expect(budget.getByText("High energy")).toBeVisible();
    expect(budget.queryByText(/Oct 1/)).not.toBeInTheDocument();
    expect(
      budget.getByRole("button", { name: "Complete Send budget draft" }),
    ).toBeVisible();

    // Medium energy is the default and is not repeated on every row.
    expect(rowFor("Plan groceries").queryByText(/energy/)).toBeNull();
  });

  it("counts how many days an overdue task has waited", () => {
    const tasks = [
      task(3, {
        title: "Reply to landlord",
        scheduled_for: "2026-09-28",
        scheduled_time: "10:00:00",
      }),
    ];
    render(
      <TaskList
        groups={groupTasksForView("overdue", tasks, today)}
        today={today}
        scheduledTasks={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mon, Sep 28" })).toBeVisible();
    expect(
      rowFor("Reply to landlord").getByText("3 days overdue · 10:00 AM"),
    ).toBeVisible();
  });

  it("spells out the date where the section does not name the day", () => {
    const tasks = [
      task(4, {
        title: "Book dentist",
        status: "inbox",
        scheduled_for: "2026-10-05",
        scheduled_time: "16:00:00",
      }),
    ];
    render(
      <TaskList
        groups={groupTasksForView("inbox", tasks, today)}
        today={today}
        scheduledTasks={[]}
      />,
    );

    expect(
      rowFor("Book dentist").getByText("Oct 5, 2026 at 4:00 PM"),
    ).toBeVisible();
  });

  it("logs completed tasks by finish time and offers to reopen them", () => {
    const tasks = [
      task(5, {
        title: "Pay Meralco bill",
        status: "completed",
        completed_at: "2026-10-01T00:03:00Z",
      }),
    ];
    render(
      <TaskList
        groups={groupTasksForView("completed", tasks, today)}
        today={today}
        scheduledTasks={[]}
      />,
    );

    const row = rowFor("Pay Meralco bill");
    expect(row.getByText("Done 8:03 AM")).toBeVisible();
    expect(
      row.getByRole("button", { name: "Reopen Pay Meralco bill" }),
    ).toBeVisible();
    expect(screen.getByText("Pay Meralco bill")).toHaveClass("line-through");
  });

  it("marks the task opened from a link", () => {
    const linked = task(6, { title: "Linked task" });
    render(
      <TaskList
        groups={groupTasksForView("today", [linked], today)}
        today={today}
        highlightId={linked.id}
        scheduledTasks={[]}
      />,
    );

    expect(screen.getByText("Linked task").closest("li")).toHaveClass(
      "bg-primary/[0.07]",
    );
    expect(document.getElementById(`task-${linked.id}`)).not.toBeNull();
  });
});
