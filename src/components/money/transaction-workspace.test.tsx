import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransactionWorkspace } from "./transaction-workspace";

afterEach(cleanup);

vi.mock("@/components/ui/tooltip", () => ({
  TooltipHint: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/money/transaction-form", () => ({
  TransactionForm: ({ transaction }: { transaction?: { id: string } }) => (
    <div data-testid={transaction ? `edit-${transaction.id}` : "record-form"} />
  ),
}));

const props = {
  accounts: [{ id: "account-1", name: "Cash" }],
  categories: [{ id: "category-1", name: "Food", category_type: "expense" }],
  today: "2026-08-24",
  defaultAccountId: "account-1",
  transactions: [
    {
      id: "transaction-1",
      account_id: "account-1",
      category_id: "category-1",
      transaction_type: "expense" as const,
      amount_centavos: 12550,
      transaction_date: "2026-08-24",
      merchant_or_source: "Canteen",
      description: null,
      account_name: "Cash",
      category_name: "Food",
    },
  ],
};

describe("TransactionWorkspace", () => {
  it("shows only the transaction action buttons by default", () => {
    render(<TransactionWorkspace {...props} />);

    expect(
      screen.getByRole("button", { name: "Record a transaction" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "View transaction history" }),
    ).toBeVisible();
    expect(screen.queryByTestId("record-form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "History" }),
    ).not.toBeInTheDocument();
  });

  it("opens the selected transaction view", () => {
    render(<TransactionWorkspace {...props} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Record a transaction" }),
    );
    expect(screen.getByTestId("record-form")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "View transaction history" }),
    );
    expect(screen.queryByTestId("record-form")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeVisible();
    expect(screen.getByText("Canteen")).toBeVisible();
  });

  it("reveals row edit and delete controls only in History edit mode", () => {
    render(<TransactionWorkspace {...props} initialView="history" />);

    expect(
      screen.queryByRole("button", { name: "Delete transaction" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Edit transaction")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit transaction history" }),
    );

    expect(
      screen.getByRole("button", { name: "Delete transaction" }),
    ).toBeVisible();
    expect(screen.getByText("Edit transaction")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Finish editing transaction history",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Finish editing transaction history",
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Delete transaction" }),
    ).not.toBeInTheDocument();
  });
});
