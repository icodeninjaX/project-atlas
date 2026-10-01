import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { AccountsOverview } from "./accounts-overview";

afterEach(cleanup);

describe("AccountsOverview", () => {
  it("leads with the total and lists how it is split as text", () => {
    render(
      <AccountsOverview
        accounts={[
          { account_type: "cash", current_balance_centavos: 30_000 },
          { account_type: "e_wallet", current_balance_centavos: 20_000 },
          { account_type: "savings", current_balance_centavos: 50_000 },
        ]}
      />,
    );

    const total = screen.getByRole("region", { name: "Total balance" });
    expect(within(total).getByText(/₱1,000/)).toBeVisible();
    expect(
      within(total).getByText("Across 3 active accounts", { exact: false }),
    ).toBeVisible();

    const legend = within(total).getAllByRole("listitem");
    expect(legend).toHaveLength(2);
    expect(legend[0]).toHaveTextContent("Everyday50%₱500.002 accounts");
    expect(legend[1]).toHaveTextContent("Savings50%₱500.001 account");
    expect(
      within(total).getByRole("link", { name: "Record transaction" }),
    ).toHaveAttribute("href", "/money/transactions?create=true");
  });

  it("names overdrawn money that the shares leave out", () => {
    render(
      <AccountsOverview
        accounts={[
          { account_type: "bank", current_balance_centavos: 100_000 },
          { account_type: "bank", current_balance_centavos: -25_000 },
        ]}
      />,
    );

    expect(screen.getByText(/in overdrawn accounts/)).toHaveTextContent(
      "Shares leave out −₱250.00 in overdrawn accounts",
    );
  });
});
