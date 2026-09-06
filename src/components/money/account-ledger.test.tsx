import { cleanup, fireEvent, screen } from "@testing-library/react";
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

describe("AccountLedger", () => {
  it("manages a selected account from one control above the ledger", () => {
    render(<AccountLedger accounts={accounts} today="2026-09-06" />);

    expect(screen.queryByLabelText("Account to manage")).not.toBeVisible();
    fireEvent.click(screen.getByText("Manage accounts"));
    fireEvent.change(screen.getByLabelText("Account to manage"), {
      target: { value: accounts[1]!.id },
    });

    expect(screen.getByLabelText("Archive selected account")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Account name")).toHaveValue("Liquid Cash");
  });
});
