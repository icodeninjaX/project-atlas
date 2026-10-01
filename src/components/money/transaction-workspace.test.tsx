import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransactionWorkspace } from "./transaction-workspace";

afterEach(() => {
  cleanup();
  replace.mockClear();
});

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipHint: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/money/transaction-form", () => ({
  TransactionForm: ({ transaction }: { transaction?: { id: string } }) => (
    <div data-testid={transaction ? `edit-${transaction.id}` : "record-form"} />
  ),
}));

const transaction = {
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
  category_icon: "utensils",
};

const props = {
  accounts: [
    { id: "account-1", name: "Cash" },
    { id: "account-2", name: "GCash" },
  ],
  categories: [{ id: "category-1", name: "Food", category_type: "expense" }],
  today: "2026-08-24",
  defaultAccountId: "account-1",
  transactions: [
    transaction,
    {
      ...transaction,
      id: "transaction-2",
      account_id: "account-2",
      transaction_type: "income" as const,
      amount_centavos: 500000,
      transaction_date: "2026-08-23",
      merchant_or_source: "Payroll",
      account_name: "GCash",
      category_name: "Salary",
    },
  ],
};

describe("TransactionWorkspace", () => {
  it("shows history by default and opens transaction capture on demand", () => {
    render(<TransactionWorkspace {...props} summary={<p>Month summary</p>} />);

    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Record a transaction" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("record-form")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeVisible();
    expect(screen.getByText("Month summary")).toBeVisible();
    expect(screen.getByText("Canteen")).toBeVisible();
  });

  it("puts the record form first and the summary away while recording", () => {
    render(<TransactionWorkspace {...props} summary={<p>Month summary</p>} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Record a transaction" }),
    );
    expect(screen.getByTestId("record-form")).toBeVisible();
    expect(screen.queryByText("Month summary")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.queryByTestId("record-form")).not.toBeInTheDocument();
    expect(screen.getByText("Canteen")).toBeVisible();
  });

  it("groups history by day with each day's net", () => {
    render(<TransactionWorkspace {...props} />);

    const today = screen.getByRole("region", { name: /^Today/ });
    expect(within(today).getByText("Canteen")).toBeVisible();
    expect(within(today).getAllByText("−₱125.50")).toHaveLength(2);
    const yesterday = screen.getByRole("region", { name: /^Yesterday/ });
    expect(within(yesterday).getAllByText("+₱5,000.00")).toHaveLength(2);
  });

  it("filters history by search and type", () => {
    render(<TransactionWorkspace {...props} />);

    fireEvent.change(screen.getByLabelText("Search transactions"), {
      target: { value: "pay" },
    });
    expect(screen.queryByText("Canteen")).not.toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeVisible();
    expect(screen.getByText("1 of 2 shown")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("No transactions match")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Canteen")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("filters by account through the URL so the server applies it", () => {
    render(<TransactionWorkspace {...props} />);

    fireEvent.change(screen.getByLabelText("Filter by account"), {
      target: { value: "account-2" },
    });

    expect(replace).toHaveBeenCalledWith(
      "/money/transactions?account=account-2",
      { scroll: false },
    );
  });

  it("shows the account from the URL and returns to all accounts", () => {
    render(
      <TransactionWorkspace
        {...props}
        transactions={props.transactions.slice(1)}
        accountFilter="account-2"
      />,
    );

    expect(screen.getByLabelText("Filter by account")).toHaveValue("account-2");
    expect(screen.getByText("1 entry · GCash")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Filter by account"), {
      target: { value: "all" },
    });
    expect(replace).toHaveBeenCalledWith("/money/transactions", {
      scroll: false,
    });
  });

  it("explains an account with no transactions instead of the first-run state", () => {
    render(
      <TransactionWorkspace
        {...props}
        transactions={[]}
        accountFilter="account-2"
      />,
    );

    expect(screen.getByText("No transactions in GCash yet")).toBeVisible();
    expect(
      screen.queryByText("No money movement recorded"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all accounts" }));
    expect(replace).toHaveBeenCalledWith("/money/transactions", {
      scroll: false,
    });
  });

  it("opens a transaction to edit it and asks before deleting", () => {
    render(<TransactionWorkspace {...props} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Edit Canteen/ }));

    const sheet = screen.getByRole("dialog", { name: "Canteen" });
    expect(within(sheet).getByTestId("edit-transaction-1")).toBeVisible();
    expect(
      within(sheet).queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(sheet).getByRole("button", { name: "Delete transaction" }),
    );
    expect(within(sheet).getByText("Delete this transaction?")).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Delete" })).toBeVisible();
  });
});
