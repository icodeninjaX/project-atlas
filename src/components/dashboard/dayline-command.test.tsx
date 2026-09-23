import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DaylineCommand, type DashboardDaylineItem } from "./dayline-command";

const items: DashboardDaylineItem[] = [
  {
    id: "task-1",
    kind: "task",
    position: "NOW",
    title: "Finish the design pass",
    reason: "Due today · High priority · Focus work",
    durationMinutes: 45,
    href: "/tasks?highlight=task-1",
  },
  {
    id: "goal-1",
    kind: "goal",
    position: "NEXT",
    title: "Review the launch goal",
    reason: "Milestone due soon · Medium priority",
    durationMinutes: 20,
    href: "/goals?highlight=goal-1",
  },
];

afterEach(cleanup);

describe("DaylineCommand", () => {
  it("gives NOW the primary action while keeping later work reachable", () => {
    render(
      <DaylineCommand
        items={items}
        plannedMinutes={65}
        capacityMinutes={180}
        energyLevel="medium"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Your route through today" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open this next/ }),
    ).toHaveAttribute("href", "/tasks?highlight=task-1");
    expect(
      screen.getByRole("link", { name: /Review the launch goal/ }),
    ).toHaveAttribute("href", "/goals?highlight=goal-1");
    expect(screen.getByText(/65 of 180 minutes planned/)).toBeInTheDocument();
  });

  it("shows a calm empty state without removing planning controls", () => {
    render(<DaylineCommand items={[]} />);

    expect(
      screen.getByText("Nothing urgent is competing for attention."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tune Dayline planning" }),
    ).toHaveAttribute("href", "/settings");
  });
});
