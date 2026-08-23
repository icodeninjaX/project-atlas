import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationForm } from "@/components/career/application-form";
import { PaymentForm } from "@/components/debts/payment-form";
import { AccountForm } from "@/components/money/account-form";
import { BalanceAdjustmentForm } from "@/components/money/balance-adjustment-form";
import { TransactionForm } from "@/components/money/transaction-form";
import { TransferForm } from "@/components/money/transfer-form";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";

afterEach(cleanup);

function expectVisibleLabel(name: string) {
  const control = screen.getByLabelText(name);
  const label =
    control.closest("label") ??
    (control.id ? document.querySelector(`label[for="${control.id}"]`) : null);
  expect(label).not.toBeNull();
  expect(label).not.toHaveClass("sr-only");
}

describe("primary create forms", () => {
  it("keeps quick-task labels visible after values are entered", () => {
    render(<QuickTaskForm />);

    expectVisibleLabel("Task title");
    expectVisibleLabel("Scheduled date");
    expectVisibleLabel("Exact time");
    expectVisibleLabel("Priority");
    expectVisibleLabel("Estimated minutes");

    expect(screen.getByLabelText("Estimated minutes")).toHaveAttribute(
      "name",
      "estimatedMinutes",
    );
    expect(screen.getByLabelText("Exact time")).toHaveAttribute(
      "name",
      "scheduledTime",
    );
  });

  it("uses visible labels for account details", () => {
    render(<AccountForm />);

    expectVisibleLabel("Account name");
    expectVisibleLabel("Account type");
    expectVisibleLabel("Institution");
    expectVisibleLabel("Opening balance in pesos");
  });

  it("uses visible labels when adjusting an account balance", () => {
    render(
      <BalanceAdjustmentForm
        accountId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        accountName="GCash"
        currentBalanceCentavos={70_100}
        today="2026-08-13"
      />,
    );

    expectVisibleLabel("New current balance for GCash in pesos");
    expectVisibleLabel("Balance adjustment date for GCash");
    expectVisibleLabel("Balance adjustment note for GCash");
  });

  it("uses visible labels for transaction details", () => {
    render(
      <TransactionForm
        accounts={[
          { id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb", name: "Cash" },
        ]}
        categories={[
          {
            id: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
            name: "Food",
            category_type: "expense",
          },
        ]}
        today="2026-08-02"
      />,
    );

    expectVisibleLabel("Transaction type");
    expectVisibleLabel("Account");
    expectVisibleLabel("Category");
    expectVisibleLabel("Amount in pesos");
    expectVisibleLabel("Transaction date");
  });

  it("uses visible labels for transfer details", () => {
    render(
      <TransferForm
        accounts={[
          { id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb", name: "Cash" },
          {
            id: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
            name: "Savings",
          },
        ]}
        today="2026-08-02"
      />,
    );

    expectVisibleLabel("Source account");
    expectVisibleLabel("Destination account");
    expectVisibleLabel("Transfer amount in pesos");
    expectVisibleLabel("Transfer date");
    expectVisibleLabel("Transfer description");
    expect(
      screen.getByRole("button", { name: "Record transfer" }),
    ).toBeEnabled();
  });

  it("uses visible labels when recording a debt payment", () => {
    render(
      <PaymentForm
        debtId="3d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        today="2026-08-02"
      />,
    );

    expectVisibleLabel("Payment amount in pesos");
    expectVisibleLabel("Payment date");
    expectVisibleLabel("Payment note");
  });

  it("uses visible labels for the essential career fields", () => {
    render(<ApplicationForm />);

    expectVisibleLabel("Company name");
    expectVisibleLabel("Role title");
    expectVisibleLabel("Application stage");
    expectVisibleLabel("Work setup");
    expectVisibleLabel("Employment type");
    expectVisibleLabel("Location");
    expectVisibleLabel("Job posting link");
    expectVisibleLabel("Date applied");
    expectVisibleLabel("Next action");
    expectVisibleLabel("Next action due date");
    expectVisibleLabel("Minimum salary in pesos");
    expectVisibleLabel("Maximum salary in pesos");
    expectVisibleLabel("Contact name");
    expectVisibleLabel("Contact email");
    expectVisibleLabel("Resume version");
    expectVisibleLabel("Application notes");

    expect(screen.getByLabelText("Date applied")).toHaveAccessibleDescription(
      "When you submitted the application. Leave blank if you have not applied yet.",
    );
    expect(
      screen.getByLabelText("Next action due date"),
    ).toHaveAccessibleDescription("When you plan to complete the next action.");
  });
});
