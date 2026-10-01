import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AccountsQuickActions } from "./accounts-quick-actions";

afterEach(cleanup);

describe("AccountsQuickActions", () => {
  it("links to recording, transfers, and archived accounts", () => {
    render(<AccountsQuickActions />);

    expect(screen.getByRole("link", { name: "Record" })).toHaveAttribute(
      "href",
      "/money/transactions?create=true",
    );
    expect(screen.getByRole("link", { name: "Transfer" })).toHaveAttribute(
      "href",
      "/money/transfers",
    );
    expect(screen.getByRole("link", { name: "Archived" })).toHaveAttribute(
      "href",
      "/money/accounts/archived",
    );
  });

  it("opens the new-account dialog from its round button", async () => {
    const user = userEvent.setup();
    render(<AccountsQuickActions />);

    await user.click(screen.getByRole("button", { name: "Add account" }));

    expect(screen.getByRole("dialog", { name: "New account" })).toBeVisible();
    expect(screen.getByLabelText("Account name")).toBeVisible();
  });
});
