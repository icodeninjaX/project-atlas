import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WeekPosition } from "./week-position";

afterEach(cleanup);

describe("WeekPosition", () => {
  it("says where today sits in the week and when it closes", () => {
    render(<WeekPosition dayIndex={3} reviewComplete={false} />);

    expect(
      screen.getByRole("heading", { name: "Week position" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Day 4 of 7")).toBeInTheDocument();
    expect(screen.getByText("Review when the week closes")).toBeInTheDocument();
    expect(
      screen.getByText("It closes on Sunday, in 3 days."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open weekly reviews/ }),
    ).toHaveAttribute("href", "/reviews");
  });

  it("handles the last day and a reviewed week", () => {
    const { rerender } = render(
      <WeekPosition dayIndex={6} reviewComplete={false} />,
    );
    expect(screen.getByText("The week closes today.")).toBeInTheDocument();

    rerender(<WeekPosition dayIndex={2} reviewComplete />);
    expect(screen.getByText("This week is reviewed")).toBeInTheDocument();
    expect(screen.queryByText(/closes/)).not.toBeInTheDocument();
  });
});
