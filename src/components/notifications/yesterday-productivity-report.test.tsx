import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { YesterdayProductivityReport } from "./yesterday-productivity-report";

const reportProps = {
  completedTaskCount: 3,
  summaryDate: "2026-08-24",
  userId: "10000000-0000-4000-8000-000000000001",
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("YesterdayProductivityReport", () => {
  it("shows an accessible daily progress card for yesterday's work", async () => {
    render(<YesterdayProductivityReport {...reportProps} />);

    const report = await screen.findByRole("dialog", {
      name: "A productive day, recorded.",
    });

    expect(report).toHaveTextContent("03");
    expect(report).toHaveTextContent("Three tasks were completed yesterday.");
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  it("uses singular copy for one completed task", async () => {
    render(
      <YesterdayProductivityReport {...reportProps} completedTaskCount={1} />,
    );

    const report = await screen.findByRole("dialog");
    expect(report).toHaveTextContent("01");
    expect(report).toHaveTextContent("One task was completed yesterday.");
  });

  it("does not open without completed tasks", () => {
    render(
      <YesterdayProductivityReport {...reportProps} completedTaskCount={0} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the primary action", async () => {
    const user = userEvent.setup();
    render(<YesterdayProductivityReport {...reportProps} />);

    await user.click(await screen.findByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("only opens once for a user and date", async () => {
    const firstRender = render(
      <YesterdayProductivityReport {...reportProps} />,
    );
    await screen.findByRole("dialog");
    firstRender.unmount();

    render(<YesterdayProductivityReport {...reportProps} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        "atlas:v2:yesterday-productivity-report:10000000-0000-4000-8000-000000000001:2026-08-24",
      ),
    ).toBe("shown");
  });

  it("still opens during React Strict Mode's effect replay", async () => {
    render(
      <StrictMode>
        <YesterdayProductivityReport
          {...reportProps}
          userId="strict-mode-user"
        />
      </StrictMode>,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
