import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MilestoneList } from "./milestone-list";

afterEach(cleanup);

describe("MilestoneList", () => {
  it("keeps milestone details and creation controls collapsed by default", () => {
    render(
      <MilestoneList
        goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        milestones={[
          {
            id: "53f3368c-d188-4aef-82b3-2846ba974169",
            title: "Plan the route",
            target_date: "2026-09-01",
            completed_at: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Add milestone" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("Plan the route")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add milestone" }));

    expect(screen.getByLabelText("New milestone")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel adding milestone" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel adding milestone" }),
    );

    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();
  });
});
