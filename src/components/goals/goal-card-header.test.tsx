import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { GoalCardHeader } from "./goal-card-header";

afterEach(cleanup);

describe("GoalCardHeader", () => {
  it("uses an icon-only edit action aligned with the goal area", () => {
    render(
      <GoalCardHeader
        goal={{
          id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
          title: "Launch portfolio",
          description: "Publish three case studies",
          area: "personal",
          status: "active",
          target_date: "2026-09-30",
          progress_percent: 40,
          success_definition: "Share the portfolio with five leads",
        }}
      />,
    );

    const editButton = screen.getByRole("button", {
      name: "Edit Launch portfolio",
    });
    expect(editButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Edit goal")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Goal title")).not.toBeInTheDocument();

    fireEvent.click(editButton);

    expect(editButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Goal title")).toHaveValue("Launch portfolio");
  });
});
