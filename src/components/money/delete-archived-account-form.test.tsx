import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteArchivedAccountForm } from "./delete-archived-account-form";

vi.mock("@/lib/money/actions", () => ({
  deleteArchivedAccountAction: vi.fn(),
}));

afterEach(cleanup);

describe("DeleteArchivedAccountForm", () => {
  it("requires the exact account name before enabling permanent deletion", async () => {
    const user = userEvent.setup();
    render(
      <DeleteArchivedAccountForm
        accountId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        accountName="Old GCash"
      />,
    );

    await user.click(screen.getByText("Delete permanently"));
    const button = screen.getByRole("button", {
      name: "Delete account permanently",
    });
    const confirmation = screen.getByLabelText(
      "Type Old GCash to confirm permanent deletion",
    );

    expect(button).toBeDisabled();
    await user.type(confirmation, "Old gcash");
    expect(button).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, "Old GCash");
    expect(button).toBeEnabled();
  });
});
