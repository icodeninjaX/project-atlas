import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/money/transactions",
}));

afterEach(cleanup);

describe("AppShell", () => {
  it("provides labelled primary navigation and the Atlas identity", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    expect(screen.getAllByLabelText("Primary navigation")).toHaveLength(2);
    expect(screen.getByText("Project Atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Money" })).toHaveLength(2);
    expect(
      screen
        .getAllByRole("link", { name: "Money" })
        .every((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  it("keeps secondary destinations reachable from the mobile More sheet", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More navigation" }));

    const sheet = screen.getByRole("dialog", { name: "More destinations" });
    expect(
      within(sheet).getByRole("link", { name: "Career" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("link", { name: "Reviews" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("link", { name: "Search" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("link", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("closes the mobile More sheet with Escape", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    const button = screen.getByRole("button", { name: "More navigation" });
    fireEvent.click(button);
    expect(
      screen.getByRole("dialog", { name: "More destinations" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "More destinations" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the mobile More sheet from its backdrop", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    const button = screen.getByRole("button", { name: "More navigation" });
    fireEvent.click(button);
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss more navigation" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "More destinations" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
