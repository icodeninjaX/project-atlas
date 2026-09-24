import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoalRelatedSummary } from "./goal-related-summary";
import { GoalRelatedDetails } from "./goal-related-details";
import type { RelatedEntity } from "@/lib/graph/model";

const refresh = vi.fn();
const add = vi.fn();
const remove = vi.fn();
const search = vi.fn();
const setTaskGoal = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/graph/actions", () => ({
  addGraphRelationshipAction: (...args: unknown[]) => add(...args),
  removeGraphRelationshipAction: (...args: unknown[]) => remove(...args),
  searchGraphCandidatesAction: (...args: unknown[]) => search(...args),
}));
vi.mock("@/lib/tasks/actions", () => ({
  setTaskGoalRelationshipAction: (...args: unknown[]) => setTaskGoal(...args),
}));

const goal = {
  type: "goal" as const,
  id: "goal-id",
  title: "Find work",
  subtitle: null,
  href: "/goals?highlight=goal-id",
};
const task = {
  type: "task" as const,
  id: "task-id",
  title: "Prepare a very long developer portfolio and application package",
  subtitle: "planned",
  href: "/tasks?highlight=task-id",
};
const knowledge = {
  type: "knowledge_concept" as const,
  id: "knowledge-id",
  title: "Server Actions",
  subtitle: null,
  href: "/knowledge?highlight=knowledge-id",
};
const native: RelatedEntity = {
  id: "native:task:task-id",
  source: task,
  target: goal,
  related: task,
  kind: "task_goal",
  origin: "native",
  removable: false,
};
const manual: RelatedEntity = {
  id: "edge-id",
  source: knowledge,
  target: goal,
  related: knowledge,
  kind: "supports_goal",
  origin: "manual",
  removable: true,
};
const milestone = {
  type: "goal_milestone" as const,
  id: "milestone-id",
  title: "Complete portfolio",
  subtitle: null,
  href: "/goals?highlight=goal-id&milestone=milestone-id",
};
const milestoneGoal: RelatedEntity = {
  id: "native:goal_milestone:milestone-id",
  source: milestone,
  target: goal,
  related: goal,
  kind: "milestone_goal",
  origin: "native",
  removable: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  search.mockResolvedValue([knowledge]);
});
afterEach(cleanup);

describe("Goal Graph UI", () => {
  it("shows native and explicit counts with a touch-friendly detail link", () => {
    render(
      <GoalRelatedSummary
        goalId="goal-id"
        counts={{ task: 3, knowledge_concept: 2 }}
      />,
    );
    expect(screen.getByText("Tasks · 3")).toBeInTheDocument();
    expect(screen.getByText("Knowledge · 2")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View relationships/ }),
    ).toHaveAttribute("href", "/goals/goal-id");
  });

  it("explains empty and native states with a distinct task unlink action", () => {
    const { rerender } = render(
      <GoalRelatedDetails goalId="goal-id" items={[]} />,
    );
    expect(screen.getByText("Nothing connected yet.")).toBeInTheDocument();
    rerender(<GoalRelatedDetails goalId="goal-id" items={[native]} />);
    expect(screen.getByRole("link", { name: task.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: task.title })).toHaveClass(
      "break-words",
    );
    expect(screen.getByText(/From record/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unlink from goal" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove relationship" }),
    ).not.toBeInTheDocument();
  });

  it("links and unlinks a task through its canonical goal field", async () => {
    const user = userEvent.setup();
    search.mockResolvedValue([task]);
    setTaskGoal.mockResolvedValue({
      success: true,
      message: "Task linked to goal.",
    });
    render(<GoalRelatedDetails goalId="goal-id" items={[native]} />);
    await user.click(screen.getByRole("button", { name: "Add related item" }));
    await user.selectOptions(
      screen.getByLabelText("Item type"),
      screen.getByRole("option", { name: "Tasks" }),
    );
    expect(screen.getByLabelText("Item type")).toHaveValue("5");
    await user.click(
      screen.getByRole("button", { name: "Search related items" }),
    );
    expect(search).toHaveBeenCalledWith("task", "");
    await user.click(
      await screen.findByRole("button", { name: new RegExp(task.title) }),
    );
    await user.click(screen.getByRole("button", { name: "Link item" }));
    await waitFor(() =>
      expect(setTaskGoal).toHaveBeenCalledWith("task-id", "goal-id", "link"),
    );
    setTaskGoal.mockResolvedValue({
      success: true,
      message: "Task unlinked from goal.",
    });
    await user.click(screen.getByRole("button", { name: "Unlink from goal" }));
    await user.click(screen.getByRole("button", { name: "Confirm unlink" }));
    await waitFor(() =>
      expect(setTaskGoal).toHaveBeenCalledWith("task-id", "goal-id", "unlink"),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("shows a milestone's goal and links knowledge from its own page", async () => {
    const user = userEvent.setup();
    add.mockResolvedValue({ success: true, message: "Relationship added." });
    render(
      <GoalRelatedDetails
        goalId="goal-id"
        milestoneId="milestone-id"
        items={[milestoneGoal]}
      />,
    );
    expect(screen.getByRole("link", { name: "Find work" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add related item" }));
    expect(screen.queryByLabelText("Item type")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Search related items" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Server Actions" }),
    );
    await user.click(screen.getByRole("button", { name: "Link item" }));
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        sourceType: "goal_milestone",
        sourceId: "milestone-id",
        targetType: "knowledge_concept",
        targetId: "knowledge-id",
        kind: "related_knowledge",
      }),
    );
  });

  it("announces loading and search failures", async () => {
    const user = userEvent.setup();
    let rejectSearch: (reason?: unknown) => void = () => {};
    search.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSearch = reject;
      }),
    );
    render(<GoalRelatedDetails goalId="goal-id" items={[]} />);
    await user.click(screen.getByRole("button", { name: "Add related item" }));
    await user.click(
      screen.getByRole("button", { name: "Search related items" }),
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rejectSearch(new Error("unavailable"));
    expect(
      await screen.findByText("Search could not be completed. Try again."),
    ).toBeInTheDocument();
  });

  it("searches and links a selected record", async () => {
    const user = userEvent.setup();
    add.mockResolvedValue({ success: true, message: "Relationship added." });
    render(<GoalRelatedDetails goalId="goal-id" items={[]} />);
    await user.click(screen.getByRole("button", { name: "Add related item" }));
    await user.type(screen.getByLabelText("Search knowledge"), "Server");
    await user.click(
      screen.getByRole("button", { name: "Search related items" }),
    );
    await screen.findByRole("button", { name: "Server Actions" });
    await user.click(screen.getByRole("button", { name: "Server Actions" }));
    await user.click(screen.getByRole("button", { name: "Link item" }));
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        sourceType: "knowledge_concept",
        sourceId: "knowledge-id",
        targetType: "goal",
        targetId: "goal-id",
        kind: "supports_goal",
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows duplicate feedback and requires confirmation to remove an explicit link", async () => {
    const user = userEvent.setup();
    add.mockResolvedValue({
      success: false,
      message: "This relationship already exists.",
    });
    remove.mockResolvedValue({
      success: true,
      message: "Relationship removed.",
    });
    render(<GoalRelatedDetails goalId="goal-id" items={[manual]} />);
    await user.click(screen.getByRole("button", { name: "Add related item" }));
    await user.click(
      screen.getByRole("button", { name: "Search related items" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Server Actions" }),
    );
    await user.click(screen.getByRole("button", { name: "Link item" }));
    expect(
      await screen.findByText("This relationship already exists."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await user.click(
      screen.getByRole("button", { name: "Remove relationship" }),
    );
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("edge-id"));
  });
});
