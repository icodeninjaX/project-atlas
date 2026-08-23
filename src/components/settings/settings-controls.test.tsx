import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPreferencesForm } from "./settings-preferences-form";
import { ThemePreferencePicker } from "./theme-preference-picker";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  saveSettingsAction: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: mocks.setTheme }),
}));

vi.mock("@/lib/settings/actions", () => ({
  saveSettingsAction: mocks.saveSettingsAction,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Settings controls", () => {
  it("shows the saved profile and payoff plan", () => {
    render(
      <SettingsPreferencesForm
        displayName="Kai Rivera"
        debtStrategy="snowball"
        homeRoute="/dashboard"
        defaultTaskPriority="medium"
        defaultTaskEstimatedMinutes={30}
        defaultAccountId={null}
        accounts={[]}
      />,
    );

    expect(screen.getByLabelText("Display name")).toHaveValue("Kai Rivera");
    expect(screen.getByRole("radio", { name: /Snowball/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Avalanche/i })).not.toBeChecked();
  });

  it("offers system, light, and dark appearance choices", async () => {
    const user = userEvent.setup();
    render(<ThemePreferencePicker />);

    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
});
