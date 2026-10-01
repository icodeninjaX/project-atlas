import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeading } from "./page-heading";

afterEach(cleanup);

describe("PageHeading", () => {
  it("keeps the description and actions on every screen by default", () => {
    render(
      <PageHeading
        title="Accounts"
        description="Where your money lives"
        actions={<button type="button">Add</button>}
      />,
    );

    expect(screen.getByText("Where your money lives")).not.toHaveClass(
      "max-sm:hidden",
    );
    expect(
      screen.getByRole("button", { name: "Add" }).parentElement,
    ).not.toHaveClass("max-sm:hidden");
  });

  it("drops the description and actions below sm when compact on mobile", () => {
    render(
      <PageHeading
        title="Accounts"
        description="Where your money lives"
        actions={<button type="button">Add</button>}
        compactOnMobile
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Accounts" }),
    ).toBeVisible();
    expect(screen.getByText("Where your money lives")).toHaveClass(
      "max-sm:hidden",
    );
    expect(
      screen.getByRole("button", { name: "Add" }).parentElement,
    ).toHaveClass("max-sm:hidden");
  });
});
