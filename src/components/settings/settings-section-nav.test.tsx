import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsSectionNav, settingsSections } from "./settings-section-nav";

afterEach(cleanup);

describe("SettingsSectionNav", () => {
  it("links to every settings section and marks the chosen one", async () => {
    const user = userEvent.setup();
    render(<SettingsSectionNav variant="strip" />);

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    for (const { id, label } of settingsSections) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `#${id}`,
      );
    }
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await user.click(screen.getByRole("link", { name: "Account" }));

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(nav.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });
});
