import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { TooltipHint } from "./tooltip";

afterEach(cleanup);

describe("TooltipHint", () => {
  it("shows its hint on keyboard focus without replacing the control label", async () => {
    const user = userEvent.setup();

    render(
      <TooltipHint label="Search ATLAS">
        <button type="button" aria-label="Search ATLAS">
          Search icon
        </button>
      </TooltipHint>,
    );

    const trigger = screen.getByRole("button", { name: "Search ATLAS" });
    await user.tab();

    expect(trigger).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Search ATLAS",
    );
    expect(trigger).toHaveAccessibleName("Search ATLAS");
  });
});
