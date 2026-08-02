import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DebtForm } from "@/components/debts/debt-form";
import { GoalForm } from "@/components/goals/goal-form";
import { TransactionForm } from "@/components/money/transaction-form";
import { TaskEditForm } from "@/components/tasks/task-edit-form";

afterEach(cleanup);

describe("edit form parity", () => {
  it("keeps every persisted task field available while editing", () => {
    render(
      <TaskEditForm
        task={{
          id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
          title: "Prepare portfolio",
          description: "Include the latest case study",
          priority: "high",
          scheduled_for: "2026-08-04",
          estimated_minutes: 45,
          status: "planned",
        }}
      />,
    );

    expect(screen.getByLabelText("Task title")).toHaveValue(
      "Prepare portfolio",
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Include the latest case study",
    );
    expect(screen.getByLabelText("Scheduled date")).toHaveValue("2026-08-04");
    expect(screen.getByLabelText("Estimated minutes")).toHaveValue(45);
    expect(screen.getByLabelText("Priority")).toHaveValue("high");
  });

  it("keeps every persisted goal field available while editing", () => {
    const goal = {
      id: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      title: "Launch portfolio",
      description: "Publish three detailed case studies",
      area: "career",
      status: "paused",
      target_date: "2026-09-30",
      progress_percent: 40,
      success_definition: "Portfolio is live and shared with five leads",
    };

    render(<GoalForm goal={goal} />);

    expect(screen.getByLabelText("Goal title")).toHaveValue(goal.title);
    expect(screen.getByLabelText("Description")).toHaveValue(goal.description);
    expect(screen.getByLabelText("Status")).toHaveValue(goal.status);
    expect(screen.getByLabelText("Success definition")).toHaveValue(
      goal.success_definition,
    );
  });

  it("keeps debt schedule and notes available while editing", () => {
    const debt = {
      id: "3d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      creditor_name: "Maya Credit",
      debt_type: "personal_loan",
      original_balance_centavos: 50_000,
      current_balance_centavos: 37_500,
      interest_rate_percent: 12,
      minimum_payment_centavos: 5_000,
      due_day: 15,
      next_due_date: "2026-08-15",
      status: "active",
      priority: 2,
      notes: "Pay after the second payroll",
    };

    render(<DebtForm debt={debt} />);

    expect(screen.getByLabelText("Due day")).toHaveValue(15);
    expect(screen.getByLabelText("Notes")).toHaveValue(debt.notes);
  });

  it("preselects the saved account when editing a transaction", () => {
    render(
      <TransactionForm
        accounts={[
          { id: "4d334d84-4e32-46fa-bbdb-05ce7dc0dfbb", name: "Cash" },
          { id: "5d334d84-4e32-46fa-bbdb-05ce7dc0dfbb", name: "Maya" },
        ]}
        categories={[
          {
            id: "6d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
            name: "Food",
            category_type: "expense",
          },
        ]}
        today="2026-08-02"
        transaction={{
          id: "7d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
          account_id: "5d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
          category_id: "6d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
          transaction_type: "expense",
          amount_centavos: 12_550,
          transaction_date: "2026-08-01",
          merchant_or_source: "Grocery",
          description: "Weekly supplies",
        }}
      />,
    );

    expect(screen.getByLabelText("Account")).toHaveValue(
      "5d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );
  });
});
