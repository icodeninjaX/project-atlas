import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoneyNavigation } from "./money-navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function stubLayout(values: Record<string, (el: HTMLElement) => number>) {
  for (const [property, read] of Object.entries(values)) {
    vi.spyOn(
      HTMLElement.prototype,
      property as "clientWidth",
      "get",
    ).mockImplementation(function (this: HTMLElement) {
      return read(this);
    });
  }
}

describe("MoneyNavigation", () => {
  it("marks the current destination", () => {
    render(<MoneyNavigation currentHref="/money/budget" />);

    expect(screen.getByRole("link", { name: "Budget" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("scrolls an off-screen current tab into view within the strip", () => {
    const isNav = (el: HTMLElement) => el.tagName === "NAV";
    stubLayout({
      scrollWidth: (el) => (isNav(el) ? 600 : 80),
      clientWidth: (el) => (isNav(el) ? 300 : 80),
      offsetWidth: () => 80,
      offsetLeft: (el) =>
        el.getAttribute("aria-current") === "page" ? 440 : 0,
    });

    render(<MoneyNavigation currentHref="/money/runway" />);

    const nav = screen.getByRole("navigation", { name: "Money navigation" });
    expect(nav.scrollLeft).toBe(440 - (300 - 80) / 2);
  });
});
