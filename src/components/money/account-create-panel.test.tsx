import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AccountCreatePanel } from "./account-create-panel";

afterEach(cleanup);

describe("AccountCreatePanel", () => {
  it("keeps account creation out of the way until requested", () => {
    render(<AccountCreatePanel />);

    expect(screen.queryByLabelText("Account name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(screen.getByLabelText("Account name")).toBeVisible();
    expect(screen.getByRole("button", { name: "Close form" })).toBeVisible();
  });
});
