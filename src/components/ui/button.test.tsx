import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("shows a spinner and the pending label while an action runs", () => {
    const { container } = render(
      <Button pending pendingLabel="Adding…">
        Add task
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Adding…" });
    const spinner = container.querySelector("svg.animate-spin");

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Add task")).not.toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
  });
});
