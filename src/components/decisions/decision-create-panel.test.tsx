import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecisionCreatePanel } from "./decision-create-panel";

vi.mock("@/lib/decisions/actions", () => ({
  saveDecisionAction: vi.fn(),
}));

afterEach(cleanup);

const goals = [{ id: "goal-1", title: "Find work" }];

describe("DecisionCreatePanel", () => {
  it("shows past decisions first and opens the form on request", async () => {
    const user = userEvent.setup();
    render(
      <DecisionCreatePanel goals={goals} today="2026-09-26">
        <p>Past decision</p>
      </DecisionCreatePanel>,
    );

    expect(screen.getByText("Past decision")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Decision" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Record a decision" }));

    expect(screen.getByRole("textbox", { name: "Decision" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("textbox", { name: "Decision" }),
    ).not.toBeInTheDocument();
  });

  it("starts open without a cancel button for an empty journal", () => {
    render(
      <DecisionCreatePanel goals={goals} today="2026-09-26" startOpen>
        <p>No decisions recorded yet</p>
      </DecisionCreatePanel>,
    );

    expect(screen.getByRole("textbox", { name: "Decision" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record a decision" }),
    ).not.toBeInTheDocument();
  });
});
