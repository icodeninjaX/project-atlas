import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { AccountCard, type AccountSummary } from "./account-card";

vi.mock("@/lib/money/actions", () => ({
  createAccountAction: vi.fn(),
  updateAccountAction: vi.fn(),
  adjustAccountBalanceAction: vi.fn(),
  archiveAccountAction: vi.fn(),
  deleteArchivedAccountAction: vi.fn(),
}));

afterEach(cleanup);

const activeAccount: AccountSummary = {
  id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
  name: "GCash",
  account_type: "e_wallet",
  institution: "G-Xchange",
  current_balance_centavos: 70_100,
  is_archived: false,
};

describe("AccountCard", () => {
  it("shows an active account editor when selected by the ledger", () => {
    const { container } = render(
      <AccountCard
        account={activeAccount}
        today="2026-08-13"
        layout="ledger"
        editing
      />,
    );

    expect(screen.getByText("Account details")).toBeVisible();
    expect(screen.getByText("Current balance")).toBeVisible();
    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(
      container.querySelector('img[src*="gcash-wallet.png"]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archive GCash" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restore account" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the account-type icon fallback for other e-wallets", () => {
    const { container } = render(
      <AccountCard
        account={{ ...activeAccount, name: "Maya" }}
        layout="ledger"
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(
      container.querySelector('img[src*="gcash-wallet.png"]'),
    ).not.toBeInTheDocument();
  });

  it("keeps archived accounts read-only except for restore", () => {
    render(<AccountCard account={{ ...activeAccount, is_archived: true }} />);

    expect(screen.getByText("Balance when archived")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restore account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete permanently")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit GCash")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archive GCash" }),
    ).not.toBeInTheDocument();
  });
});
