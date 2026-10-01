import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TransferForm } from "./transfer-form";

afterEach(cleanup);

const accounts = [
  {
    id: "bpi",
    name: "BPI Payroll",
    account_type: "bank",
    provider_id: "bpi",
    current_balance_centavos: 4_862_010,
  },
  {
    id: "gcash",
    name: "GCash",
    account_type: "e_wallet",
    provider_id: "gcash",
    current_balance_centavos: 1_284_550,
  },
];

describe("TransferForm", () => {
  it("previews both balances after the transfer", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} today="2026-10-01" />);

    await user.type(screen.getByLabelText("Transfer amount in pesos"), "5000");
    await user.selectOptions(screen.getByLabelText("Source account"), "bpi");
    await user.selectOptions(
      screen.getByLabelText("Destination account"),
      "gcash",
    );

    expect(screen.getByText("Balances after this transfer")).toBeVisible();
    expect(screen.getByText("₱43,620.10")).toBeVisible();
    expect(screen.getByText("₱17,845.50")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Record transfer ₱5,000\.00/ }),
    ).toBeEnabled();
  });

  it("swaps the two ends of the transfer", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} today="2026-10-01" />);

    await user.selectOptions(screen.getByLabelText("Source account"), "bpi");
    await user.selectOptions(
      screen.getByLabelText("Destination account"),
      "gcash",
    );
    await user.click(
      screen.getByRole("button", { name: "Swap source and destination" }),
    );

    expect(screen.getByLabelText("Source account")).toHaveValue("gcash");
    expect(screen.getByLabelText("Destination account")).toHaveValue("bpi");
  });

  it("will not record a transfer to the same account", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} today="2026-10-01" />);

    await user.selectOptions(screen.getByLabelText("Source account"), "bpi");
    await user.selectOptions(
      screen.getByLabelText("Destination account"),
      "bpi",
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose two different accounts.",
    );
    expect(
      screen.getByRole("button", { name: /Record transfer/ }),
    ).toBeDisabled();
  });

  it("explains why a transfer needs two accounts", () => {
    render(<TransferForm accounts={accounts.slice(0, 1)} today="2026-10-01" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Add at least two active accounts",
    );
    expect(
      screen.getByRole("button", { name: /Record transfer/ }),
    ).toBeDisabled();
  });
});
