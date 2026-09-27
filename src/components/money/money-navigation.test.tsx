import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyNavigation } from "./money-navigation";

afterEach(cleanup);

describe("MoneyNavigation", () => {
  it("marks the current destination", () => {
    render(<MoneyNavigation currentHref="/money/budget" />);

    expect(screen.getByRole("link", { name: "Budget" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Runway" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
