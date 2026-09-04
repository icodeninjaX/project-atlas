import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TransactionForm } from "./transaction-form";

afterEach(cleanup);

const categories = [
  { id: "food", name: "Food", category_type: "expense" },
  { id: "salary", name: "Salary", category_type: "income" },
  { id: "bonus", name: "Bonus", category_type: "income" },
];

describe("TransactionForm", () => {
  it("clears an expense category and shows income categories when the type changes", async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        accounts={[{ id: "cash", name: "Cash" }]}
        categories={categories}
        today="2026-09-04"
      />,
    );

    const type = screen.getByLabelText("Transaction type");
    const category = screen.getByLabelText("Category");

    await user.selectOptions(category, "food");
    expect(category).toHaveValue("food");

    await user.selectOptions(type, "income");

    expect(category).toHaveValue("");
    expect(
      screen.queryByRole("option", { name: "Food" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Salary" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bonus" })).toBeInTheDocument();
  });

  it("keeps the type and category options in sync when the form resets", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TransactionForm
        accounts={[{ id: "cash", name: "Cash" }]}
        categories={categories}
        today="2026-09-04"
      />,
    );

    const type = screen.getByLabelText("Transaction type");
    const category = screen.getByLabelText("Category");

    await user.selectOptions(type, "income");
    await user.selectOptions(category, "salary");
    fireEvent.reset(container.querySelector("form")!);

    expect(type).toHaveValue("expense");
    expect(category).toHaveValue("");
    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Salary" }),
    ).not.toBeInTheDocument();
  });
});
