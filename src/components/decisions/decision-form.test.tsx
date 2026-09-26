import { cleanup, render, screen } from "@testing-library/react";
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
});
