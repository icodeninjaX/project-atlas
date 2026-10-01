import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { AccountCard, type AccountSummary } from "./account-card";
import { WalletCard } from "./wallet-card";

vi.mock("@/lib/money/actions", () => ({
  archiveAccountAction: vi.fn(),
  deleteArchivedAccountAction: vi.fn(),
}));

afterEach(cleanup);

const gcash: AccountSummary = {
  id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
  name: "GCash",
  account_type: "e_wallet",
  institution: "G-Xchange",
  provider_id: "gcash",
  current_balance_centavos: 70_150,
  is_archived: false,
};

describe("WalletCard", () => {
  it("shows the provider logo and the balance with quiet centavos", () => {
    const { container } = render(<WalletCard account={gcash} />);

    expect(
      container.querySelector('img[src*="gcash-official.png"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("E-wallet · G-Xchange")).toBeInTheDocument();
    expect(screen.getByText(/₱701/)).toBeInTheDocument();
    expect(screen.getByText(".50")).toBeInTheDocument();
  });

  it("uses the stored provider rather than the account name", () => {
    const { container } = render(
      <WalletCard
        account={{ ...gcash, name: "Spending", provider_id: "maya" }}
      />,
    );

    expect(
      // next/image encodes the path, so match the file name.
      container.querySelector('img[src*="maya.png"]'),
    ).toBeInTheDocument();
  });

  it("falls back to the account-type icon for custom accounts", () => {
    const { container } = render(
      <WalletCard
        account={{ ...gcash, name: "Envelope", provider_id: null }}
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("still recognises a legacy GCash wallet by name", () => {
    const { container } = render(
      <WalletCard account={{ ...gcash, provider_id: null }} />,
    );

    expect(
      container.querySelector('img[src*="gcash-official.png"]'),
    ).toBeInTheDocument();
  });
});

describe("AccountCard", () => {
  it("keeps archived accounts read-only except for restore and delete", () => {
    const { container } = render(
      <AccountCard account={{ ...gcash, is_archived: true }} />,
    );

    expect(screen.getByText("Balance when archived")).toBeInTheDocument();
    expect(container.querySelector('[data-muted="true"]')).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restore account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete permanently")).toBeInTheDocument();
    expect(screen.queryByLabelText("Account name")).not.toBeInTheDocument();
  });
});
