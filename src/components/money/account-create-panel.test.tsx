import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AccountCreatePanel } from "./account-create-panel";

afterEach(cleanup);

describe("AccountCreatePanel", () => {
  it("keeps account creation out of the way until requested", () => {
    render(<AccountCreatePanel />);

    expect(screen.queryByText("Add an account")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Account name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(screen.getByLabelText("Account name")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Close new account form" }),
    ).toBeVisible();
  });

  it("uses category tiles and lets people search providers by alias", () => {
    render(<AccountCreatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(
      screen.queryByRole("combobox", { name: "Account type" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "E-wallet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Choose GCash" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Bank" }));
    fireEvent.change(screen.getByLabelText("Search banks and wallets"), {
      target: { value: "Bank of the Philippine Islands" },
    });

    expect(screen.getByText("1 provider")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Choose BPI" }));
    expect(screen.getByLabelText("Account name")).toHaveValue("BPI");
    expect(screen.getByLabelText("Institution")).toHaveValue(
      "Bank of the Philippine Islands",
    );
    expect(document.querySelector('input[name="providerId"]')).toHaveValue(
      "bpi",
    );
    expect(document.querySelector('input[name="accountType"]')).toHaveValue(
      "bank",
    );
  });

  it("keeps a custom bank or wallet fallback available", () => {
    render(<AccountCreatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose GCash" }));
    const customProvider = screen.getByRole("button", {
      name: "Custom bank / wallet",
    });
    fireEvent.click(customProvider);

    expect(document.querySelector('input[name="providerId"]')).toHaveValue("");
    expect(customProvider).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Account name")).toHaveValue("");
    expect(screen.getByText("Your account")).toBeVisible();
  });
});
