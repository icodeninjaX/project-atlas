import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FinancialOverview } from "./financial-overview";

afterEach(cleanup);

describe("FinancialOverview", () => {
  it("prioritizes available balance and keeps supporting finance links quiet", () => {
    render(
      <FinancialOverview
        metrics={[
          {
            label: "Available",
            value: "₱13,043.00",
            note: "Across active accounts",
          },
          {
            label: "Income",
            value: "₱50,500.00",
            note: "Transfers excluded",
          },
          {
            label: "Expenses",
            value: "₱40,975.00",
            note: "₱9,525.00 budget left",
            sensitiveNote: true,
          },
          {
            label: "Debt remaining",
            value: "₱144,919.00",
            note: "Next due Oct 16",
          },
        ]}
      />,
    );

    expect(screen.getByText("Available balance")).toBeInTheDocument();
    expect(screen.getByText("₱13,043").closest("dd")).toHaveClass(
      "text-[2rem]",
    );
    expect(screen.queryByText("₱13,043.00")).not.toBeInTheDocument();
    expect(screen.getByText("₱40,975").closest("dd")).toHaveClass("text-sm");
    expect(screen.getByText("₱9,525 budget left")).toBeInTheDocument();
    expect(screen.getByText("Next due Oct 16")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Money" })).toHaveAttribute(
      "href",
      "/money/accounts",
    );
    expect(screen.getByRole("link", { name: "View runway" })).toHaveAttribute(
      "href",
      "/money/runway",
    );
    expect(screen.queryByText("Money timeline")).not.toBeInTheDocument();
  });
});
