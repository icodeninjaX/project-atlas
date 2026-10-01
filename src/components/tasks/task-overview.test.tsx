import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskOverview } from "./task-overview";

afterEach(cleanup);

describe("TaskOverview", () => {
  it("leads with what is left and reports progress to assistive tech", () => {
    render(
      <TaskOverview
        summary={{
          total: 7,
          done: 2,
          remaining: 5,
          minutesLeft: 150,
          nextTime: "09:30",
        }}
        overdueCount={2}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Today’s plan" }),
    ).toHaveTextContent("5 left");
    expect(screen.getByText("2 of 7 done today")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Today’s tasks finished" }),
    ).toHaveAttribute("aria-valuetext", "2 of 7 finished");
    expect(screen.getByText("2h 30m")).toBeVisible();
    expect(screen.getByText("9:30 AM")).toBeVisible();
    expect(screen.getByText("2")).toHaveClass("text-destructive");
  });

  it("calls an empty day open rather than 0% done", () => {
    render(
      <TaskOverview
        summary={{
          total: 0,
          done: 0,
          remaining: 0,
          minutesLeft: 0,
          nextTime: null,
        }}
        overdueCount={0}
      />,
    );

    expect(screen.getByText("Open day")).toBeVisible();
    expect(screen.queryByText("0")).not.toHaveClass("text-destructive");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Nothing scheduled",
    );
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("celebrates a finished day", () => {
    render(
      <TaskOverview
        summary={{
          total: 3,
          done: 3,
          remaining: 0,
          minutesLeft: 0,
          nextTime: null,
        }}
        overdueCount={0}
      />,
    );

    expect(screen.getByText("All done")).toBeVisible();
    expect(
      screen.getByText("You finished all 3 of today’s tasks."),
    ).toBeVisible();
  });
});
