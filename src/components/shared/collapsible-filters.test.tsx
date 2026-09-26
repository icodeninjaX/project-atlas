import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CollapsibleFilters } from "./collapsible-filters";

afterEach(cleanup);

function renderFilters(activeCount: number) {
  return render(
    <CollapsibleFilters
      activeCount={activeCount}
      actions={<button type="submit">Apply</button>}
    >
      <label>
        Module
        <select defaultValue="">
          <option value="">All modules</option>
        </select>
      </label>
    </CollapsibleFilters>,
  );
}

describe("CollapsibleFilters", () => {
  it("keeps unused filters collapsed on small screens until toggled", async () => {
    const user = userEvent.setup();
    renderFilters(0);

    const toggle = screen.getByRole("button", { name: "Filters" });
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    );
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveClass("hidden", "sm:contents");
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveClass("grid");
    expect(panel).not.toHaveClass("hidden");
  });

  it("starts open and shows the count when filters are applied", () => {
    renderFilters(2);

    const toggle = screen.getByRole("button", { name: /Filters/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("2");
  });
});
