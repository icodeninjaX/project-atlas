import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalCreatePanel } from "./goal-create-panel";

afterEach(cleanup);

function renderPanel() {
  return render(
    <GoalCreatePanel
      heading={<h1>Goals</h1>}
      description={<p>Choose a direction.</p>}
    />,
  );
}

describe("GoalCreatePanel", () => {
  it("keeps the form collapsed with Create goal beside the heading", () => {
    renderPanel();

    const heading = screen.getByRole("heading", { name: "Goals" });
    const createGoalButton = screen.getByRole("button", {
      name: "Create goal",
    });

    expect(screen.queryByLabelText("Goal title")).not.toBeInTheDocument();
    expect(heading.parentElement).toContainElement(createGoalButton);
  });

  it("opens and focuses the form when Create goal is selected", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(screen.getByLabelText("Goal title")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("collapses the form when Cancel is selected", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Goal title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create goal" })).toBeVisible();
  });
});
