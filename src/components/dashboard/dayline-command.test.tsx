import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("shows how full the day is, with the open time and energy", () => {
    render(
      <DaylineCommand
        items={items}
        plannedMinutes={65}
        capacityMinutes={180}
        energyLevel="medium"
      />,
    );

    const load = screen.getByRole("meter", { name: "Day load" });
    expect(load).toHaveAttribute("aria-valuenow", "36");
    expect(load).toHaveAttribute("aria-valuetext", "65 of 180 minutes planned");
    expect(screen.getByText("115 min still open")).toBeInTheDocument();
    expect(screen.getByText("Medium energy")).toBeInTheDocument();
  });

  it("names an overfull day in words", () => {
    render(
      <DaylineCommand
        items={items}
        plannedMinutes={200}
        capacityMinutes={180}
      />,
    );

    expect(screen.getByRole("meter", { name: "Day load" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByText("20 min over capacity")).toBeInTheDocument();
  });

  it("lists why NOW is first, and what kind of work each stop is", () => {
    render(<DaylineCommand items={items} />);

    const reasons = screen.getByRole("list", {
      name: "Why it is on your route",
    });
    expect(
      within(reasons)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Due today", "High priority"]);
    expect(screen.getByText("Task")).toBeInTheDocument();
    const next = screen.getByRole("link", { name: /Review the launch goal/ });
    expect(next).toHaveTextContent(/^NEXT/);
    expect(within(next).getByText("Goal")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 priorities")).toBeInTheDocument();
  });

  it("times the route from now and shows the open time", () => {
    render(
      <DaylineCommand
        items={[
          ...items,
          {
            id: "career-1",
            kind: "career",
            position: "LATER",
            title: "Follow up with Acme",
            reason: "Career next action is due",
            durationMinutes: 15,
            href: "/career?highlight=career-1",
          },
        ]}
        plannedMinutes={80}
        capacityMinutes={180}
        now={new Date("2026-10-14T09:12:00+08:00")}
      />,
    );

    expect(screen.getByText("Your route from 9:12 AM")).toBeInTheDocument();
    expect(screen.getByText(/Clear by 10:32 AM/)).toBeInTheDocument();
    expect(screen.getByText(/until 9:57 AM/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review the launch goal/ }),
    ).toHaveTextContent("9:57 AM");
    expect(
      screen.getByRole("link", { name: /Follow up with Acme/ }),
    ).toHaveTextContent("10:17 AM");
    const timing = screen.getByRole("list", { name: "Route timing" });
    expect(
      within(timing)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Now45 min", "Next20 min", "Later15 min", "Open1 h 40 min"]);
  });

  it("leaves the route untimed when a stop has no estimate", () => {
    render(
      <DaylineCommand
        items={[items[0]!, { ...items[1]!, durationMinutes: null }]}
        now={new Date("2026-10-14T09:12:00+08:00")}
      />,
    );

    expect(screen.getByText("Then on your route")).toBeInTheDocument();
    expect(screen.queryByText(/Clear by/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Route timing" }),
    ).not.toBeInTheDocument();
  });

  it("shows a calm empty state without removing planning controls", () => {
    render(<DaylineCommand items={[]} />);

    expect(
      screen.getByText("Nothing urgent is competing for attention."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tune Dayline planning" }),
    ).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("allows long primary content to wrap without forcing a fixed action width", () => {
    render(
      <DaylineCommand
        items={[
          {
            ...items[0]!,
            title:
              "Prepare complete final documentation for the client onboarding and production handoff",
            reason:
              "Why this is here: the translated client requirements need a final accessibility review",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Prepare complete final/ }),
    ).toHaveClass("break-words", "min-w-0");
    // Full width on phones, where it sits under the thumb.
    expect(screen.getByRole("link", { name: /Open this next/ })).toHaveClass(
      "w-full",
      "min-w-0",
      "sm:w-auto",
    );
  });
});
