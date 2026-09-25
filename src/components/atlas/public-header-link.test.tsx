import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicHeaderLink } from "./public-header-link";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

afterEach(cleanup);

describe("PublicHeaderLink", () => {
  it("offers account creation instead of a redundant login link on /login", () => {
    pathname.current = "/login";
    render(<PublicHeaderLink />);
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/signup");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("links to login everywhere else", () => {
    pathname.current = "/signup";
    render(<PublicHeaderLink />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
