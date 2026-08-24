import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalProgress } from "./goal-progress";

afterEach(cleanup);

describe("GoalProgress", () => {
  it("rounds progress from completed milestones", () => {
    render(
      <GoalProgress
        goalTitle="Launch portfolio"
        completedMilestones={2}
        totalMilestones={3}
      />,
    );

    const progress = screen.getByRole("progressbar", {
      name: "Progress for Launch portfolio",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "67");
    expect(progress).toHaveAttribute(
      "aria-valuetext",
      "67% complete — 2 of 3 milestones completed",
    );
    expect(screen.getByText("67%")).toBeVisible();
    expect(screen.getByText("2 of 3 milestones completed")).toBeVisible();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("starts at zero when a goal has no milestones", () => {
    render(
      <GoalProgress
        goalTitle="Build an emergency fund"
        completedMilestones={0}
        totalMilestones={0}
      />,
    );

    expect(
      screen.getByRole("progressbar", {
        name: "Progress for Build an emergency fund",
      }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      screen.getByText("Add your first milestone to start tracking progress."),
    ).toBeVisible();
  });
});
