import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DebtCreatePanel } from "./debt-create-panel";

afterEach(cleanup);

function renderPanel() {
  return render(
    <DebtCreatePanel
      heading={<h1>Debts</h1>}
      description={<p>Compare payoff strategies.</p>}
      summary={<p>Total remaining</p>}
    />,
  );
}

describe("DebtCreatePanel", () => {
  it("keeps the form collapsed with Add debt beside the heading", () => {
    renderPanel();

    const heading = screen.getByRole("heading", { name: "Debts" });
    const addDebtButton = screen.getByRole("button", { name: "Add debt" });

    expect(screen.queryByLabelText("Creditor name")).not.toBeInTheDocument();
    expect(heading.parentElement).toContainElement(addDebtButton);
    expect(screen.getByText("Total remaining")).toBeVisible();
  });

  it("opens and focuses the form when Add debt is selected", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Add debt" }));

    expect(screen.getByLabelText("Creditor name")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("collapses the form when Cancel is selected", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Add debt" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Creditor name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add debt" })).toBeVisible();
  });
});
