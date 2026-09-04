import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPreferencesForm } from "./settings-preferences-form";
import { FontPreferencePicker } from "./font-preference-picker";
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
  window.localStorage.clear();
  delete document.documentElement.dataset.font;
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
        daylineCapacityMinutes={180}
        daylineEnergyLevel="medium"
        defaultAccountId={null}
        accounts={[]}
      />,
    );

    expect(screen.getByLabelText("Display name")).toHaveValue("Kai Rivera");
    expect(screen.getByRole("radio", { name: /Snowball/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Avalanche/i })).not.toBeChecked();
    expect(screen.getByLabelText("Daily focus capacity")).toHaveValue(180);
    expect(screen.getByLabelText("Planning energy")).toHaveValue("medium");
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

  it("previews, applies, persists, and resets the app font", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.font = "geist";
    render(<FontPreferencePicker />);

    const fontSelect = screen.getByRole("combobox", { name: "Font family" });
    expect(screen.getAllByRole("option")).toHaveLength(23);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(fontSelect).toHaveValue("geist");

    await user.selectOptions(fontSelect, "lora");

    expect(document.documentElement).toHaveAttribute("data-font", "lora");
    expect(window.localStorage.getItem("atlas-font-family:v1")).toBe("lora");
    expect(
      screen.getByText("Lora · Plan clearly, move intentionally."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset font" }));

    expect(document.documentElement).toHaveAttribute("data-font", "geist");
    expect(window.localStorage.getItem("atlas-font-family:v1")).toBe("geist");
  });
});
