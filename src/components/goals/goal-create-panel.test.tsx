import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalCreatePanel } from "./goal-create-panel";

afterEach(cleanup);

function renderPanel() {
  return render(
    <GoalCreatePanel title="Goals" description="Choose a direction." />,
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
    expect(heading.closest("header")).toContainElement(createGoalButton);
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

  it("returns focus to Create goal when the form closes", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Create goal" })).toHaveFocus();
  });

  it("keeps everything typed when the save is rejected", async () => {
    // Outside the signed-in app the offline submitter always rejects.
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));
    fireEvent.change(screen.getByLabelText("Goal title"), {
      target: { value: "Run a marathon" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Train four days a week" },
    });

    fireEvent.submit(screen.getByLabelText("Goal title").closest("form")!);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create goal" }),
      ).not.toBeDisabled(),
    );
    expect(screen.getByLabelText("Goal title")).toHaveValue("Run a marathon");
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Train four days a week",
    );
  });
});
