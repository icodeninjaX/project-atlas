import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeaderActions } from "./app-header-actions";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/offline/install-app-button", () => ({
  InstallAppButton: () => null,
}));

vi.mock("@/components/offline/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Log out this device</button>,
}));

vi.mock("@/components/offline/sync-status", () => ({
  SyncStatus: () => <span>Synced</span>,
}));

vi.mock("@/components/privacy/privacy-toggle", () => ({
  PrivacyToggle: () => <button type="button">Hide sensitive values</button>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipHint: ({ children }: { children: ReactNode }) => children,
}));

afterEach(cleanup);

describe("AppHeaderActions", () => {
  it("opens the mobile account controls on an opaque app surface", async () => {
    const user = userEvent.setup();
    render(<AppHeaderActions />);

    await user.click(
      screen.getByRole("button", { name: "Open account controls" }),
    );

    const menu = screen.getByRole("dialog", { name: "Account controls" });
    const controls = within(menu);
    expect(menu).toHaveClass("bg-card", "text-card-foreground");
    expect(menu).not.toHaveClass("bg-transparent");
    expect(controls.getByText("Synced")).toBeInTheDocument();
    expect(
      controls.getByRole("button", { name: "Use light theme" }),
    ).toBeInTheDocument();
    expect(
      controls.getByRole("button", { name: "Hide sensitive values" }),
    ).toBeInTheDocument();
    expect(
      controls.getByRole("button", { name: "Log out this device" }),
    ).toBeInTheDocument();
  });
});
