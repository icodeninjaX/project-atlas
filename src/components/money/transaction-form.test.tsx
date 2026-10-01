import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import { TransactionForm } from "./transaction-form";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const categories = [
  { id: "food", name: "Food", category_type: "expense", icon: "utensils" },
  { id: "transport", name: "Transportation", category_type: "expense" },
  { id: "salary", name: "Salary", category_type: "income", icon: "briefcase" },
  { id: "bonus", name: "Bonus", category_type: "income", icon: "gift" },
];

const accounts = [
  {
    id: "cash",
    name: "Cash",
    account_type: "cash",
    current_balance_centavos: 50_000,
  },
  {
    id: "gcash",
    name: "GCash",
    account_type: "e_wallet",
    provider_id: "gcash",
    current_balance_centavos: 120_000,
  },
];

function withSubmit(submit = vi.fn()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <OfflineContext.Provider
        value={{
          userId: "user",
          online: true,
          pending: 0,
          blocked: 0,
          lastSyncedAt: null,
          submit,
          retry: async () => undefined,
          syncNow: async () => undefined,
          clearPrivateCache: async () => undefined,
        }}
      >
        {children}
      </OfflineContext.Provider>
    );
  };
}

describe("TransactionForm", () => {
  it("clears the category and shows income categories when the type changes", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Food" }));
    expect(screen.getByRole("radio", { name: "Food" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Income" }));

    expect(
      screen.queryByRole("radio", { name: "Food" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Salary" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Bonus" })).not.toBeChecked();
    expect(screen.getByText("Received into")).toBeInTheDocument();
  });

  it("starts from the default account and shows its balance after the entry", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
        defaultAccountId="gcash"
      />,
    );

    expect(screen.getByRole("radio", { name: "GCash" })).toBeChecked();
    await user.type(screen.getByLabelText("Amount in pesos"), "250.5");

    const impact = screen.getByText("GCash after this").parentElement!;
    expect(impact).toHaveTextContent("GCash after this₱1,200.00₱949.50");
    expect(
      screen.getByRole("button", { name: /Record expense ₱250\.50/ }),
    ).toBeEnabled();
  });

  it("keeps typed amounts to two decimals and formats them on blur", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
      />,
    );

    const amount = screen.getByLabelText("Amount in pesos");
    await user.type(amount, "1234.567");
    expect(amount).toHaveValue("1234.56");
    await user.tab();
    expect(amount).toHaveValue("1,234.56");
  });

  it("brings back a remembered merchant's category", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
        merchantMemory={[
          { merchant: "Jollibee", type: "expense", categoryId: "food" },
        ]}
      />,
    );

    await user.type(screen.getByLabelText("Merchant or source"), "jollibee");

    expect(screen.getByRole("radio", { name: "Food" })).toBeChecked();
  });

  it("offers today and yesterday as one-tap dates", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
      />,
    );

    expect(screen.getByLabelText("Transaction date")).toHaveValue("2026-09-04");
    await user.click(screen.getByRole("button", { name: "Yesterday" }));
    expect(screen.getByLabelText("Transaction date")).toHaveValue("2026-09-03");
    expect(screen.getByRole("button", { name: "Yesterday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clears the entry but keeps type, account, and date for the next one", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({
      success: true,
      message: "Transaction recorded.",
    }));
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
      />,
      { wrapper: withSubmit(submit) },
    );

    await user.click(screen.getByRole("radio", { name: "Income" }));
    await user.type(screen.getByLabelText("Amount in pesos"), "1000");
    await user.click(screen.getByRole("radio", { name: "Salary" }));
    await user.click(screen.getByRole("radio", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "Yesterday" }));
    await user.type(screen.getByLabelText("Merchant or source"), "Payroll");
    await user.click(screen.getByRole("button", { name: /Record income/ }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const [mutation, formData] = submit.mock.calls[0] as unknown as [
      string,
      FormData,
    ];
    expect(mutation).toBe("transaction.create");
    expect(Object.fromEntries(formData)).toMatchObject({
      type: "income",
      amount: "1,000.00",
      categoryId: "salary",
      accountId: "cash",
      transactionDate: "2026-09-03",
      merchantOrSource: "Payroll",
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Amount in pesos")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Amount in pesos")).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Salary" })).not.toBeChecked();
    expect(screen.getByLabelText("Merchant or source")).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Income" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cash" })).toBeChecked();
    expect(screen.getByLabelText("Transaction date")).toHaveValue("2026-09-03");
  });

  it("edits an existing transaction without a balance preview", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({
      success: true,
      message: "Transaction updated.",
    }));
    const onSuccess = vi.fn();
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        today="2026-09-04"
        layout="compact"
        onSuccess={onSuccess}
        transaction={{
          id: "transaction-1",
          account_id: "gcash",
          category_id: "food",
          transaction_type: "expense",
          amount_centavos: 12_550,
          transaction_date: "2026-09-01",
          merchant_or_source: "Canteen",
          description: null,
        }}
      />,
      { wrapper: withSubmit(submit) },
    );

    expect(screen.getByLabelText("Amount in pesos")).toHaveValue("125.50");
    expect(screen.queryByText("GCash after this")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledWith(
      "transaction.update",
      expect.any(FormData),
    );
  });
});
