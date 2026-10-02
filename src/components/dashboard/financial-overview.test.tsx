import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FinancialOverview,
  type FinancialSnapshot,
} from "./financial-overview";

afterEach(cleanup);

const financial: FinancialSnapshot = {
  total_balance_centavos: 1_304_350,
  income_month_centavos: 5_050_000,
  expense_month_centavos: 4_097_500,
  remaining_budget_centavos: 952_500,
  debt_remaining_centavos: 14_491_900,
  next_financial_deadline: "2026-10-16",
  days_until_payday: 14,
};

describe("FinancialOverview", () => {
  it("leads with the available balance and keeps money links reachable", () => {
    render(<FinancialOverview financial={financial} monthName="October" />);

    expect(screen.getByText("Available balance")).toBeInTheDocument();
    const balance = screen.getByText("Available balance").nextElementSibling;
    expect(balance).toHaveTextContent("₱13,043.50");
    expect(balance).toHaveClass("[overflow-wrap:anywhere]");
    expect(screen.getByText("Payday in 14 days")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Money" })).toHaveAttribute(
      "href",
      "/money/accounts",
    );
    expect(screen.getByRole("link", { name: "View runway" })).toHaveAttribute(
      "href",
      "/money/runway",
    );
  });

  it("shows the month's cash flow, budget use, and next debt deadline", () => {
    render(<FinancialOverview financial={financial} monthName="October" />);

    expect(screen.getByText("October so far")).toBeInTheDocument();
    expect(screen.getByText("Money in").nextElementSibling).toHaveTextContent(
      "₱50,500.00",
    );
    expect(screen.getByText("Money out").nextElementSibling).toHaveTextContent(
      "₱40,975.00",
    );
    expect(screen.getByText(/kept so far/)).toHaveTextContent(
      "+₱9,525.00 kept so far",
    );

    const budget = screen.getByRole("link", { name: /Budget left/ });
    expect(budget).toHaveAttribute("href", "/money/budget");
    expect(budget).toHaveTextContent("₱9,525.00");
    expect(budget).toHaveTextContent("81% of ₱50,500.00 used");

    const debt = screen.getByRole("link", { name: /Debt remaining/ });
    expect(debt).toHaveAttribute("href", "/debts");
    expect(debt).toHaveTextContent("₱144,919.00");
    expect(debt).toHaveTextContent("Next due Oct 16, 2026");
  });

  it("adds the savings rate and how far through the month the budget is", () => {
    render(
      <FinancialOverview
        financial={financial}
        monthName="October"
        pace={{
          phase: "current",
          daysInMonth: 31,
          daysElapsed: 14,
          daysLeft: 18,
          elapsedRatio: 14 / 31,
        }}
      />,
    );

    // ₱9,525 kept of ₱50,500 income.
    expect(screen.getByText("19% of income")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Budget left/ })).toHaveTextContent(
      "Day 14 of 31",
    );
  });

  it("leaves out the savings rate when more went out than came in", () => {
    render(
      <FinancialOverview
        financial={{ ...financial, expense_month_centavos: 6_000_000 }}
        monthName="October"
      />,
    );

    expect(screen.getByText(/more out than in/)).toBeInTheDocument();
    expect(screen.queryByText(/of income/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Day \d+ of/)).not.toBeInTheDocument();
  });

  it("names overspending and an unplanned month plainly", () => {
    const { rerender } = render(
      <FinancialOverview
        financial={{ ...financial, remaining_budget_centavos: -50_000 }}
        monthName="October"
      />,
    );

    expect(
      screen.getByRole("link", { name: /Over budget by\s*₱500\.00/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Budget left")).not.toBeInTheDocument();

    rerender(
      <FinancialOverview
        financial={{
          ...financial,
          remaining_budget_centavos: null,
          income_month_centavos: 0,
          expense_month_centavos: 0,
          next_financial_deadline: null,
          days_until_payday: null,
        }}
        monthName="October"
      />,
    );

    expect(
      screen.getByRole("link", { name: /No budget set.*Plan October/ }),
    ).toHaveAttribute("href", "/money/budget");
    expect(
      screen.getByText("No income or expenses recorded yet this month."),
    ).toBeInTheDocument();
    expect(screen.getByText("No active deadline")).toBeInTheDocument();
    expect(screen.queryByText(/Payday/)).not.toBeInTheDocument();
  });

  it("keeps large balances visible", () => {
    render(
      <FinancialOverview
        financial={{
          ...financial,
          total_balance_centavos: 1_234_567_850,
          debt_remaining_centavos: 1_234_567_850,
        }}
        monthName="October"
      />,
    );

    expect(
      screen.getByText("Available balance").nextElementSibling,
    ).toHaveTextContent("₱12,345,678.50");
    expect(
      screen.getByRole("link", { name: /Debt remaining/ }),
    ).toHaveTextContent("₱12,345,678.50");
  });
});
