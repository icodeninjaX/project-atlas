import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecisionForm } from "./decision-form";

vi.mock("@/lib/decisions/actions", () => ({
  saveDecisionAction: vi.fn(),
}));

afterEach(cleanup);

describe("DecisionForm", () => {
  it("asks for an explicit choice, outcome and review date with optional owner goals", () => {
    render(
      <DecisionForm
        today="2026-09-26"
        goals={[{ id: "goal-1", title: "Find work" }]}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Decision" })).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: "What will you do?" }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: "What do you hope will happen?" }),
    ).toBeRequired();
    expect(screen.getByLabelText("Review on")).toBeRequired();
    expect(
      screen.getByRole("option", { name: "Find work" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not prove the decision caused the change/i),
    ).toBeInTheDocument();
  });

  it("sets the review date from the decision date in one tap", async () => {
    const user = userEvent.setup();
    render(<DecisionForm today="2026-09-26" goals={[]} />);
    const review = screen.getByLabelText("Review on");
    expect(review).toHaveAttribute("min", "2026-09-27");
    await user.click(screen.getByRole("button", { name: "In 1 month" }));
    expect(review).toHaveValue("2026-10-26");
    expect(screen.getByRole("button", { name: "In 1 month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
