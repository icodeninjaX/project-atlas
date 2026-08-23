import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  it("shows active-account controls", () => {
    render(<AccountCard account={activeAccount} today="2026-08-13" />);

    expect(screen.getByText("Edit account details")).toBeInTheDocument();
    expect(screen.getByText("Adjust current balance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Archive GCash" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restore account" }),
    ).not.toBeInTheDocument();
  });

  it("keeps archived accounts read-only except for restore", () => {
    render(<AccountCard account={{ ...activeAccount, is_archived: true }} />);

    expect(screen.getByText("Balance when archived")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restore account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete permanently")).toBeInTheDocument();
    expect(screen.queryByText("Edit account details")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Adjust current balance"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archive GCash" }),
    ).not.toBeInTheDocument();
  });
});
