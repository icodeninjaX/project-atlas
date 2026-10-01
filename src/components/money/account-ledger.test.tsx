import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { AccountLedger } from "./account-ledger";

vi.mock("@/lib/money/actions", () => ({
  updateAccountAction: vi.fn(),
  adjustAccountBalanceAction: vi.fn(),
  archiveAccountAction: vi.fn(),
}));

afterEach(cleanup);

const accounts = [
  {
    id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    name: "GCash",
    account_type: "e_wallet",
    institution: "G-Xchange",
    provider_id: "gcash",
    current_balance_centavos: 70_100,
    is_archived: false,
  },
  {
    id: "55c18e37-9e72-469f-a371-aac506ae6223",
    name: "Liquid Cash",
    account_type: "cash",
    institution: "Personal",
    provider_id: null,
    current_balance_centavos: 542_000,
    is_archived: false,
  },
];

const activity = {
  [accounts[1]!.id]: [
    {
      id: "transaction-1",
      transaction_type: "expense" as const,
      amount_centavos: 12_550,
      transaction_date: "2026-09-06",
      merchant_or_source: "Canteen",
      category_name: "Food",
      category_icon: "utensils",
    },
  ],
};

describe("AccountLedger", () => {
  it("shows each account's share of the total on its card", () => {
    render(<AccountLedger accounts={accounts} today="2026-09-06" />);

    expect(
      screen.getByRole("button", { name: /Manage GCash/ }),
    ).toHaveTextContent("11% of total");
    expect(
      screen.getByRole("button", { name: /Manage Liquid Cash/ }),
    ).toHaveTextContent("89% of total");
  });

  it("opens a card into its activity, reconcile, and edit sections", async () => {
    const user = userEvent.setup();
    render(
      <AccountLedger
        accounts={accounts}
        today="2026-09-06"
        activityByAccount={activity}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Manage Liquid Cash/ }),
    );

    const sheet = screen.getByRole("dialog", { name: "Liquid Cash" });
    expect(
      within(sheet).getByRole("tab", { name: "Activity" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Canteen")).toBeVisible();
    expect(
      within(sheet).getByRole("link", { name: /All Liquid Cash transactions/ }),
    ).toHaveAttribute("href", `/money/transactions?account=${accounts[1]!.id}`);

    await user.click(within(sheet).getByRole("tab", { name: "Reconcile" }));
    const balance = within(sheet).getByLabelText(
      "New current balance for Liquid Cash in pesos",
    );
    expect(balance).toHaveValue("5420.00");
    await user.clear(balance);
    await user.type(balance, "5500");
    expect(within(sheet).getByText("+₱80.00")).toBeVisible();

    await user.click(within(sheet).getByRole("tab", { name: "Edit" }));
    expect(within(sheet).getByLabelText("Account name")).toHaveValue(
      "Liquid Cash",
    );
  });

  it("moves between sections with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<AccountLedger accounts={accounts} today="2026-09-06" />);

    await user.click(screen.getByRole("button", { name: /Manage GCash/ }));
    const activityTab = screen.getByRole("tab", { name: "Activity" });
    activityTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Reconcile" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Reconcile" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("asks before archiving an account", async () => {
    const user = userEvent.setup();
    render(<AccountLedger accounts={accounts} today="2026-09-06" />);

    await user.click(screen.getByRole("button", { name: /Manage GCash/ }));
    await user.click(screen.getByRole("button", { name: "Archive account" }));

    expect(screen.getByText("Archive GCash?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.queryByText("Archive GCash?")).not.toBeInTheDocument();
  });
});
